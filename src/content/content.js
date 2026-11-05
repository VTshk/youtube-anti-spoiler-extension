(function initContent(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    // In Node (tests) the shared namespace is not pre-populated by the browser's
    // script load order, so pull in the dependencies content.js relies on.
    require("../shared/settings.js");
    require("./live-start-controller.js");
    require("./skip-buttons.js");
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
  const COMMENTS_GUARD_OBSCURED_CLASS = "yas-comments-obscured";
  const COMMENTS_GUARD_OVERLAY_ID = "youtube-anti-spoiler-comments-guard";
  const COMMENTS_GUARD_CHECK_MS = 1000;
  const HIDDEN_TAB_TITLE = "YouTube";
  const SKIP_BUTTONS_CLASS = shared.SKIP_BUTTONS_CLASS;

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
    hideVideoTitles: "yas-hide-video-titles",
    startLiveFromBeginning: "yas-start-live-from-beginning",
    showSkipButtons: "yas-show-skip-buttons",
    hideComments: "yas-hide-comments",
  });

  const SETTING_KEYS = Object.freeze(Object.keys(CLASS_BY_SETTING));

  const THUMBNAIL_DURATION_SELECTORS = Object.freeze([
    "ytd-thumbnail-overlay-time-status-renderer",
    "yt-thumbnail-overlay-time-status-renderer",
    "ytm-thumbnail-overlay-time-status-renderer",
    ".ytd-thumbnail-overlay-time-status-renderer",
    ".ytm-thumbnail-overlay-time-status-renderer",
    ".ytp-videowall-still-info-duration",
    // The post-playback grid YouTube shipped in 2026 (also used in fullscreen)
    // and the autoplay "Up next" duration.
    ".ytp-modern-videowall-still-info-duration",
    ".ytp-autonav-timestamp",
    ".ytp-ce-video-duration",
    ".video-time",
    '[class*="thumbnail-overlay-time-status"]',
    ".badge-shape-wiz--thumbnail-overlay-time-status",
    ".badge-shape-wiz--thumbnail-overlay-badge",
    "yt-thumbnail-overlay-badge-view-model",
    // Shorts carry no duration; their "New" badge must not turn into an
    // empty pill.
    ".ytBadgeShapeText:not(.shortsLockupViewModelHost *)",
    "ytd-compact-video-renderer .badge-shape-wiz--thumbnail-overlay-badge",
    "yt-lockup-view-model .badge-shape-wiz--thumbnail-overlay-badge",
    "ytm-video-with-context-renderer .badge-shape-wiz--thumbnail-overlay-badge",
    // The whole badge, not only its text: an empty dark pill still shows by its
    // width whether the video is m:ss or h:mm:ss long.
    "yt-thumbnail-badge-view-model",
  ]);

  // Timestamps outside the player give the video length away just as well:
  // the last chapter in a description or transcript is close to the end.
  const TIMESTAMP_TEXT_SELECTORS = Object.freeze([
    // Description and comment timestamps are links to "&t=<seconds>s".
    'a.ytAttributedStringLink[href*="&t="]',
    'a.ytAttributedStringLink[href*="?t="]',
    '#content-text a[href*="&t="]',
    // "Key moments" / chapters panel and its search-result variant.
    "ytd-macro-markers-list-item-renderer #time",
    // Transcript panel (current and legacy markup).
    ".ytwTranscriptSegmentViewModelTimestamp",
    "ytd-transcript-segment-renderer .segment-timestamp",
    // Search results show a description snippet that lists chapter times
    // inline with the text, so the snippet can only be hidden as a whole.
    "ytd-video-renderer .metadata-snippet-container-one-line",
    "ytd-video-renderer .metadata-snippet-container",
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
    // Player endscreen suggestions: end cards during the final seconds, the
    // videowall grid after playback ends, and the autoplay "Up next" screen.
    // These render thumbnails as background-image divs, so the elements
    // themselves are blurred.
    ".ytp-ce-covering-image",
    ".ytp-ce-expanding-image",
    ".ytp-videowall-still-image",
    ".ytp-modern-videowall-still-image",
    ".ytp-autonav-endscreen-upnext-thumbnail",
    // The current video's cover before playback starts.
    ".ytp-cued-thumbnail-overlay-image",
    // Hovering a thumbnail plays the video inline in a separate player.
    "ytd-video-preview video",
    "#inline-preview-player video",
    // Chapter thumbnails ("Key moments") and the big tournament/team card
    // at the top of search results.
    "ytd-macro-markers-list-item-renderer #thumbnail img",
    "ytd-expandable-metadata-renderer #thumbnail img",
    "ytd-watch-card-hero-video-renderer #hero-image img",
    // Upcoming Shorts are pre-rendered as background-image frames.
    ".reel-video-in-sequence-thumbnail",
    // Seek-preview frames of the current video: the hover tooltip over a
    // visible timeline and the large frame while dragging. They show what
    // happens later in the video, so they go with the other previews.
    ".ytp-tooltip-bg",
    ".ytp-storyboard-framepreview-img",
  ]);

  const VIDEO_TITLE_SELECTORS = Object.freeze([
    "#video-title",
    "a#video-title-link",
    "yt-lockup-metadata-view-model h3",
    ".yt-lockup-metadata-view-model-wiz__title",
    ".yt-lockup-metadata-view-model__title",
    ".ytLockupMetadataViewModelTitle",
    ".media-item-headline",
    // Shorts shelves, the Shorts player, and the big search card title
    // (often "Team A 3 vs 0 Team B").
    ".shortsLockupViewModelHostMetadataTitle",
    "yt-shorts-video-title-view-model",
    "ytd-watch-card-hero-video-renderer #watch-card-title",
    // Chapter names in "Key moments" ("Goal 89'", "Penalty shootout").
    "ytd-macro-markers-list-item-renderer h4",
    "ytd-macro-markers-list-item-renderer h3",
    // Player chrome: the title shown over the video (fullscreen, embeds,
    // miniplayer) plus endscreen card, videowall, and autoplay titles.
    ".ytp-title-link",
    ".ytp-title-text",
    ".ytp-ce-video-title",
    ".ytp-ce-playlist-title",
    ".ytp-videowall-still-info-title",
    ".ytp-modern-videowall-still-info-title",
    ".ytPlayerOverlayVideoDetailsRendererTitle",
    ".ytp-autonav-endscreen-upnext-title",
    // Chapter name in the tooltip over a visible timeline: hovering ahead
    // reads out later chapters ("Goal 89'"). Scoped to the seek preview,
    // because buttons use the same tooltip class for their own names.
    ".ytp-tooltip.ytp-preview .ytp-tooltip-title",
    ".ytp-tooltip-progress-bar-pill-title",
  ]);

  const VIDEO_TITLE_SELECTOR_LIST = VIDEO_TITLE_SELECTORS.join(", ");
  const STASHED_TITLE_ATTRIBUTE = "data-yas-title";

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

${scopeSelectors(CLASS_BY_SETTING.hideTime, TIMESTAMP_TEXT_SELECTORS)} {
  visibility: hidden !important;
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

/* Titles stay clickable: blur hides the text without collapsing layout or
   blocking the link underneath. */
${scopeSelectors(CLASS_BY_SETTING.hideVideoTitles, VIDEO_TITLE_SELECTORS)} {
  filter: blur(8px) !important;
}

html.${LIVE_START_OBSCURED_CLASS} #movie_player,
html.${LIVE_START_OBSCURED_CLASS} ytd-player,
html.${LIVE_START_OBSCURED_CLASS} #player-container {
  background: #0f0f0f !important;
  overflow: hidden !important;
  position: relative !important;
}

/* No pixels of the stream under the live guard: while it loads its rewind
   window the stream plays behind the overlay, and a blur would still let
   colours and motion through. Its captions play along, so they go too. */
html.${LIVE_START_OBSCURED_CLASS} #movie_player video,
html.${LIVE_START_OBSCURED_CLASS} ytd-player video,
html.${LIVE_START_OBSCURED_CLASS} #movie_player .ytp-cued-thumbnail-overlay-image,
html.${LIVE_START_OBSCURED_CLASS} #movie_player .ytp-caption-window-container {
  opacity: 0 !important;
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

/* Skip buttons are inserted into every player and shown only while the
   timeline they stand in for is hidden, and never over the live guard. */
#movie_player .${SKIP_BUTTONS_CLASS} {
  display: none !important;
}

html.${CLASS_BY_SETTING.extensionEnabled}.${CLASS_BY_SETTING.hidePlayerProgressBar}.${CLASS_BY_SETTING.showSkipButtons}:not(.${LIVE_START_OBSCURED_CLASS}) #movie_player .${SKIP_BUTTONS_CLASS} {
  display: inline-flex !important;
  align-items: center !important;
  height: 100% !important;
}

#movie_player .${SKIP_BUTTONS_CLASS} .yas-skip-button {
  height: 100% !important;
  margin: 0 !important;
  padding: 0 6px !important;
  border: 0 !important;
  background: transparent !important;
  color: #fff !important;
  font-family: Roboto, Arial, sans-serif !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  line-height: 1 !important;
  opacity: 0.9 !important;
  cursor: pointer !important;
}

#movie_player .${SKIP_BUTTONS_CLASS} .yas-skip-button:hover {
  opacity: 1 !important;
}

html.${COMMENTS_GUARD_OBSCURED_CLASS} ytd-comments#comments {
  position: relative !important;
}

html.${COMMENTS_GUARD_OBSCURED_CLASS} ytd-comments#comments #contents {
  filter: blur(18px) !important;
  pointer-events: none !important;
}

/* The comment teaser under the video quotes a comment. It stays clickable:
   opening the comments panel from it is the user's choice to see them. */
html.${COMMENTS_GUARD_OBSCURED_CLASS} ytd-comments-entry-point-header-renderer {
  filter: blur(18px) !important;
}

/* Above the comments but below YouTube's fixed masthead. */
#${COMMENTS_GUARD_OVERLAY_ID} {
  position: absolute !important;
  inset: 0 !important;
  z-index: 10 !important;
  display: grid !important;
  align-content: start !important;
  justify-items: center !important;
  padding: 24px 16px !important;
  box-sizing: border-box !important;
  background: rgba(15, 15, 15, 0.72) !important;
  color: #f8f8f8 !important;
  font-family: Roboto, Arial, sans-serif !important;
  text-align: center !important;
}

/* The comments block can be thousands of pixels tall; the button travels
   down with the page instead of staying at its top. */
#${COMMENTS_GUARD_OVERLAY_ID} .yas-comments-guard-panel {
  position: sticky !important;
  top: 80px !important;
  display: grid !important;
  gap: 12px !important;
  justify-items: center !important;
}

#${COMMENTS_GUARD_OVERLAY_ID} .yas-comments-guard-title {
  margin: 0 !important;
  font-size: 16px !important;
  line-height: 1.3 !important;
  font-weight: 700 !important;
}

#${COMMENTS_GUARD_OVERLAY_ID} button {
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
  // well after navigation — hence the quick retries. After this budget the
  // guard keeps checking once a second (CHAT_GUARD_SLOW_CHECK_MS) while it is
  // still needed: chat can appear later, and YouTube can re-create the chat
  // frame, dropping the overlay with it. Off watch pages nothing is scheduled.
  const CHAT_GUARD_MAX_RETRIES = Math.ceil(
    (shared.LIVE_START_TIMEOUT_MS || 10000) / (LIVE_START_POLL_MS || 100),
  );
  const CHAT_GUARD_SLOW_CHECK_MS = 1000;
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

  function getChatGuardVideoId(doc) {
    return typeof shared.getLiveStartVideoId === "function"
      ? shared.getLiveStartVideoId(root, doc)
      : null;
  }

  function syncChatGuard(settings, doc, isRetry) {
    const normalizedSettings = normalizeSettings(settings);

    clearChatGuardRetry();

    // Chat only exists on watch pages; elsewhere the guard must not run (and
    // especially must not keep retrying).
    const videoId = getChatGuardVideoId(doc);
    const isWatchPage = Boolean(videoId) || !root.location;

    // Finished-stream VODs keep a replay chat frame, but the replay is synced
    // to playback and spoils nothing — blurring it there would fight the live
    // guard, which correctly lets those videos play. Only an explicit not-live
    // marker skips the guard; while live status is unknown the chat stays
    // protected, and the slow check below re-checks as the data hydrates. The
    // page-world player data counts too: the DOM microdata is not refreshed
    // on SPA moves.
    // Exception: while the live guard for this video waits for the user's
    // choice, a stream that has just ended reports "not live" too, and its
    // chat would reveal the result, so the chat stays covered until then.
    const documentSaysNotLive =
      typeof shared.documentSaysVideoIsNotLive === "function" &&
      shared.documentSaysVideoIsNotLive(doc, videoId);
    const knownNotLive =
      (documentSaysNotLive || liveStartController.isKnownNotLive(videoId)) &&
      !liveStartController.isWaitingForChoice(videoId);

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

    if (!isRetry) {
      chatGuardRetriesLeft = CHAT_GUARD_MAX_RETRIES;
    }

    let delay = CHAT_GUARD_SLOW_CHECK_MS;

    if (knownNotLive) {
      // Uncovered, but still checked once a second: the same video can still
      // turn out to be live, with the live guard waiting for a choice, and
      // then the chat is covered again.
      removeChatGuardOverlay(doc);
      removeChatGuardObscuring(doc);
    } else {
      addChatGuardObscuring(doc);

      const mounted = renderChatGuardOverlay(doc);

      if (!mounted && chatGuardRetriesLeft > 0) {
        chatGuardRetriesLeft -= 1;
        delay = LIVE_START_POLL_MS;
      }
    }

    if (!root.setTimeout) {
      return;
    }

    chatGuardRetryTimer = root.setTimeout(() => {
      chatGuardRetryTimer = null;
      syncChatGuard(normalizedSettings, doc, true);
    }, delay);
  }

  // Comments under a video are covered like live chat: blurred behind a
  // "Show comments" button that counts for the current video only. YouTube
  // loads the comments lazily on scroll and can re-create the section, so
  // the cover is re-checked once a second while a video page is open.
  let commentsGuardTimer = null;
  let commentsGuardVideoId = null;
  let commentsGuardShown = false;

  function clearCommentsGuardCheck() {
    if (commentsGuardTimer) {
      root.clearTimeout(commentsGuardTimer);
    }

    commentsGuardTimer = null;
  }

  function removeCommentsGuard(doc) {
    const overlay = doc.getElementById(COMMENTS_GUARD_OVERLAY_ID);

    if (overlay) {
      overlay.remove();
    }

    doc.documentElement.classList.remove(COMMENTS_GUARD_OBSCURED_CLASS);
  }

  function renderCommentsGuardOverlay(doc) {
    if (doc.getElementById(COMMENTS_GUARD_OVERLAY_ID)) {
      return;
    }

    const host = doc.querySelector("ytd-comments#comments");

    // Not rendered yet; the next check tries again.
    if (!host) {
      return;
    }

    const overlay = doc.createElement("div");
    overlay.id = COMMENTS_GUARD_OVERLAY_ID;

    const panel = doc.createElement("div");
    panel.className = "yas-comments-guard-panel";
    overlay.appendChild(panel);

    const title = doc.createElement("p");
    title.className = "yas-comments-guard-title";
    title.textContent = "Comments hidden";
    panel.appendChild(title);

    const button = doc.createElement("button");
    button.type = "button";
    button.dataset.commentsGuardAction = "show";
    button.textContent = "Show comments";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      commentsGuardShown = true;
      clearCommentsGuardCheck();
      removeCommentsGuard(doc);
    });
    panel.appendChild(button);

    host.appendChild(overlay);
  }

  function syncCommentsGuard(settings, doc) {
    clearCommentsGuardCheck();

    const videoId = shared.getLiveStartVideoId(root, doc);

    if (videoId !== commentsGuardVideoId) {
      // "Show comments" on one video must not uncover the next one.
      commentsGuardVideoId = videoId;
      commentsGuardShown = false;
    }

    if (
      !settings.extensionEnabled ||
      !settings.hideComments ||
      !videoId ||
      commentsGuardShown
    ) {
      removeCommentsGuard(doc);
      return;
    }

    doc.documentElement.classList.add(COMMENTS_GUARD_OBSCURED_CLASS);
    renderCommentsGuardOverlay(doc);

    commentsGuardTimer = root.setTimeout(() => {
      commentsGuardTimer = null;
      syncCommentsGuard(settings, doc);
    }, COMMENTS_GUARD_CHECK_MS);
  }

  // With video titles hidden, the browser tab would still show the title of
  // the video being watched. YouTube rewrites document.title on every
  // navigation, so the <title> element is watched and its text replaced.
  // The title YouTube set while ours was showing, to put back when title
  // hiding is switched off; null while the tab shows YouTube's own title.
  let youtubeTabTitle = null;
  let tabTitleObserver = null;
  let observedTitleElement = null;

  function isOnVideoPage() {
    if (!root.location) {
      return false;
    }

    const pathname = new URL(root.location.href).pathname;

    return (
      pathname === "/watch" ||
      pathname.startsWith("/live/") ||
      pathname.startsWith("/shorts/")
    );
  }

  function observeTabTitle(doc, titleElement) {
    if (titleElement === observedTitleElement) {
      return;
    }

    if (tabTitleObserver) {
      tabTitleObserver.disconnect();
    }

    tabTitleObserver = new MutationObserver(() => syncTabTitle(doc));
    tabTitleObserver.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    observedTitleElement = titleElement;
  }

  function syncTabTitle(doc) {
    if (!isOnVideoPage()) {
      // YouTube gives every other page its own title. The stashed one
      // belongs to the video just left and must not come back.
      youtubeTabTitle = null;
      return;
    }

    if (!doc.documentElement.classList.contains(CLASS_BY_SETTING.hideVideoTitles)) {
      if (youtubeTabTitle !== null && doc.title === HIDDEN_TAB_TITLE) {
        doc.title = youtubeTabTitle;
      }

      youtubeTabTitle = null;
      return;
    }

    const titleElement = doc.querySelector("title");

    // At document_start <head> is not parsed yet. Until <title> exists the
    // whole document is watched, so the video's title is replaced the moment
    // the parser adds it; after that only <title> itself is watched.
    observeTabTitle(doc, titleElement || doc.documentElement);

    if (!titleElement) {
      return;
    }

    // Our own write comes back through the observer with exactly this text,
    // so it is never mistaken for a title from YouTube.
    if (doc.title !== HIDDEN_TAB_TITLE) {
      youtubeTabTitle = doc.title;
      doc.title = HIDDEN_TAB_TITLE;
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

    if (enabledClassNames.includes(CLASS_BY_SETTING.hideVideoTitles)) {
      // A title already under the cursor gets no new mouseover when title
      // hiding is switched on, so it is handled here.
      currentDocument.querySelectorAll("[title]:hover").forEach(stashTitleAttribute);
    } else {
      restoreStashedTitleAttributes(currentDocument);
    }

    ensureStyle(currentDocument);
    syncChatGuard(normalizeSettings(settings), currentDocument);
    syncCommentsGuard(normalizeSettings(settings), currentDocument);
    syncTabTitle(currentDocument);

    return normalizeSettings(settings);
  }

  // The blur hides a title on screen, but the browser's own tooltip would
  // still show its `title` attribute in full on hover. The attribute is taken
  // off the hovered title before the tooltip appears and put back when title
  // hiding is switched off.
  function stashHoveredTitleAttribute(event) {
    const target = event.target;

    if (!target || typeof target.closest !== "function") {
      return;
    }

    const rootElement = target.ownerDocument.documentElement;

    if (rootElement.classList.contains(CLASS_BY_SETTING.hideVideoTitles)) {
      stashTitleAttribute(target);
    }
  }

  // Takes the `title` off the video title the element belongs to, if any.
  function stashTitleAttribute(element) {
    const titled = element.closest("[title]");

    if (!titled || !titled.closest(VIDEO_TITLE_SELECTOR_LIST)) {
      return;
    }

    titled.setAttribute(STASHED_TITLE_ATTRIBUTE, titled.getAttribute("title"));
    titled.removeAttribute("title");
  }

  function restoreStashedTitleAttributes(doc) {
    doc.querySelectorAll(`[${STASHED_TITLE_ATTRIBUTE}]`).forEach((element) => {
      // YouTube reuses list items for other videos and sets a fresh title;
      // that one wins over the stashed copy.
      if (!element.hasAttribute("title")) {
        element.setAttribute("title", element.getAttribute(STASHED_TITLE_ATTRIBUTE));
      }

      element.removeAttribute(STASHED_TITLE_ATTRIBUTE);
    });
  }

  // Last settings read from storage. Until the first read answers, the
  // defaults stand in: protection is on, so a page never renders unprotected
  // while chrome.storage is still busy. A user who turned protection off sees
  // it lift a moment later, which is the safe direction for a spoiler blocker.
  let lastKnownSettings = normalizeSettings(undefined);

  function applyAndSync(settings, doc) {
    lastKnownSettings = applySettings(settings, doc);
    liveStartController.sync(lastKnownSettings, doc);
    return lastKnownSettings;
  }

  function loadAndApplySettings(doc) {
    if (typeof shared.readSettings !== "function") {
      return Promise.resolve(applyAndSync(undefined, doc));
    }

    return shared
      .readSettings()
      .then((settings) => applyAndSync(settings, doc))
      .catch((error) => {
        console.warn("[Anti-Spoiler for YouTube] Could not load settings.", error);
        return applyAndSync(lastKnownSettings, doc);
      });
  }

  // Runs on start and on every navigation: protect synchronously with the
  // last known settings, then re-read storage in case it changed meanwhile.
  function refreshProtection(doc) {
    const currentDocument = doc || root.document;

    ensureStyle(currentDocument);
    applyAndSync(lastKnownSettings, currentDocument);
    return loadAndApplySettings(currentDocument);
  }

  function bindNavigationRefresh(win, refresh) {
    const currentWindow = win || root;

    if (!currentWindow || currentWindow.__youtubeAntiSpoilerNavigationBound) {
      return;
    }

    // YouTube is a SPA. These events cover its own router and browser history.
    // yt-navigate-start matters for the live guard: it fires as the transition
    // begins, so the eager shield arms before the new stream renders a frame.
    // REFRESH_EVENT arrives from the MAIN-world bridge, which patches
    // history.pushState/replaceState — the isolated world cannot see those
    // calls itself, so this is the router-agnostic navigation fallback.
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
    const observer = new MutationObserver((mutations) => {
      if (refreshQueued) {
        return;
      }

      // The style can only disappear via a removal; the vast majority of
      // YouTube's mutations are insertions, so skip them without touching
      // the DOM at all.
      const anyNodeRemoved = mutations.some(
        (mutation) => mutation.removedNodes && mutation.removedNodes.length > 0,
      );

      if (!anyNodeRemoved || currentDocument.getElementById(STYLE_ID)) {
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
      refreshProtection(root.document);
      shared.ensureSkipButtons(root.document);
    };

    root.__youtubeAntiSpoilerInitialized = true;

    bindNavigationRefresh(root, refresh);
    bindStorageChanges();
    observeStyleRemoval(root.document);
    root.document.addEventListener("mouseover", stashHoveredTitleAttribute, true);
    // YouTube rebuilds the player now and then, dropping the skip buttons.
    root.setInterval(() => {
      shared.ensureSkipButtons(root.document);
    }, shared.SKIP_BUTTONS_CHECK_MS);
    refresh();
  }

  return {
    STYLE_ID,
    CLASS_BY_SETTING,
    LIVE_START_OBSCURED_CLASS,
    LIVE_GUARD_OVERLAY_ID,
    CHAT_GUARD_OBSCURED_CLASS,
    CHAT_GUARD_OVERLAY_ID,
    COMMENTS_GUARD_OBSCURED_CLASS,
    COMMENTS_GUARD_OVERLAY_ID,
    COMMENTS_GUARD_CHECK_MS,
    HIDDEN_TAB_TITLE,
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
    stashHoveredTitleAttribute,
    restoreStashedTitleAttributes,
    refreshProtection,
    init,
  };
});
