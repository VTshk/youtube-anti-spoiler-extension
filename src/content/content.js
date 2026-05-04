(function initContent(root, factory) {
  const shared = root.YouTubeAntiSpoiler || {};
  const api = factory(root, shared);

  root.YouTubeAntiSpoiler = Object.assign(shared, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    api.init();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createContent(root, shared) {
  const STYLE_ID = "youtube-anti-spoiler-style";
  const REFRESH_EVENT = "youtube-anti-spoiler-locationchange";

  const CLASS_BY_SETTING = Object.freeze({
    extensionEnabled: "yas-extension-enabled",
    hideTime: "yas-hide-time",
    hidePlayerProgressBar: "yas-hide-player-progress-bar",
    hideVideoPreviews: "yas-hide-video-previews",
  });

  const SETTING_KEYS = Object.freeze(Object.keys(CLASS_BY_SETTING));

  const THUMBNAIL_DURATION_SELECTORS = Object.freeze([
    "ytd-thumbnail-overlay-time-status-renderer",
    "yt-thumbnail-overlay-time-status-renderer",
    "ytm-thumbnail-overlay-time-status-renderer",
    ".ytd-thumbnail-overlay-time-status-renderer",
    ".ytm-thumbnail-overlay-time-status-renderer",
    ".ytp-videowall-still-info-duration",
    ".ytp-ce-video-duration",
    ".video-time",
    '[class*="thumbnail-overlay-time-status"]',
    ".badge-shape-wiz--thumbnail-overlay-time-status",
    ".badge-shape-wiz--thumbnail-overlay-badge",
    "yt-thumbnail-overlay-badge-view-model",
    ".ytBadgeShapeText",
    "ytd-compact-video-renderer .badge-shape-wiz--thumbnail-overlay-badge",
    "yt-lockup-view-model .badge-shape-wiz--thumbnail-overlay-badge",
    "ytm-video-with-context-renderer .badge-shape-wiz--thumbnail-overlay-badge",
  ]);

  const LIVE_THUMBNAIL_BADGE_EXCLUSION =
    ":not(.ytBadgeShapeThumbnailLive):not(.ytBadgeShapeThumbnailLive *):not(:has(.ytBadgeShapeThumbnailLive))";

  const PLAYER_TIME_SELECTORS = Object.freeze([
    ".ytp-time-display",
    ".ytp-time-current",
    ".ytp-time-separator",
    ".ytp-time-duration",
    ".ytp-tooltip-text",
    ".ytp-tooltip-bottom-text",
    ".ytp-tooltip-duration",
    ".ytp-tooltip-progress-bar-pill-time-stamp",
    ".ytPlayerStoryboardTimestamp",
  ]);

  const PLAYER_PROGRESS_SELECTORS = Object.freeze([
    ".ytp-progress-bar-container",
    ".ytp-progress-bar",
    ".ytp-progress-list",
    ".ytp-scrubber-container",
    ".ytp-chapters-container",
    ".ytp-chapter-hover-container",
    ".ytp-timed-markers-container",
    ".ytPlayerProgressBarHost",
    ".ytPlayerProgressBarHostBottomInset",
  ]);

  const THUMBNAIL_PROGRESS_SELECTORS = Object.freeze([
    ".ytThumbnailOverlayProgressBarHostWatchedProgressBar",
    ".ytThumbnailOverlayProgressBarHostUseLegacyBar",
    "ytd-thumbnail-overlay-resume-playback-renderer #progress",
    "ytm-thumbnail-overlay-resume-playback-renderer #progress",
  ]);

  const PROGRESS_SELECTORS = Object.freeze([
    ...PLAYER_PROGRESS_SELECTORS,
    ...THUMBNAIL_PROGRESS_SELECTORS,
  ]);

  const VIDEO_PREVIEW_SELECTORS = Object.freeze([
    "a#thumbnail img",
    "a#thumbnail video",
    "ytd-thumbnail img",
    "ytd-thumbnail video",
    "ytd-thumbnail yt-image",
    "ytd-thumbnail .yt-core-image",
    "yt-thumbnail-view-model img",
    "yt-thumbnail-view-model video",
    "yt-thumbnail-view-model .yt-core-image",
    "ytm-thumbnail img",
    "ytm-thumbnail video",
  ]);

  function getEnabledClassNames(settings) {
    const normalizedSettings = normalizeSettings(settings);

    if (!normalizedSettings.extensionEnabled) {
      return [];
    }

    return Object.keys(CLASS_BY_SETTING).reduce((classes, key) => {
      if (normalizedSettings[key]) {
        classes.push(CLASS_BY_SETTING[key]);
      }

      return classes;
    }, []);
  }

  function scopeSelectors(className, selectors, selectorSuffix) {
    const suffix = selectorSuffix || "";
    return selectors
      .map((selector) => `html.${className} ${selector}${suffix}`)
      .join(",\n");
  }

  function buildSpoilerCss() {
    return `
${scopeSelectors(
  CLASS_BY_SETTING.hideTime,
  THUMBNAIL_DURATION_SELECTORS,
  LIVE_THUMBNAIL_BADGE_EXCLUSION,
)} {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

${scopeSelectors(CLASS_BY_SETTING.hideTime, PLAYER_TIME_SELECTORS)} {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

html.${CLASS_BY_SETTING.hideTime} .ytp-time-display {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

${scopeSelectors(CLASS_BY_SETTING.hidePlayerProgressBar, PROGRESS_SELECTORS)} {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

${scopeSelectors(CLASS_BY_SETTING.hideVideoPreviews, VIDEO_PREVIEW_SELECTORS)} {
  filter: blur(24px) !important;
}
`.trim();
  }

  function normalizeSettings(settings) {
    if (typeof shared.normalizeSettings === "function") {
      return shared.normalizeSettings(settings);
    }

    const defaults = {
      extensionEnabled: true,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: false,
    };

    const raw = settings || {};

    return Object.keys(defaults).reduce((normalized, key) => {
      if (key === "hideTime") {
        normalized[key] = true;
        return normalized;
      }

      normalized[key] =
        typeof raw[key] === "boolean" ? raw[key] : defaults[key];
      return normalized;
    }, {});
  }

  function ensureStyle(doc) {
    const currentDocument = doc || root.document;

    if (!currentDocument || !currentDocument.documentElement) {
      return null;
    }

    let style = currentDocument.getElementById(STYLE_ID);

    if (!style) {
      style = currentDocument.createElement("style");
      style.id = STYLE_ID;
      (currentDocument.head || currentDocument.documentElement).appendChild(style);
    }

    const css = buildSpoilerCss();

    if (style.textContent !== css) {
      style.textContent = css;
    }

    return style;
  }

  function applySettings(settings, doc) {
    const currentDocument = doc || root.document;

    if (!currentDocument || !currentDocument.documentElement) {
      return normalizeSettings(settings);
    }

    const rootElement = currentDocument.documentElement;
    const enabledClassNames = getEnabledClassNames(settings);

    Object.values(CLASS_BY_SETTING).forEach((className) => {
      rootElement.classList.remove(className);
    });

    enabledClassNames.forEach((className) => {
      rootElement.classList.add(className);
    });

    ensureStyle(currentDocument);

    return normalizeSettings(settings);
  }

  function loadAndApplySettings(doc) {
    if (typeof shared.readSettings !== "function") {
      applySettings(undefined, doc);
      return Promise.resolve(normalizeSettings());
    }

    return shared
      .readSettings()
      .then((settings) => applySettings(settings, doc))
      .catch((error) => {
        console.warn("[Anti-Spoiler for YouTube] Could not load settings.", error);
        return applySettings(undefined, doc);
      });
  }

  function patchHistory(win) {
    const currentWindow = win || root;

    if (
      !currentWindow ||
      !currentWindow.history ||
      currentWindow.__youtubeAntiSpoilerHistoryPatched
    ) {
      return;
    }

    ["pushState", "replaceState"].forEach((methodName) => {
      const originalMethod = currentWindow.history[methodName];

      if (typeof originalMethod !== "function") {
        return;
      }

      currentWindow.history[methodName] = function patchedHistoryMethod() {
        const result = originalMethod.apply(this, arguments);
        currentWindow.dispatchEvent(new Event(REFRESH_EVENT));
        return result;
      };
    });

    currentWindow.__youtubeAntiSpoilerHistoryPatched = true;
  }

  function bindNavigationRefresh(win, refresh) {
    const currentWindow = win || root;

    if (!currentWindow || currentWindow.__youtubeAntiSpoilerNavigationBound) {
      return;
    }

    // YouTube is a SPA. These events cover its own router and browser history.
    ["yt-navigate-finish", "yt-page-data-updated", "popstate", REFRESH_EVENT].forEach(
      (eventName) => currentWindow.addEventListener(eventName, refresh),
    );

    currentWindow.__youtubeAntiSpoilerNavigationBound = true;
  }

  function bindStorageChanges() {
    if (
      !root.chrome ||
      !root.chrome.storage ||
      !root.chrome.storage.onChanged ||
      root.__youtubeAntiSpoilerStorageBound
    ) {
      return;
    }

    root.chrome.storage.onChanged.addListener((changes, areaName) => {
      const settingChanged = SETTING_KEYS.some((key) =>
        Object.prototype.hasOwnProperty.call(changes, key),
      );

      if (areaName === "sync" && settingChanged) {
        loadAndApplySettings();
      }
    });

    root.__youtubeAntiSpoilerStorageBound = true;
  }

  function observeStyleRemoval(doc) {
    const currentDocument = doc || root.document;

    if (
      !currentDocument ||
      !currentDocument.documentElement ||
      typeof MutationObserver === "undefined" ||
      root.__youtubeAntiSpoilerStyleObserver
    ) {
      return;
    }

    let refreshQueued = false;
    const observer = new MutationObserver(() => {
      if (refreshQueued || currentDocument.getElementById(STYLE_ID)) {
        return;
      }

      refreshQueued = true;
      root.setTimeout(() => {
        refreshQueued = false;
        ensureStyle(currentDocument);
      }, 50);
    });

    observer.observe(currentDocument.documentElement, {
      childList: true,
      subtree: true,
    });

    root.__youtubeAntiSpoilerStyleObserver = observer;
  }

  function init() {
    if (!root.document || root.__youtubeAntiSpoilerInitialized) {
      return;
    }

    const refresh = () => {
      ensureStyle(root.document);
      loadAndApplySettings(root.document);
    };

    root.__youtubeAntiSpoilerInitialized = true;

    ensureStyle(root.document);
    patchHistory(root);
    bindNavigationRefresh(root, refresh);
    bindStorageChanges();
    observeStyleRemoval(root.document);
    refresh();
  }

  return {
    STYLE_ID,
    CLASS_BY_SETTING,
    buildSpoilerCss,
    getEnabledClassNames,
    ensureStyle,
    applySettings,
    init,
  };
});
