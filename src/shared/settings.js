(function initSettings(root, factory) {
  const api = factory(root);

  root.YouTubeAntiSpoiler = Object.assign(root.YouTubeAntiSpoiler || {}, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSettings(root) {
  const DEFAULT_SETTINGS = Object.freeze({
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
    hideVideoTitles: false,
    // Titles are blurred together with previews (the chain button in the
    // popup). Unlinked, hideVideoTitles is the user's own choice.
    blurTitlesLinked: true,
    startLiveFromBeginning: true,
    hideComments: true,
  });

  const SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS));
  const LEGACY_SETTING_KEYS = Object.freeze([
    "hideThumbnailDuration",
    "hidePlayerTime",
    // The skip buttons now always come with the hidden progress bar.
    "showSkipButtons",
  ]);
  const STORAGE_READ_KEYS = Object.freeze([
    ...SETTING_KEYS,
    ...LEGACY_SETTING_KEYS,
  ]);

  function getBoolean(raw, key) {
    return typeof raw[key] === "boolean" ? raw[key] : DEFAULT_SETTINGS[key];
  }

  function normalizeSettings(rawSettings) {
    const raw = rawSettings || {};

    return {
      extensionEnabled: getBoolean(raw, "extensionEnabled"),
      hideTime: true,
      hidePlayerProgressBar: getBoolean(raw, "hidePlayerProgressBar"),
      hideVideoPreviews: getBoolean(raw, "hideVideoPreviews"),
      hideVideoTitles: getBoolean(raw, "hideVideoTitles"),
      // Settings saved before the chain button existed have no link value.
      // Whoever had title blur on keeps it on their own; everyone else
      // (the popup saved `false` for them) starts linked to previews.
      blurTitlesLinked:
        typeof raw.blurTitlesLinked === "boolean"
          ? raw.blurTitlesLinked
          : raw.hideVideoTitles !== true,
      startLiveFromBeginning: getBoolean(raw, "startLiveFromBeginning"),
      hideComments: getBoolean(raw, "hideComments"),
    };
  }

  // What the page acts on: while linked, titles are blurred exactly when
  // previews are. Storage and the popup keep the user's own hideVideoTitles
  // for the unlinked case. Takes normalized settings.
  function getEffectiveSettings(settings) {
    const effectiveSettings = Object.assign({}, settings);

    if (settings.blurTitlesLinked) {
      effectiveSettings.hideVideoTitles = settings.hideVideoPreviews;
    }

    return effectiveSettings;
  }

  function getStorageArea(storageArea) {
    if (storageArea) {
      return storageArea;
    }

    if (root.chrome && root.chrome.storage && root.chrome.storage.sync) {
      return root.chrome.storage.sync;
    }

    throw new Error("chrome.storage.sync is unavailable.");
  }

  function getLastRuntimeError() {
    if (root.chrome && root.chrome.runtime && root.chrome.runtime.lastError) {
      return root.chrome.runtime.lastError;
    }

    return null;
  }

  function readSettings(storageArea) {
    const syncStorage = getStorageArea(storageArea);

    return new Promise((resolve, reject) => {
      syncStorage.get(STORAGE_READ_KEYS, (storedSettings) => {
        const runtimeError = getLastRuntimeError();

        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve(normalizeSettings(storedSettings));
      });
    });
  }

  function writeSettings(nextSettings, storageArea) {
    const syncStorage = getStorageArea(storageArea);
    const normalizedSettings = normalizeSettings(nextSettings);

    return new Promise((resolve, reject) => {
      syncStorage.set(normalizedSettings, () => {
        const runtimeError = getLastRuntimeError();

        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        // Best-effort cleanup: legacy keys are ignored on read anyway, so a
        // failed removal must never fail the write that just succeeded.
        if (typeof syncStorage.remove === "function") {
          syncStorage.remove(LEGACY_SETTING_KEYS, () => {
            getLastRuntimeError();
            resolve(normalizedSettings);
          });
          return;
        }

        resolve(normalizedSettings);
      });
    });
  }

  return {
    DEFAULT_SETTINGS,
    SETTING_KEYS,
    LEGACY_SETTING_KEYS,
    STORAGE_READ_KEYS,
    normalizeSettings,
    getEffectiveSettings,
    readSettings,
    writeSettings,
  };
});
