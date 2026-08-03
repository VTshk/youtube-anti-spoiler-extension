(function initContent(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    // In Node (tests) the shared namespace is not pre-populated by the browser's
    // script load order, so pull in the dependencies content.js relies on.
    require("../shared/settings.js");
    require("./live-start-controller.js");
  }

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
  const CHAT_GUARD_OBSCURED_CLASS = "yas-chat-spoiler-protection";
  const CHAT_GUARD_OVERLAY_ID = "youtube-anti-spoiler-chat-guard";

  // Live-start identifiers and behaviour are owned by the live-start controller
  // module; content.js only needs the few it references for CSS and chat retry.
  const LIVE_START_OBSCURED_CLASS = shared.LIVE_START_OBSCURED_CLASS;
  const LIVE_GUARD_OVERLAY_ID = shared.LIVE_GUARD_OVERLAY_ID;
  const LIVE_START_POLL_MS = shared.LIVE_START_POLL_MS;
  const createLiveStartController = shared.createLiveStartController;

  const CLASS_BY_SETTING = Object.freeze({
    extensionEnabled: "yas-extension-enabled",
    hideTime: "yas-hide-time",
    hidePlayerProgressBar: "yas-hide-player-progress-bar",
    hideVideoPreviews: "yas-hide-video-previews",
    startLiveFromBeginning: "yas-start-live-from-beginning",
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

html.${LIVE_START_OBSCURED_CLASS} #movie_player,
html.${LIVE_START_OBSCURED_CLASS} ytd-player,
html.${LIVE_START_OBSCURED_CLASS} #player-container {
  background: #0f0f0f !important;
  overflow: hidden !important;
  position: relative !important;
}

html.${LIVE_START_OBSCURED_CLASS} #movie_player video,
html.${LIVE_START_OBSCURED_CLASS} ytd-player video {
  filter: blur(32px) saturate(0.65) !important;
  transform: scale(1.04) !important;
}

html.${CHAT_GUARD_OBSCURED_CLASS} ytd-live-chat-frame,
html.${CHAT_GUARD_OBSCURED_CLASS} #chat {
  position: relative !important;
}

html.${CHAT_GUARD_OBSCURED_CLASS} ytd-live-chat-frame iframe,
html.${CHAT_GUARD_OBSCURED_CLASS} #chat iframe,
html.${CHAT_GUARD_OBSCURED_CLASS} yt-live-chat-app #items,
html.${CHAT_GUARD_OBSCURED_CLASS} yt-live-chat-app #contents {
  filter: blur(18px) !important;
  pointer-events: none !important;
}

#${LIVE_GUARD_OVERLAY_ID} {
  position: absolute !important;
  z-index: 2147483647 !important;
  display: grid !important;
  place-items: center !important;
  box-sizing: border-box !important;
  padding: 24px !important;
  background: rgba(15, 15, 15, 0.82) !important;
  color: #f8f8f8 !important;
  font-family: Roboto, Arial, sans-serif !important;
  text-align: center !important;
}

#${CHAT_GUARD_OVERLAY_ID} {
  position: absolute !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  display: grid !important;
  place-items: center !important;
  padding: 16px !important;
  box-sizing: border-box !important;
  background: rgba(15, 15, 15, 0.72) !important;
  color: #f8f8f8 !important;
  font-family: Roboto, Arial, sans-serif !important;
  text-align: center !important;
}

#${CHAT_GUARD_OVERLAY_ID} .yas-chat-guard-panel {
  display: grid !important;
  gap: 12px !important;
  justify-items: center !important;
}

#${CHAT_GUARD_OVERLAY_ID} .yas-chat-guard-title {
  margin: 0 !important;
  font-size: 16px !important;
  line-height: 1.3 !important;
  font-weight: 700 !important;
}

#${CHAT_GUARD_OVERLAY_ID} button {
  min-height: 34px !important;
  border: 1px solid rgba(255, 255, 255, 0.24) !important;
  border-radius: 6px !important;
  padding: 0 12px !important;
  background: #f8f8f8 !important;
  color: #0f0f0f !important;
  font: inherit !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-panel {
  width: min(420px, calc(100vw - 48px)) !important;
  display: grid !important;
  gap: 14px !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-title {
  margin: 0 !important;
  font-size: 22px !important;
  line-height: 1.25 !important;
  font-weight: 700 !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-copy {
  margin: 0 !important;
  color: #d9d9d9 !important;
  font-size: 14px !important;
  line-height: 1.45 !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: 10px !important;
}

#${LIVE_GUARD_OVERLAY_ID} button {
  min-height: 40px !important;
  border: 1px solid rgba(255, 255, 255, 0.24) !important;
  border-radius: 6px !important;
  padding: 0 14px !important;
  background: #f8f8f8 !important;
  color: #0f0f0f !important;
  font: inherit !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

#${LIVE_GUARD_OVERLAY_ID} button[data-live-guard-action="continue"] {
  background: transparent !important;
  color: #f8f8f8 !important;
}
`.trim();
  }

  function normalizeSettings(settings) {
    if (typeof shared.normalizeSettings === "function") {
      return shared.normalizeSettings(settings);
    }

    // settings.js owns the canonical defaults; this only guards the mandatory
    // time-hiding invariant if that module ever fails to load.
    return Object.assign({}, settings, { hideTime: true });
  }

  const liveStartController = createLiveStartController(root);
  // The chat overlay can mount only once the chat frame exists, which happens
  // well after navigation — hence the retry loop. The budget stops it from
  // polling forever on pages that never get a chat (regular videos, home page).
  const CHAT_GUARD_MAX_RETRIES = Math.ceil(
    (shared.LIVE_START_TIMEOUT_MS || 10000) / (LIVE_START_POLL_MS || 100),
  );
  let chatGuardDisabled = false;
  let chatGuardRetryTimer = null;
  let chatGuardVideoId = null;
  let chatGuardRetriesLeft = 0;

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

  function findChatGuardHost(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    return (
      doc.querySelector("ytd-live-chat-frame") ||
      doc.querySelector("#chat") ||
      doc.querySelector("yt-live-chat-app")
    );
  }

  function getChatGuardOverlay(doc) {
    if (!doc || typeof doc.getElementById !== "function") {
      return null;
    }

    return doc.getElementById(CHAT_GUARD_OVERLAY_ID);
  }

  function removeChatGuardOverlay(doc) {
    const overlay = getChatGuardOverlay(doc);

    if (overlay && typeof overlay.remove === "function") {
      overlay.remove();
    }
  }

  function removeChatGuardObscuring(doc) {
    if (doc && doc.documentElement && doc.documentElement.classList) {
      doc.documentElement.classList.remove(CHAT_GUARD_OBSCURED_CLASS);
    }
  }

  function addChatGuardObscuring(doc) {
    if (doc && doc.documentElement && doc.documentElement.classList) {
      doc.documentElement.classList.add(CHAT_GUARD_OBSCURED_CLASS);
    }
  }

  function clearChatGuardRetry() {
    if (chatGuardRetryTimer && root.clearTimeout) {
      root.clearTimeout(chatGuardRetryTimer);
    }

    chatGuardRetryTimer = null;
  }

  function renderChatGuardOverlay(doc) {
    if (!doc || typeof doc.createElement !== "function" || getChatGuardOverlay(doc)) {
      return true;
    }

    const host = findChatGuardHost(doc);

    if (!host || typeof host.appendChild !== "function") {
      return false;
    }

    const overlay = doc.createElement("div");
    overlay.id = CHAT_GUARD_OVERLAY_ID;
    overlay.className = "yas-chat-guard-overlay";

    const panel = doc.createElement("div");
    panel.className = "yas-chat-guard-panel";
    overlay.appendChild(panel);

    appendChatGuardElement(doc, panel, "p", "yas-chat-guard-title", "Comments hidden");

    const button = doc.createElement("button");
    button.type = "button";
    button.dataset.chatGuardAction = "show";
    button.textContent = "Show comments";
    button.addEventListener("click", (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      chatGuardDisabled = true;
      clearChatGuardRetry();
      removeChatGuardOverlay(doc);
      removeChatGuardObscuring(doc);
    });
    panel.appendChild(button);

    host.appendChild(overlay);
    return true;
  }

  function appendChatGuardElement(doc, parent, tagName, className, text) {
    const element = doc.createElement(tagName);
    element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function getChatGuardVideoId() {
    return typeof shared.getLiveStartVideoId === "function"
      ? shared.getLiveStartVideoId(root)
      : null;
  }

  function syncChatGuard(settings, doc, isRetry) {
    const normalizedSettings = normalizeSettings(settings);

    clearChatGuardRetry();

    // Chat only exists on watch pages; elsewhere the guard must not run (and
    // especially must not keep retrying).
    const videoId = getChatGuardVideoId();
    const isWatchPage = Boolean(videoId) || !root.location;

    if (videoId !== chatGuardVideoId) {
      // A new video means a new decision: "Show comments" on the previous
      // stream must not leave chat unprotected on the next one.
      chatGuardVideoId = videoId;
      chatGuardDisabled = false;
    }

    if (
      !normalizedSettings.extensionEnabled ||
      !normalizedSettings.startLiveFromBeginning ||
      !isWatchPage ||
      chatGuardDisabled
    ) {
      removeChatGuardOverlay(doc);
      removeChatGuardObscuring(doc);
      return;
    }

    addChatGuardObscuring(doc);

    if (!isRetry) {
      chatGuardRetriesLeft = CHAT_GUARD_MAX_RETRIES;
    }

    if (!renderChatGuardOverlay(doc) && chatGuardRetriesLeft > 0 && root.setTimeout) {
      chatGuardRetriesLeft -= 1;
      chatGuardRetryTimer = root.setTimeout(() => {
        chatGuardRetryTimer = null;
        syncChatGuard(normalizedSettings, doc, true);
      }, LIVE_START_POLL_MS);
    }
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
    syncChatGuard(normalizeSettings(settings), currentDocument);

    return normalizeSettings(settings);
  }

  function loadAndApplySettings(doc) {
    if (typeof shared.readSettings !== "function") {
      const normalizedSettings = applySettings(undefined, doc);
      liveStartController.sync(normalizedSettings, doc);
      return Promise.resolve(normalizedSettings);
    }

    return shared
      .readSettings()
      .then((settings) => {
        const normalizedSettings = applySettings(settings, doc);
        liveStartController.sync(normalizedSettings, doc);
        return normalizedSettings;
      })
      .catch((error) => {
        console.warn("[Anti-Spoiler for YouTube] Could not load settings.", error);
        const normalizedSettings = applySettings(undefined, doc);
        liveStartController.sync(normalizedSettings, doc);
        return normalizedSettings;
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
    // yt-navigate-start matters for the live guard: it fires as the transition
    // begins, so the eager shield arms before the new stream renders a frame.
    [
      "yt-navigate-start",
      "yt-navigate-finish",
      "yt-page-data-updated",
      "popstate",
      REFRESH_EVENT,
    ].forEach((eventName) => currentWindow.addEventListener(eventName, refresh));

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
    LIVE_START_OBSCURED_CLASS,
    LIVE_GUARD_OVERLAY_ID,
    CHAT_GUARD_OBSCURED_CLASS,
    CHAT_GUARD_OVERLAY_ID,
    LIVE_GUARD_PAUSE_EVENT: shared.LIVE_GUARD_PAUSE_EVENT,
    LIVE_GUARD_PLAY_EVENT: shared.LIVE_GUARD_PLAY_EVENT,
    LIVE_GUARD_CONTINUE_EVENT: shared.LIVE_GUARD_CONTINUE_EVENT,
    LIVE_START_SEEK_EVENT: shared.LIVE_START_SEEK_EVENT,
    LIVE_START_SEEK_RESULT_EVENT: shared.LIVE_START_SEEK_RESULT_EVENT,
    LIVE_STATE_REQUEST_EVENT: shared.LIVE_STATE_REQUEST_EVENT,
    LIVE_STATE_RESULT_EVENT: shared.LIVE_STATE_RESULT_EVENT,
    LIVE_START_TIMEOUT_MS: shared.LIVE_START_TIMEOUT_MS,
    LIVE_START_POLL_MS,
    buildSpoilerCss,
    getEnabledClassNames,
    getLiveStartVideoId: shared.getLiveStartVideoId,
    getLiveStartTarget: shared.getLiveStartTarget,
    isLikelyLivePlayback: shared.isLikelyLivePlayback,
    seekToEarliestSeekablePosition: shared.seekToEarliestSeekablePosition,
    createLiveStartController,
    ensureStyle,
    applySettings,
    init,
  };
});
