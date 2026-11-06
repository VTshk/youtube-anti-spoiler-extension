(function initContent(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    // In Node (tests) the shared namespace is not pre-populated by the browser's
    // script load order, so pull in the dependencies content.js relies on.
    require("../shared/settings.js");
    require("../shared/i18n.js");
    require("./live-start-controller.js");
    require("./skip-buttons.js");
    require("./reveal-button.js");
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
  // Every comments cover carries this class: the one under the video and
  // one in each comments panel.
  const COMMENTS_GUARD_OVERLAY_CLASS = "yas-comments-guard-overlay";
  // The comments panel beside the video on /watch and on Shorts. SPA moves
  // leave earlier pages in the document, so there can be several, hidden
  // ones included.
  const COMMENTS_PANEL_SELECTOR =
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]';
  const COMMENTS_GUARD_CHECK_MS = 1000;
  const HIDDEN_TAB_TITLE = "YouTube";
  const SKIP_BUTTONS_CLASS = shared.SKIP_BUTTONS_CLASS;
  const REVEAL_BUTTON_CLASS = shared.REVEAL_BUTTON_CLASS;
  // "Show spoilers for this video": on <html> while the open video is the
  // one the user uncovered. Rules for the open video are written with
  // UNLESS_REVEALED, so they stop applying; everything about other videos
  // (cards, thumbnails, end cards, "Up next") stays protected.
  const REVEAL_VIDEO_CLASS = "yas-reveal-video";
  const UNLESS_REVEALED = `:not(.${REVEAL_VIDEO_CLASS})`;
  // The uncovered video's id in sessionStorage (this tab only), so a reload
  // of the same video keeps it.
  const REVEALED_VIDEO_STORAGE_KEY = "yas-revealed-video";
  // The optional blurs from the last settings read, in the page's
  // localStorage, so the next page load blurs at once instead of waiting
  // for chrome.storage.
  const LAST_SETTINGS_STORAGE_KEY = "yas-last-settings";
  // Put on #movie_player by the page-world bridge (live-player-bridge.js)
  // while the player refuses to seek.
  const SEEK_BLOCKED_ATTRIBUTE = "data-yas-seek-blocked";

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
    // They stay hidden when the open video is uncovered: a link does not
    // say which video it points to, and a description can link to a
    // moment of another match.
    'a.ytAttributedStringLink[href*="&t="]',
    'a.ytAttributedStringLink[href*="?t="]',
    '#content-text a[href*="&t="]',
    // Search results show a description snippet that lists chapter times
    // inline with the text, so the snippet can only be hidden as a whole.
    "ytd-video-renderer .metadata-snippet-container-one-line",
    "ytd-video-renderer .metadata-snippet-container",
  ]);

  // Timestamps of the open video, uncovered with it.
  const OPEN_VIDEO_TIMESTAMP_SELECTORS = Object.freeze([
    // "Key moments" / chapters panel. Its search-result variant matches too,
    // but search has no open video, so the reveal class is never set there.
    "ytd-macro-markers-list-item-renderer #time",
    // Transcript panel (current and legacy markup).
    ".ytwTranscriptSegmentViewModelTimestamp",
    "ytd-transcript-segment-renderer .segment-timestamp",
  ]);

  // Live badges carry the word "LIVE", not a duration: keep both the thumbnail
  // variant and the red pill under titles in search results visible.
  const LIVE_BADGE_EXCLUSION =
    ":not(.ytBadgeShapeThumbnailLive):not(.ytBadgeShapeThumbnailLive *):not(:has(.ytBadgeShapeThumbnailLive))" +
    ":not(.ytBadgeShapeLive):not(.ytBadgeShapeLive *):not(:has(.ytBadgeShapeLive))";

  // The player shows the open video: these are uncovered with it.
  const PLAYER_TIME_SELECTORS = Object.freeze([
    ".ytp-time-display",
    ".ytp-time-current",
    ".ytp-time-separator",
    ".ytp-time-duration",
    // The time in the seek preview. Scoped to it: player buttons (Settings,
    // Full screen) draw their names in the same tooltip classes
    // (.ytp-tooltip.ytp-bottom > ... > .ytp-tooltip-bottom-text > .ytp-tooltip-text).
    ".ytp-tooltip.ytp-preview .ytp-tooltip-text",
    ".ytp-tooltip.ytp-preview .ytp-tooltip-bottom-text",
    ".ytp-tooltip.ytp-preview .ytp-tooltip-duration",
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
    // Hovering a thumbnail plays the video inline in a separate player.
    "ytd-video-preview video",
    "#inline-preview-player video",
    // The big tournament/team card at the top of search results.
    "ytd-watch-card-hero-video-renderer #hero-image img",
    // Upcoming Shorts are pre-rendered as background-image frames.
    ".reel-video-in-sequence-thumbnail",
  ]);

  // Previews of the open video, uncovered with it.
  const OPEN_VIDEO_PREVIEW_SELECTORS = Object.freeze([
    // The current video's cover before playback starts.
    ".ytp-cued-thumbnail-overlay-image",
    // Chapter thumbnails ("Key moments").
    "ytd-macro-markers-list-item-renderer #thumbnail img",
    "ytd-expandable-metadata-renderer #thumbnail img",
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
    // Shorts shelves and the big search card title (often "Team A 3 vs 0
    // Team B").
    ".shortsLockupViewModelHostMetadataTitle",
    "ytd-watch-card-hero-video-renderer #watch-card-title",
    // Endscreen card, videowall, and autoplay titles in the player.
    ".ytp-ce-video-title",
    ".ytp-ce-playlist-title",
    ".ytp-videowall-still-info-title",
    ".ytp-modern-videowall-still-info-title",
    ".ytPlayerOverlayVideoDetailsRendererTitle",
    ".ytp-autonav-endscreen-upnext-title",
  ]);

  // Titles, chapter names, and the description of the open video,
  // uncovered with it.
  const OPEN_VIDEO_TITLE_SELECTORS = Object.freeze([
    // The Shorts player.
    "yt-shorts-video-title-view-model",
    // Chapter names in "Key moments" ("Goal 89'", "Penalty shootout").
    "ytd-macro-markers-list-item-renderer h4",
    "ytd-macro-markers-list-item-renderer h3",
    // Player chrome: the title shown over the video (fullscreen, embeds,
    // miniplayer).
    ".ytp-title-link",
    ".ytp-title-text",
    // Chapter name in the tooltip over a visible timeline: hovering ahead
    // reads out later chapters ("Goal 89'"). Scoped to the seek preview,
    // because buttons use the same tooltip class for their own names.
    ".ytp-tooltip.ytp-preview .ytp-tooltip-title",
    ".ytp-tooltip-progress-bar-pill-title",
    // The current chapter's name in the player bar, next to the time. Only
    // the text, so the chapter button stays clickable.
    ".ytp-chapter-title-content",
    // The open video's title above the description and the line under it:
    // views, "Streamed 1mo ago" / "15h ago", and the exact date in its
    // tooltip and after "more". The date has no element of its own (a
    // stream recording shows it in #info together with the views), so the
    // whole line is blurred.
    "ytd-watch-metadata h1",
    "ytd-watch-metadata ytd-watch-info-text",
    // The description often starts with the full title ("Team A vs Team B
    // | Final"). Its text is blurred folded and unfolded; the "more" and
    // "Show less" buttons next to it stay readable.
    "ytd-watch-metadata #description-inline-expander #snippet-text",
    "ytd-watch-metadata #description-inline-expander #expanded",
  ]);

  const VIDEO_TITLE_SELECTOR_LIST = [
    ...VIDEO_TITLE_SELECTORS,
    ...OPEN_VIDEO_TITLE_SELECTORS,
  ].join(", ");
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

  // Rules about the open video stop applying while it is uncovered.
  function scopeOpenVideoSelectors(className, selectors) {
    return scopeSelectors(`${className}${UNLESS_REVEALED}`, selectors);
  }

  function buildSpoilerCss() {
    return `
${scopeSelectors(
  CLASS_BY_SETTING.hideTime,
  THUMBNAIL_DURATION_SELECTORS,
  LIVE_BADGE_EXCLUSION,
)} {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

${scopeSelectors(CLASS_BY_SETTING.hideTime, TIMESTAMP_TEXT_SELECTORS)},
${scopeOpenVideoSelectors(CLASS_BY_SETTING.hideTime, OPEN_VIDEO_TIMESTAMP_SELECTORS)} {
  visibility: hidden !important;
  pointer-events: none !important;
}

${scopeOpenVideoSelectors(CLASS_BY_SETTING.hideTime, PLAYER_TIME_SELECTORS)} {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

html.${CLASS_BY_SETTING.hideTime}${UNLESS_REVEALED} .ytp-time-display {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

${scopeOpenVideoSelectors(CLASS_BY_SETTING.hidePlayerProgressBar, PLAYER_PROGRESS_SELECTORS)},
${scopeSelectors(CLASS_BY_SETTING.hidePlayerProgressBar, THUMBNAIL_PROGRESS_SELECTORS)} {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

${scopeSelectors(CLASS_BY_SETTING.hideVideoPreviews, VIDEO_PREVIEW_SELECTORS)},
${scopeOpenVideoSelectors(CLASS_BY_SETTING.hideVideoPreviews, OPEN_VIDEO_PREVIEW_SELECTORS)} {
  filter: blur(24px) !important;
}

/* The "Most replayed" graph over a visible timeline: its peaks often fall
   on goals and other key moments. A blurred 40px curve would still show
   where the peaks are, so it is hidden rather than blurred. */
html.${CLASS_BY_SETTING.hideVideoPreviews}${UNLESS_REVEALED} .ytp-heat-map-container {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Titles stay clickable: blur hides the text without collapsing layout or
   blocking the link underneath. */
${scopeSelectors(CLASS_BY_SETTING.hideVideoTitles, VIDEO_TITLE_SELECTORS)},
${scopeOpenVideoSelectors(CLASS_BY_SETTING.hideVideoTitles, OPEN_VIDEO_TITLE_SELECTORS)} {
  filter: blur(8px) !important;
}

html.${LIVE_START_OBSCURED_CLASS} #movie_player,
html.${LIVE_START_OBSCURED_CLASS} ytd-player,
html.${LIVE_START_OBSCURED_CLASS} #player-container {
  background: #0f0f0f !important;
  overflow: hidden !important;
}
/* No "position" here: YouTube's #player-container is position:absolute
   inside a zero-height aspect-ratio box. Forcing it to relative collapsed
   the player to 0 px after in-site navigation, so the live guard panel
   had nowhere to go and never appeared. */

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
  background: rgba(0, 0, 0, 0.85) !important;
  color: #f4f4f5 !important;
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

/* The live chat cover shows the comments-cover texts, so it has the same
   look as the comments cover below. */
#${CHAT_GUARD_OVERLAY_ID} .yas-chat-guard-panel {
  display: grid !important;
  gap: 12px !important;
  justify-items: center !important;
  padding: 12px 16px 12px 20px !important;
  border-radius: 12px !important;
  box-shadow: inset 4px 0 0 #c85252 !important;
  background: #222222 !important;
}

#${CHAT_GUARD_OVERLAY_ID} .yas-chat-guard-title {
  margin: 0 !important;
  color: #f4f4f5 !important;
  font-size: 14px !important;
  line-height: 1.3 !important;
  font-weight: 600 !important;
}

#${CHAT_GUARD_OVERLAY_ID} button {
  min-height: 32px !important;
  border: 0 !important;
  border-radius: 999px !important;
  padding: 0 14px !important;
  background: #b33939 !important;
  color: #ffffff !important;
  font: inherit !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

#${CHAT_GUARD_OVERLAY_ID} button:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 2px !important;
}

/* Skip buttons are inserted into every player and shown only while the
   timeline they stand in for is hidden, and never over the live guard.
   On a live stream whose streamer turned rewinding off the player refuses
   every seek, so the buttons would do nothing and are not shown either.
   An uncovered video shows its own timeline, so they go then too. */
#movie_player .${SKIP_BUTTONS_CLASS} {
  display: none !important;
}

/* Drawn like YouTube's own text pill, the time display they replace
   (measured 2026-11-06): 40 px high, 8 px from the top of the 56 px bar,
   rgba(0,0,0,.3) behind, radius 28px, 14 px weight 500 text. The six
   buttons share one pill, as YouTube groups previous, play and next. */
html.${CLASS_BY_SETTING.extensionEnabled}.${CLASS_BY_SETTING.hidePlayerProgressBar}:not(.${LIVE_START_OBSCURED_CLASS})${UNLESS_REVEALED} #movie_player:not([${SEEK_BLOCKED_ATTRIBUTE}]) .${SKIP_BUTTONS_CLASS} {
  display: inline-flex !important;
  align-items: center !important;
  height: 40px !important;
  margin: 8px 0 8px 12px !important;
  padding: 0 4px !important;
  border-radius: 28px !important;
  background: rgba(0, 0, 0, 0.3) !important;
}

/* YouTube highlights a hovered control 4 px inside its pill. */
#movie_player .${SKIP_BUTTONS_CLASS} .yas-skip-button {
  height: 32px !important;
  margin: 0 !important;
  padding: 0 8px !important;
  border: 0 !important;
  border-radius: 28px !important;
  background: transparent !important;
  color: #ffffff !important;
  font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  line-height: 32px !important;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5) !important;
  cursor: pointer !important;
  transition: background-color 0.2s cubic-bezier(0.05, 0, 0, 1) !important;
}

#movie_player .${SKIP_BUTTONS_CLASS} .yas-skip-button:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

#movie_player .${SKIP_BUTTONS_CLASS} .yas-skip-button:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 0 !important;
}

/* The "Show spoilers for this video" eye: a round pill of the same look as
   the skip buttons, shown only while protection is on and a video is open
   (content.js sets "hidden" otherwise). */
#movie_player .${REVEAL_BUTTON_CLASS} {
  display: none !important;
}

html.${CLASS_BY_SETTING.extensionEnabled} #movie_player .${REVEAL_BUTTON_CLASS}:not([hidden]) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 40px !important;
  height: 40px !important;
  margin: 8px 0 8px 12px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 28px !important;
  background: rgba(0, 0, 0, 0.3) !important;
  color: #ffffff !important;
  cursor: pointer !important;
  transition: background-color 0.2s cubic-bezier(0.05, 0, 0, 1) !important;
}

html.${CLASS_BY_SETTING.extensionEnabled} #movie_player .${REVEAL_BUTTON_CLASS}:not([hidden]):hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

#movie_player .${REVEAL_BUTTON_CLASS}:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 0 !important;
}

/* The slash over the eye shows only while the video is uncovered: then a
   click covers it again. */
#movie_player .${REVEAL_BUTTON_CLASS}:not([aria-pressed="true"]) .yas-reveal-slash {
  display: none !important;
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

/* The comments panel (beside the video on /watch, and on Shorts): its
   header with the title, sort menu, and Close stays usable; only the list
   below it is covered. The list scrolls inside #content, which has a fixed
   height, so a cover over #content spans everything visible. */
html.${COMMENTS_GUARD_OBSCURED_CLASS} ${COMMENTS_PANEL_SELECTOR} > #content {
  position: relative !important;
}

html.${COMMENTS_GUARD_OBSCURED_CLASS} ${COMMENTS_PANEL_SELECTOR} > #content > ytd-section-list-renderer {
  filter: blur(18px) !important;
  pointer-events: none !important;
}

/* Above the comments but below YouTube's fixed masthead. */
.${COMMENTS_GUARD_OVERLAY_CLASS} {
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

/* An opaque card: it reads the same over YouTube's light and dark themes.
   The red bar is an inset shadow: a left border on a rounded card would be
   drawn as a curved sliver. */
.${COMMENTS_GUARD_OVERLAY_CLASS} .yas-comments-guard-panel {
  display: grid !important;
  gap: 12px !important;
  justify-items: center !important;
  padding: 12px 16px 12px 20px !important;
  border-radius: 12px !important;
  box-shadow: inset 4px 0 0 #c85252 !important;
  background: #222222 !important;
}

/* Under the video the comments block can be thousands of pixels tall; the
   button travels down with the page instead of staying at its top. In a
   comments panel only the list scrolls, so there the button stays put. */
#${COMMENTS_GUARD_OVERLAY_ID} .yas-comments-guard-panel {
  position: sticky !important;
  top: 80px !important;
}

.${COMMENTS_GUARD_OVERLAY_CLASS} .yas-comments-guard-title {
  margin: 0 !important;
  color: #f4f4f5 !important;
  font-size: 14px !important;
  line-height: 1.3 !important;
  font-weight: 600 !important;
}

/* White on #b33939 is 5.90:1; the logo red #c85252 would be too light. */
.${COMMENTS_GUARD_OVERLAY_CLASS} button {
  min-height: 32px !important;
  border: 0 !important;
  border-radius: 999px !important;
  padding: 0 14px !important;
  background: #b33939 !important;
  color: #ffffff !important;
  font: inherit !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

.${COMMENTS_GUARD_OVERLAY_CLASS} button:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 2px !important;
}

/* The red strip on top repeats the logo. */
#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-panel {
  width: min(420px, calc(100vw - 48px)) !important;
  display: grid !important;
  gap: 14px !important;
  box-sizing: border-box !important;
  padding: 20px !important;
  border: 1px solid #333338 !important;
  border-top: 6px solid #c85252 !important;
  border-radius: 16px !important;
  background: #1e1e22 !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-title {
  margin: 0 !important;
  color: #f4f4f5 !important;
  font-size: 20px !important;
  line-height: 1.25 !important;
  font-weight: 700 !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-copy {
  margin: 0 !important;
  color: #a8a29e !important;
  font-size: 14px !important;
  line-height: 1.45 !important;
}

#${LIVE_GUARD_OVERLAY_ID} .yas-live-guard-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: 10px !important;
}

/* Secondary buttons ("Continue live", "Play"). */
#${LIVE_GUARD_OVERLAY_ID} button {
  min-height: 40px !important;
  border: 1px solid #8a8a94 !important;
  border-radius: 999px !important;
  padding: 0 18px !important;
  background: transparent !important;
  color: #f4f4f5 !important;
  font: inherit !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

/* The primary button. White on #b33939 is 5.90:1. */
#${LIVE_GUARD_OVERLAY_ID} button[data-live-guard-action="start"] {
  border-color: #b33939 !important;
  background: #b33939 !important;
  color: #ffffff !important;
}

#${LIVE_GUARD_OVERLAY_ID} button:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 2px !important;
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

    appendChatGuardElement(doc, panel, "p", "yas-chat-guard-title", "commentsHiddenTitle");

    const button = doc.createElement("button");
    button.type = "button";
    button.dataset.chatGuardAction = "show";
    shared.setText(button, "commentsShowButton");
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

  function appendChatGuardElement(doc, parent, tagName, className, textKey) {
    const element = doc.createElement(tagName);
    element.className = className;
    shared.setText(element, textKey);
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

    // An uncovered video shows its chat, without counting as "Show
    // comments": hiding the video again covers the chat again.
    if (
      !normalizedSettings.extensionEnabled ||
      !normalizedSettings.startLiveFromBeginning ||
      !isWatchPage ||
      chatGuardDisabled ||
      isOpenVideoRevealed(doc)
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

  // Comments are covered like live chat: blurred behind a "Show comments"
  // button that counts for the current video only. That is the comments
  // under the video and the comments panel (beside the video on /watch, and
  // on Shorts). YouTube loads comments lazily and can re-create the section
  // or the panel, so the covers are re-checked once a second while a video
  // page is open.
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
    doc.querySelectorAll(`.${COMMENTS_GUARD_OVERLAY_CLASS}`).forEach((overlay) => {
      overlay.remove();
    });

    doc.documentElement.classList.remove(COMMENTS_GUARD_OBSCURED_CLASS);
  }

  // The cover under the video: inside the comments section itself.
  function renderCommentsGuardOverlay(doc) {
    if (doc.getElementById(COMMENTS_GUARD_OVERLAY_ID)) {
      return;
    }

    const host = doc.querySelector("ytd-comments#comments");

    // Not rendered yet; the next check tries again.
    if (!host) {
      return;
    }

    const overlay = createCommentsGuardOverlay(doc);
    overlay.id = COMMENTS_GUARD_OVERLAY_ID;
    host.appendChild(overlay);
  }

  // The cover in a comments panel sits next to the blurred list inside the
  // panel's #content, not inside the list, so it is not blurred with it.
  function renderCommentsPanelOverlay(doc, commentsPanel) {
    const content = commentsPanel.querySelector(":scope > #content");

    // Not rendered yet (the next check tries again), or already covered.
    if (
      !content ||
      content.querySelector(`:scope > .${COMMENTS_GUARD_OVERLAY_CLASS}`)
    ) {
      return;
    }

    content.appendChild(createCommentsGuardOverlay(doc));
  }

  function createCommentsGuardOverlay(doc) {
    const overlay = doc.createElement("div");
    overlay.className = COMMENTS_GUARD_OVERLAY_CLASS;

    const panel = doc.createElement("div");
    panel.className = "yas-comments-guard-panel";
    overlay.appendChild(panel);

    const title = doc.createElement("p");
    title.className = "yas-comments-guard-title";
    shared.setText(title, "commentsHiddenTitle");
    panel.appendChild(title);

    const button = doc.createElement("button");
    button.type = "button";
    button.dataset.commentsGuardAction = "show";
    shared.setText(button, "commentsShowButton");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      // One choice for the whole video: every cover goes, under the video
      // and in the panels.
      commentsGuardShown = true;
      clearCommentsGuardCheck();
      removeCommentsGuard(doc);
    });
    panel.appendChild(button);

    return overlay;
  }

  // The id of the video open on this page, or null. Used by the comments
  // guard, the tab title, and "Show spoilers for this video". Shorts are not
  // live streams, so getLiveStartVideoId (which the live guard relies on)
  // does not know /shorts/ pages; their comments can still name a result.
  function getOpenVideoId(doc) {
    if (root.location) {
      const shortsMatch = new URL(root.location.href).pathname.match(/^\/shorts\/([^/]+)/);

      if (shortsMatch) {
        return shortsMatch[1];
      }
    }

    return shared.getLiveStartVideoId(root, doc);
  }

  function syncCommentsGuard(settings, doc) {
    clearCommentsGuardCheck();

    // Scrolling Shorts with the comments panel open changes this id too, so
    // the next Short's comments are covered again.
    const videoId = getOpenVideoId(doc);

    if (videoId !== commentsGuardVideoId) {
      // "Show comments" on one video must not uncover the next one.
      commentsGuardVideoId = videoId;
      commentsGuardShown = false;
    }

    // An uncovered video shows its comments, without counting as "Show
    // comments": hiding the video again covers them again.
    if (
      !settings.extensionEnabled ||
      !settings.hideComments ||
      !videoId ||
      commentsGuardShown ||
      isOpenVideoRevealed(doc)
    ) {
      removeCommentsGuard(doc);
      return;
    }

    doc.documentElement.classList.add(COMMENTS_GUARD_OBSCURED_CLASS);
    renderCommentsGuardOverlay(doc);
    doc.querySelectorAll(COMMENTS_PANEL_SELECTOR).forEach((commentsPanel) => {
      renderCommentsPanelOverlay(doc, commentsPanel);
    });

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

  // A channel's /live page counts too, once it names its stream.
  function isOnVideoPage(doc) {
    return Boolean(getOpenVideoId(doc));
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
    if (!isOnVideoPage(doc)) {
      // YouTube gives every other page its own title. The stashed one
      // belongs to the video just left and must not come back.
      youtubeTabTitle = null;
      return;
    }

    if (
      !doc.documentElement.classList.contains(CLASS_BY_SETTING.hideVideoTitles) ||
      isOpenVideoRevealed(doc)
    ) {
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

  // "Show spoilers for this video" uncovers the open video until another
  // video, or a page without a video, is open. The video's id is kept in
  // sessionStorage (this tab only), so a reload of the same video keeps it.
  // Site data can be blocked; then storage throws and nothing is uncovered.
  function readRevealedVideoId() {
    try {
      return root.sessionStorage.getItem(REVEALED_VIDEO_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  // null forgets the uncovered video.
  function writeRevealedVideoId(videoId) {
    try {
      if (videoId) {
        root.sessionStorage.setItem(REVEALED_VIDEO_STORAGE_KEY, videoId);
      } else {
        root.sessionStorage.removeItem(REVEALED_VIDEO_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("[Anti-Spoiler for YouTube] Could not save the uncovered video.", error);
    }
  }

  // At script start. Only a reload keeps the uncovered video: any other
  // load (a typed address, a link from another site, coming back from
  // another site) means the user left it.
  function forgetRevealUnlessReloaded() {
    const navigation = root.performance.getEntriesByType("navigation")[0];

    if (readRevealedVideoId() && (!navigation || navigation.type !== "reload")) {
      writeRevealedVideoId(null);
    }
  }

  // A page that shows a video, even before it names it: a channel's /live
  // page learns its stream's id only once the page has loaded.
  function isOnVideoPath() {
    const pathname = new URL(root.location.href).pathname;

    return (
      pathname === "/watch" ||
      pathname.startsWith("/live/") ||
      pathname.startsWith("/shorts/") ||
      shared.CHANNEL_LIVE_PATH_PATTERN.test(pathname)
    );
  }

  function isOpenVideoRevealed(doc) {
    return doc.documentElement.classList.contains(REVEAL_VIDEO_CLASS);
  }

  // Puts the reveal class on <html> while the open video is the uncovered
  // one, and forgets the uncovered video once the user has left it.
  function syncRevealedVideo(settings, doc) {
    const rootElement = doc.documentElement;
    const revealedVideoId = readRevealedVideoId();

    if (!revealedVideoId) {
      rootElement.classList.remove(REVEAL_VIDEO_CLASS);
      return;
    }

    const videoId = getOpenVideoId(doc);

    if ((videoId && videoId !== revealedVideoId) || !isOnVideoPath()) {
      writeRevealedVideoId(null);
      rootElement.classList.remove(REVEAL_VIDEO_CLASS);
      return;
    }

    // While the page has not named its video yet, the id is kept, but
    // nothing is uncovered until it is known to be the same video.
    if (settings.extensionEnabled && videoId === revealedVideoId) {
      rootElement.classList.add(REVEAL_VIDEO_CLASS);
    } else {
      rootElement.classList.remove(REVEAL_VIDEO_CLASS);
    }
  }

  // What the player button and the popup show: { available, revealed }.
  // "available" only says a video is open. Whether protection is on is not
  // asked here: right after the popup switches protection on, this script
  // may still be re-reading the settings, and the popup checks it itself.
  function getRevealState(doc) {
    const available = Boolean(getOpenVideoId(doc));

    return { available, revealed: available && isOpenVideoRevealed(doc) };
  }

  // The player button, the popup button, and the keyboard shortcut all come
  // here. The same action again covers the video again. Does nothing while
  // protection is off.
  function toggleReveal(doc) {
    const state = getRevealState(doc);

    if (state.available && lastKnownSettings.extensionEnabled) {
      if (state.revealed) {
        // Covering a stream again asks how to watch it again.
        liveStartController.forgetChoice(getOpenVideoId(doc));
      }

      writeRevealedVideoId(state.revealed ? null : getOpenVideoId(doc));
      applyAndSync(lastKnownSettings, doc);
      syncRevealButton(doc);
    }

    return getRevealState(doc);
  }

  function syncRevealButton(doc) {
    const button = shared.ensureRevealButton(doc, () => toggleReveal(doc));

    if (button) {
      shared.renderRevealButton(button, getRevealState(doc));
    }
  }

  // Messages from the popup and from the background (the keyboard
  // shortcut). The answer is ready at once, so it is sent synchronously.
  function answerRevealMessage(message, sender, sendResponse) {
    if (message.type === "yas-get-reveal") {
      sendResponse(getRevealState(root.document));
    } else if (message.type === "yas-toggle-reveal") {
      sendResponse(toggleReveal(root.document));
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

    // Before the guards below: they look at the reveal class.
    syncRevealedVideo(normalizeSettings(settings), currentDocument);

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

  // The optional blurs are off by default, so a user who switched them on
  // would see titles and thumbnails until chrome.storage answers. The last
  // read is kept in the page's localStorage to blur at once. It can only
  // add protection: everything else comes from the defaults, so a stale
  // copy can never open spoilers before the real read.
  function readStartupSettings() {
    const settings = normalizeSettings(undefined);
    let lastSettings = null;

    try {
      lastSettings = JSON.parse(root.localStorage.getItem(LAST_SETTINGS_STORAGE_KEY));
    } catch (error) {
      // Blocked site data or a damaged copy: the defaults stand.
      return settings;
    }

    if (lastSettings && lastSettings.hideVideoPreviews === true) {
      settings.hideVideoPreviews = true;
    }

    if (lastSettings && lastSettings.hideVideoTitles === true) {
      settings.hideVideoTitles = true;
    }

    return settings;
  }

  function saveStartupSettings(settings) {
    const normalizedSettings = normalizeSettings(settings);

    try {
      root.localStorage.setItem(
        LAST_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          hideVideoPreviews: normalizedSettings.hideVideoPreviews,
          hideVideoTitles: normalizedSettings.hideVideoTitles,
        }),
      );
    } catch (error) {
      // Blocked site data: the next load waits for chrome.storage, as before.
    }
  }

  // Last settings read from storage. Until the first read answers, the
  // defaults stand in (plus the optional blurs from the last read): protection
  // is on, so a page never renders unprotected while chrome.storage is still
  // busy. A user who turned protection off sees it lift a moment later, which
  // is the safe direction for a spoiler blocker.
  let lastKnownSettings = readStartupSettings();

  function applyAndSync(settings, doc) {
    const currentDocument = doc || root.document;

    lastKnownSettings = applySettings(settings, currentDocument);

    // An uncovered video gets no live guard. The controller sees the live
    // setting off, which also ends a guard that is already up.
    if (isOpenVideoRevealed(currentDocument)) {
      liveStartController.sync(
        Object.assign({}, lastKnownSettings, { startLiveFromBeginning: false }),
        currentDocument,
      );
    } else {
      liveStartController.sync(lastKnownSettings, currentDocument);
    }

    return lastKnownSettings;
  }

  function loadAndApplySettings(doc) {
    if (typeof shared.readSettings !== "function") {
      return Promise.resolve(applyAndSync(undefined, doc));
    }

    return shared
      .readSettings()
      .then((settings) => {
        saveStartupSettings(settings);
        return applyAndSync(settings, doc);
      })
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

  // The language picked in the popup. The popup stores it in storage.local
  // together with its texts; content scripts only read it. Protection never
  // waits for it: until it arrives the in-page controls show the browser
  // language, then only their texts change.
  function loadLanguage(doc) {
    root.chrome.storage.local.get("uiLanguage", (items) => {
      const error = root.chrome.runtime.lastError;

      if (error) {
        console.warn("[Anti-Spoiler for YouTube] Could not load the language.", error.message);
        return;
      }

      showLanguage(items.uiLanguage, doc);
    });
  }

  // uiLanguage is { code, messages }, or undefined for the browser language.
  function showLanguage(uiLanguage, doc) {
    shared.setMessages(uiLanguage ? uiLanguage.messages : null);
    shared.applyTranslations(doc);
    writeMediaTitle(doc);
  }

  // The MAIN-world bridge has no chrome.i18n; it reads the title it shows in
  // the media controls from this attribute.
  function writeMediaTitle(doc) {
    doc.documentElement.dataset.yasMediaTitle = shared.getText("mediaHiddenTitle");
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
      if (areaName === "local" && changes.uiLanguage) {
        showLanguage(changes.uiLanguage.newValue, root.document);
      }

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

    // The reveal button goes after the skip buttons in the player bar.
    const refresh = () => {
      refreshProtection(root.document);
      shared.ensureSkipButtons(root.document);
      syncRevealButton(root.document);
    };

    root.__youtubeAntiSpoilerInitialized = true;

    forgetRevealUnlessReloaded();
    // Coming back from another site with Back can restore this page from the
    // browser's back/forward cache without running the scripts again. That is
    // never a reload, so the user left the uncovered video.
    root.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        writeRevealedVideoId(null);
        refresh();
      }
    });
    bindNavigationRefresh(root, refresh);
    bindStorageChanges();
    root.chrome.runtime.onMessage.addListener(answerRevealMessage);
    observeStyleRemoval(root.document);
    root.document.addEventListener("mouseover", stashHoveredTitleAttribute, true);
    // YouTube rebuilds the player now and then, dropping the skip buttons.
    // The reveal button is redrawn too: protection or the video may have
    // changed meanwhile.
    root.setInterval(() => {
      shared.ensureSkipButtons(root.document);
      syncRevealButton(root.document);
    }, shared.SKIP_BUTTONS_CHECK_MS);
    refresh();
    // Only after protection is in place.
    writeMediaTitle(root.document);
    loadLanguage(root.document);
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
    REVEAL_VIDEO_CLASS,
    REVEALED_VIDEO_STORAGE_KEY,
    LAST_SETTINGS_STORAGE_KEY,
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
    forgetRevealUnlessReloaded,
    getRevealState,
    toggleReveal,
    syncRevealButton,
    answerRevealMessage,
    init,
  };
});
