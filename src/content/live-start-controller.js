(function initLiveStartController(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    require("../shared/settings.js");
    require("../shared/i18n.js");
  }

  const api = factory(root);

  root.YouTubeAntiSpoiler = Object.assign(root.YouTubeAntiSpoiler || {}, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createLiveStartModule(root) {
  // i18n.js is loaded before this file (see manifest.json).
  const { setText } = root.YouTubeAntiSpoiler;
  const LIVE_START_OBSCURED_CLASS = "yas-live-start-obscured";
  const LIVE_GUARD_OVERLAY_ID = "youtube-anti-spoiler-live-guard";
  const LIVE_GUARD_PAUSE_EVENT = "youtube-anti-spoiler-live-guard-pause";
  const LIVE_GUARD_PLAY_EVENT = "youtube-anti-spoiler-live-guard-play";
  const LIVE_GUARD_CONTINUE_EVENT = "youtube-anti-spoiler-live-guard-continue";
  const LIVE_START_SEEK_EVENT = "youtube-anti-spoiler-live-start-seek";
  const LIVE_START_SEEK_RESULT_EVENT = "youtube-anti-spoiler-live-start-seek-result";
  const LIVE_STATE_REQUEST_EVENT = "youtube-anti-spoiler-live-state-request";
  const LIVE_STATE_RESULT_EVENT = "youtube-anti-spoiler-live-state-result";
  const LIVE_START_TIMEOUT_MS = 10000;
  const LIVE_START_POLL_MS = 100;
  const LIVE_GUARD_HEARTBEAT_MS = 1000;
  const LIVE_START_NOT_LIVE_GRACE_MS = 1500;
  const LIVE_START_SEEK_CONFIRM_TIMEOUT_MS = 3000;
  // A jump counts as done from 10 s before the rewind window start to 30 s
  // after it. The player lands up to 4.8 s early (a segment start) or, on
  // 12-hour news windows, up to 23 s late (live check 2026-11-06, 20 jumps).
  const LIVE_START_SEEK_CONFIRM_BEFORE_START_SECONDS = 10;
  const LIVE_START_SEEK_CONFIRM_AFTER_START_SECONDS = 30;
  const LIVE_START_SEEK_FRAME_FALLBACK_MS = 500;
  const LIVE_GUARD_PLAYER_GONE_MS = 3000;
  const LIVE_GUARD_COMPACT_WIDTH_PX = 480;
  const LIVE_GUARD_AD_NOTE_ID = "youtube-anti-spoiler-live-guard-ad-note";
  const LIVE_GUARD_TITLE_ID = "youtube-anti-spoiler-live-guard-title";
  // A jump on a live stream can make YouTube reload the media at the new
  // position: then "seeked" never fires, only "loadeddata"/"canplay" do
  // (live check 2026-11-05).
  const SEEK_DONE_EVENTS = Object.freeze(["seeked", "loadeddata", "canplay"]);
  const PROTECTED_PLAYBACK_EVENTS = Object.freeze([
    "play",
    "playing",
    "loadeddata",
    "volumechange",
  ]);
  const CHANNEL_LIVE_PATH_PATTERN = /^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/live\/?$/;
  const LIVE_BROADCAST_META_SELECTOR = "meta[itemprop=\"isLiveBroadcast\"]";
  const BROADCAST_END_DATE_META_SELECTOR = "meta[itemprop=\"endDate\"]";
  const VIDEO_ID_META_SELECTOR = "meta[itemprop=\"videoId\"]";
  const LIVE_CHAT_SELECTORS = Object.freeze([
    "ytd-live-chat-frame",
    "yt-live-chat-app",
    "#chat iframe[src*=\"/live_chat\"]",
  ]);

  function normalizeSettings(settings) {
    const shared = root.YouTubeAntiSpoiler || {};

    if (typeof shared.normalizeSettings === "function") {
      return shared.normalizeSettings(settings);
    }

    // settings.js owns the canonical defaults; this only guards the
    // mandatory time-hiding invariant if that module ever fails to load.
    return Object.assign({}, settings, { hideTime: true });
  }

  // Temporary diagnostics. Silent unless the page sets localStorage.YAS_DEBUG = "1".
  function debugLog(...args) {
    try {
      if (
        root.localStorage &&
        root.localStorage.getItem("YAS_DEBUG") === "1" &&
        root.console &&
        typeof root.console.log === "function"
      ) {
        root.console.log("[YAS]", ...args);
      }
    } catch (error) {
      // Diagnostics must never break the guard.
    }
  }

  // /@channel/live and the other channel "live" URLs show the stream on a
  // watch page without its id in the address bar; the page itself names it.
  function getChannelLiveVideoId(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    const watchPageVideoId = getAttributeValue(
      doc.querySelector("ytd-watch-flexy:not([hidden])"),
      "video-id",
    );

    if (watchPageVideoId) {
      return watchPageVideoId;
    }

    const canonicalHref = getAttributeValue(
      doc.querySelector("link[rel=\"canonical\"]"),
      "href",
    );

    if (!canonicalHref || !canonicalHref.includes("watch?v=")) {
      return null;
    }

    try {
      return new URL(canonicalHref, "https://www.youtube.com").searchParams.get("v") || null;
    } catch (error) {
      return null;
    }
  }

  function getLiveStartVideoId(win, doc) {
    const currentWindow = win || root;

    if (!currentWindow || !currentWindow.location || !currentWindow.location.href) {
      return null;
    }

    let url;

    try {
      url = new URL(currentWindow.location.href);
    } catch (error) {
      return null;
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || null;
    }

    const liveMatch = url.pathname.match(/^\/live\/([^/?#]+)/);

    if (liveMatch) {
      return decodeURIComponent(liveMatch[1]);
    }

    if (CHANNEL_LIVE_PATH_PATTERN.test(url.pathname)) {
      return getChannelLiveVideoId(doc || currentWindow.document);
    }

    return null;
  }

  function getLiveStartTarget(settings, win, attemptedVideoIds, doc) {
    const normalizedSettings = normalizeSettings(settings);
    const videoId = getLiveStartVideoId(win, doc);
    const attempted = attemptedVideoIds || new Set();

    return {
      shouldAttempt: Boolean(
        normalizedSettings.extensionEnabled &&
        normalizedSettings.startLiveFromBeginning &&
        videoId &&
        !attempted.has(videoId)
      ),
      videoId,
    };
  }

  function getAttributeValue(element, name) {
    if (!element) {
      return null;
    }

    if (typeof element.getAttribute === "function") {
      return element.getAttribute(name);
    }

    return element[name] || null;
  }

  function isTrueLiveMetadataValue(value) {
    return typeof value === "string" && value.trim().toLowerCase() === "true";
  }

  function elementHasClass(element, className) {
    if (!element) {
      return false;
    }

    if (element.classList && typeof element.classList.contains === "function") {
      return element.classList.contains(className);
    }

    return typeof element.className === "string" &&
      element.className.split(/\s+/).includes(className);
  }

  function getDocumentVideoId(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    return getAttributeValue(doc.querySelector(VIDEO_ID_META_SELECTOR), "content");
  }

  function documentHasEndedBroadcastSignal(doc) {
    // Finished broadcasts keep isLiveBroadcast="True" in the microdata but gain
    // an endDate meta. Without this check the guard blocks VOD replays.
    return Boolean(doc.querySelector(BROADCAST_END_DATE_META_SELECTOR));
  }

  function documentHasLiveSignal(doc, videoId) {
    if (!doc || typeof doc.querySelector !== "function") {
      return false;
    }

    const liveBroadcastMeta = doc.querySelector(LIVE_BROADCAST_META_SELECTOR);
    const metadataVideoId = getDocumentVideoId(doc);

    return Boolean(
      videoId &&
      metadataVideoId === videoId &&
      liveBroadcastMeta &&
      isTrueLiveMetadataValue(getAttributeValue(liveBroadcastMeta, "content")) &&
      !documentHasEndedBroadcastSignal(doc)
    );
  }

  function documentHasLiveChatSignal(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return false;
    }

    return LIVE_CHAT_SELECTORS.some((selector) => (
      Boolean(doc.querySelector(selector))
    ));
  }

  function liveStateMatchesVideo(liveState, videoId) {
    return Boolean(
      liveState &&
      videoId &&
      liveState.videoId === videoId
    );
  }

  function documentVideoIdMatches(doc, videoId) {
    return Boolean(videoId && getDocumentVideoId(doc) === videoId);
  }

  function pageWorldSaysCurrentVideoIsLive(liveState, videoId) {
    return Boolean(
      liveStateMatchesVideo(liveState, videoId) &&
      liveState.isLive === true
    );
  }

  function pageWorldSaysCurrentVideoIsNotLive(liveState, videoId) {
    return Boolean(
      liveStateMatchesVideo(liveState, videoId) &&
      liveState.isLive === false
    );
  }

  function isFalseLiveMetadataValue(value) {
    return typeof value === "string" && value.trim().toLowerCase() === "false";
  }

  function documentSaysVideoIsNotLive(doc, videoId) {
    // Require an explicit not-live marker for the *current* video. During an SPA
    // navigation YouTube swaps the videoId metadata to the new live stream
    // before its broadcast/live data hydrates, so the broadcast meta is simply
    // absent for a moment — treating that absence as "not live" is what made the
    // guard give up early and never re-arm without a full page reload.
    if (!documentVideoIdMatches(doc, videoId) || typeof doc.querySelector !== "function") {
      return false;
    }

    const broadcastValue = getAttributeValue(
      doc.querySelector(LIVE_BROADCAST_META_SELECTOR),
      "content",
    );

    return (
      isFalseLiveMetadataValue(broadcastValue) ||
      (isTrueLiveMetadataValue(broadcastValue) && documentHasEndedBroadcastSignal(doc))
    );
  }

  function hasStrongLiveSignal(doc, videoId, liveState) {
    return Boolean(
      pageWorldSaysCurrentVideoIsLive(liveState, videoId) ||
      documentHasLiveSignal(doc, videoId)
    );
  }

  function hasExplicitNotLiveSignal(doc, videoId, liveState) {
    return Boolean(
      pageWorldSaysCurrentVideoIsNotLive(liveState, videoId) ||
      documentSaysVideoIsNotLive(doc, videoId)
    );
  }

  // Weak signals: an unknown duration together with a live-looking player or a
  // chat frame. Replays of finished streams show the same thing while their
  // data loads, so these never outweigh an explicit "not live".
  function hasWeakLiveSignal(doc, video) {
    return Boolean(
      video &&
      !Number.isFinite(video.duration) &&
      (
        elementHasClass(findYouTubePlayer(doc), "ytp-live") ||
        documentHasLiveChatSignal(doc)
      )
    );
  }

  function isLikelyLivePlayback(doc, video, videoId, liveState) {
    if (!video) {
      return false;
    }

    if (hasStrongLiveSignal(doc, videoId, liveState)) {
      return true;
    }

    return hasWeakLiveSignal(doc, video) &&
      !hasExplicitNotLiveSignal(doc, videoId, liveState);
  }

  function isAdShowing(doc) {
    const player = findYouTubePlayer(doc);

    return elementHasClass(player, "ad-showing") ||
      elementHasClass(player, "ad-interrupting");
  }

  // Only the guarded player's own <video>. While YouTube re-creates it there
  // is none for a moment, and that is null — not a hover preview or another
  // player found by a page-wide search, which the guard would then pause,
  // start or seek instead of the stream.
  function findVideoElement(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    return (
      doc.querySelector("#movie_player video.html5-main-video") ||
      doc.querySelector("#movie_player .html5-main-video") ||
      doc.querySelector("#movie_player video")
    );
  }

  function findYouTubePlayer(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    return doc.querySelector("#movie_player");
  }

  function getEarliestSeekableStart(video) {
    if (!video || !video.seekable || video.seekable.length < 1) {
      return null;
    }

    let startTime;

    try {
      startTime = video.seekable.start(0);
    } catch (error) {
      return null;
    }

    if (!Number.isFinite(startTime)) {
      return null;
    }

    return startTime;
  }

  function seekToEarliestSeekablePosition(video) {
    const startTime = getEarliestSeekableStart(video);

    if (startTime === null) {
      return false;
    }

    video.currentTime = startTime;
    return true;
  }

  function getLatestSeekableEnd(video) {
    if (!video || !video.seekable || video.seekable.length < 1) {
      return null;
    }

    let endTime;

    try {
      endTime = video.seekable.end(video.seekable.length - 1);
    } catch (error) {
      return null;
    }

    return Number.isFinite(endTime) ? endTime : null;
  }

  function seekVideoToLiveEdge(video) {
    const endTime = getLatestSeekableEnd(video);

    if (endTime === null) {
      return false;
    }

    try {
      video.currentTime = endTime;
      return true;
    } catch (error) {
      return false;
    }
  }

  function serializeLiveStartSeekDetail(fallbackSeconds, requestId) {
    return JSON.stringify({
      fallbackSeconds: Number.isFinite(fallbackSeconds) ? fallbackSeconds : 0,
      requestId,
    });
  }

  function dispatchMainWorldEvent(win, doc, eventName, detail) {
    const currentWindow = win || root;
    const currentDocument = doc || currentWindow.document;

    if (
      !currentWindow ||
      typeof currentWindow.CustomEvent !== "function" ||
      !currentDocument ||
      typeof currentDocument.dispatchEvent !== "function"
    ) {
      return false;
    }

    try {
      const options = {
        bubbles: true,
        composed: true,
      };

      if (detail !== undefined) {
        options.detail = detail;
      }

      currentDocument.dispatchEvent(new currentWindow.CustomEvent(eventName, options));
      return true;
    } catch (error) {
      return false;
    }
  }

  function requestMainWorldPlayerSeek(win, doc, fallbackSeconds, requestId) {
    return dispatchMainWorldEvent(
      win,
      doc,
      LIVE_START_SEEK_EVENT,
      serializeLiveStartSeekDetail(fallbackSeconds, requestId),
    );
  }

  function requestMainWorldPlayerPause(win, doc) {
    return dispatchMainWorldEvent(win, doc, LIVE_GUARD_PAUSE_EVENT);
  }

  function requestMainWorldPlayerPlay(win, doc) {
    return dispatchMainWorldEvent(win, doc, LIVE_GUARD_PLAY_EVENT);
  }

  function requestMainWorldPlayerContinue(win, doc) {
    return dispatchMainWorldEvent(win, doc, LIVE_GUARD_CONTINUE_EVENT);
  }

  function requestMainWorldLiveState(win, doc, videoId, requestId) {
    return dispatchMainWorldEvent(
      win,
      doc,
      LIVE_STATE_REQUEST_EVENT,
      JSON.stringify({
        requestId,
        videoId,
      }),
    );
  }

  function parseLiveStartSeekResultDetail(detail) {
    if (typeof detail !== "string") {
      return null;
    }

    try {
      return JSON.parse(detail);
    } catch (error) {
      return null;
    }
  }

  function addLiveStartObscuring(doc) {
    if (doc && doc.documentElement && doc.documentElement.classList) {
      doc.documentElement.classList.add(LIVE_START_OBSCURED_CLASS);
    }
  }

  function removeLiveStartObscuring(doc) {
    if (doc && doc.documentElement && doc.documentElement.classList) {
      doc.documentElement.classList.remove(LIVE_START_OBSCURED_CLASS);
    }
  }

  function createLiveStartController(win, options) {
    const currentWindow = win || root;
    const controllerOptions = options || {};
    const attemptedVideoIds = new Set();
    const shieldAttemptedVideoIds = new Set();
    const getNow = controllerOptions.now || (() => Date.now());
    const setTimer = controllerOptions.setTimeout ||
      ((callback, delay) => (
        typeof currentWindow.setTimeout === "function"
          ? currentWindow.setTimeout(callback, delay)
          : null
      ));
    const clearTimer = controllerOptions.clearTimeout ||
      ((timerId) => {
        if (currentWindow.clearTimeout) {
          currentWindow.clearTimeout(timerId);
        }
      });
    let activeGuard = null;
    let nextSeekRequestId = 0;
    let nextLiveStateRequestId = 0;
    let latestLiveState = null;
    let liveStateResultDocument = null;
    let playbackLockDocument = null;
    let pendingSeek = null;
    let lastPlayerVideoId = null;
    let mutedVideo = null;
    let mutedVideoWasMuted = false;
    let overlayTrackingCleanup = null;

    function clearActiveTimer() {
      if (activeGuard && activeGuard.timer) {
        clearTimer(activeGuard.timer);
        activeGuard.timer = null;
      }
    }

    function restoreShieldMute() {
      if (mutedVideo && !mutedVideoWasMuted) {
        try {
          mutedVideo.muted = false;
        } catch (error) {
          // Losing the unmute is better than breaking guard teardown.
        }
      }

      mutedVideo = null;
      mutedVideoWasMuted = false;
    }

    function muteForShield(video) {
      // The shield mutes as soon as a candidate live page is detected: before
      // the pause lands, commentary audio alone can spoil the score. The
      // original muted state is restored on every teardown path.
      if (!video) {
        return;
      }

      // The original state is taken once per element. Muting again keeps it:
      // YouTube can unmute the video through its own API while the guard is
      // up, and that is not the user's choice to restore later.
      if (mutedVideo !== video) {
        restoreShieldMute();
        mutedVideoWasMuted = video.muted === true;
        mutedVideo = video;
      }

      try {
        video.muted = true;
      } catch (error) {
        // Leave it; the next heartbeat or volumechange tries again.
      }
    }

    function getOverlay(doc) {
      if (!doc || typeof doc.getElementById !== "function") {
        return null;
      }

      return doc.getElementById(LIVE_GUARD_OVERLAY_ID);
    }

    function getAdNote(doc) {
      if (!doc || typeof doc.getElementById !== "function") {
        return null;
      }

      return doc.getElementById(LIVE_GUARD_AD_NOTE_ID);
    }

    function findLiveGuardHost(doc) {
      if (!doc) {
        return null;
      }

      // Mount on <body> so the overlay sits above YouTube's player stacking
      // contexts (a child of #movie_player gets hidden behind the player's own
      // layers). Position is tracked to the player via document coordinates.
      // In fullscreen only the fullscreen element's subtree is drawn, so the
      // overlay has to move inside it.
      const candidates = [
        doc.fullscreenElement,
        doc.body,
        typeof doc.querySelector === "function" ? doc.querySelector("#movie_player") : null,
        typeof doc.querySelector === "function" ? doc.querySelector("ytd-player") : null,
        typeof doc.querySelector === "function" ? doc.querySelector("#player-container") : null,
      ];

      return candidates.find((candidate) => (
        candidate && typeof candidate.appendChild === "function"
      )) || null;
    }

    function findLiveGuardBoundsTarget(doc) {
      if (!doc || typeof doc.querySelector !== "function") {
        return null;
      }

      const candidates = [
        doc.querySelector("#movie_player"),
        doc.querySelector("ytd-player"),
        doc.querySelector("#player-container"),
        findVideoElement(doc),
      ];

      // A collapsed (0×0) element cannot hold the panel; try the next one.
      return candidates.find((candidate) => {
        if (!candidate || typeof candidate.getBoundingClientRect !== "function") {
          return false;
        }

        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || null;
    }

    function getScrollOffset(axis) {
      const scrollValue = axis === "x"
        ? currentWindow.scrollX
        : currentWindow.scrollY;

      if (Number.isFinite(scrollValue)) {
        return scrollValue;
      }

      const pageOffset = axis === "x"
        ? currentWindow.pageXOffset
        : currentWindow.pageYOffset;

      return Number.isFinite(pageOffset) ? pageOffset : 0;
    }

    function applyLiveGuardBounds(doc, overlay) {
      const fullscreenElement = doc && doc.fullscreenElement;
      const boundsTarget = fullscreenElement || findLiveGuardBoundsTarget(doc);

      if (!overlay || !overlay.style || !boundsTarget) {
        return false;
      }

      let rect;

      try {
        rect = boundsTarget.getBoundingClientRect();
      } catch (error) {
        return false;
      }

      if (
        !rect ||
        !Number.isFinite(rect.left) ||
        !Number.isFinite(rect.top) ||
        !Number.isFinite(rect.width) ||
        !Number.isFinite(rect.height) ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return false;
      }

      if (fullscreenElement) {
        // Mounted inside the fullscreen element, which is its containing block:
        // cover it from its own corner.
        overlay.style.left = "0px";
        overlay.style.top = "0px";
      } else {
        // Document coordinates (viewport rect + scroll) so an absolutely
        // positioned overlay scrolls together with the player instead of floating.
        overlay.style.left = `${rect.left + getScrollOffset("x")}px`;
        overlay.style.top = `${rect.top + getScrollOffset("y")}px`;
      }

      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      return true;
    }

    // Moves the element into the current host (fullscreen element or <body>)
    // and lines it up with the player again.
    function placeLiveGuardElement(doc, element) {
      const host = findLiveGuardHost(doc);

      if (host && element.parentNode !== host) {
        host.appendChild(element);
      }

      return applyLiveGuardBounds(doc, element);
    }

    function bindOverlayTracking(doc) {
      // The heartbeat alone re-positions at most once a second, which visibly
      // detaches the overlay from the player on resize, theater-mode toggles,
      // and fullscreen. React to those immediately; the heartbeat stays as the
      // safety net for anything these signals miss.
      if (overlayTrackingCleanup) {
        return;
      }

      const reposition = () => {
        [getOverlay(doc), getAdNote(doc)].forEach((element) => {
          if (element) {
            placeLiveGuardElement(doc, element);
          }
        });
      };
      const cleanups = [];

      if (
        typeof currentWindow.addEventListener === "function" &&
        typeof currentWindow.removeEventListener === "function"
      ) {
        currentWindow.addEventListener("resize", reposition, true);
        cleanups.push(() => currentWindow.removeEventListener("resize", reposition, true));
      }

      if (
        doc &&
        typeof doc.addEventListener === "function" &&
        typeof doc.removeEventListener === "function"
      ) {
        doc.addEventListener("fullscreenchange", reposition, true);
        cleanups.push(() => doc.removeEventListener("fullscreenchange", reposition, true));
      }

      if (typeof currentWindow.ResizeObserver === "function") {
        const boundsTarget = findLiveGuardBoundsTarget(doc);

        if (boundsTarget) {
          try {
            const observer = new currentWindow.ResizeObserver(reposition);
            observer.observe(boundsTarget);
            cleanups.push(() => observer.disconnect());
          } catch (error) {
            // Fall back to the event listeners and heartbeat.
          }
        }
      }

      overlayTrackingCleanup = () => {
        cleanups.forEach((cleanup) => {
          try {
            cleanup();
          } catch (error) {
          }
        });
      };
    }

    function clearOverlayTracking() {
      if (overlayTrackingCleanup) {
        overlayTrackingCleanup();
        overlayTrackingCleanup = null;
      }
    }

    function parseLiveStateResult(detail) {
      const parsedDetail = parseLiveStartSeekResultDetail(detail);

      // isLive null and videoId null are valid answers: "nothing known yet".
      if (
        !parsedDetail ||
        (typeof parsedDetail.videoId !== "string" && parsedDetail.videoId !== null) ||
        (typeof parsedDetail.isLive !== "boolean" && parsedDetail.isLive !== null)
      ) {
        return null;
      }

      return parsedDetail;
    }

    function bindLiveStateResult(doc) {
      if (
        !doc ||
        liveStateResultDocument === doc ||
        typeof doc.addEventListener !== "function"
      ) {
        return;
      }

      if (
        liveStateResultDocument &&
        typeof liveStateResultDocument.removeEventListener === "function"
      ) {
        liveStateResultDocument.removeEventListener(
          LIVE_STATE_RESULT_EVENT,
          handleLiveStateResult,
        );
      }

      doc.addEventListener(LIVE_STATE_RESULT_EVENT, handleLiveStateResult, true);
      liveStateResultDocument = doc;
    }

    function handleLiveStateResult(event) {
      const liveState = parseLiveStateResult(event && event.detail);

      if (!activeGuard || !liveState) {
        return;
      }

      activeGuard.playerVideoId = liveState.videoId;

      if (liveState.videoId === activeGuard.videoId) {
        activeGuard.playerSeenAt = getNow();
        latestLiveState = liveState;
      } else {
        // The player holds another video now (or has not loaded this one yet):
        // an older snapshot no longer describes what is on screen.
        latestLiveState = null;
      }
    }

    function requestLatestLiveState(doc) {
      if (!activeGuard) {
        return;
      }

      bindLiveStateResult(doc);
      nextLiveStateRequestId += 1;
      requestMainWorldLiveState(
        currentWindow,
        doc,
        activeGuard.videoId,
        nextLiveStateRequestId,
      );
    }

    function removeLiveGuardOverlay(doc) {
      const overlay = getOverlay(doc);

      if (overlay && typeof overlay.remove === "function") {
        overlay.remove();
      }
    }

    function removeAdNote(doc) {
      const note = getAdNote(doc);

      if (note && typeof note.remove === "function") {
        note.remove();
      }
    }

    function pauseVideo(video) {
      if (!video || typeof video.pause !== "function") {
        return;
      }

      try {
        video.pause();
      } catch (error) {
        // Some YouTube player states reject media controls while loading.
      }
    }

    function playVideo(video) {
      if (!video || typeof video.play !== "function") {
        return;
      }

      try {
        const result = video.play();

        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      } catch (error) {
        // User intent is clear; if YouTube blocks play, leave controls usable.
      }
    }

    // Pauses for the guard and remembers whether the video was playing: only
    // a pause the guard set itself is ever undone (for an ad, or to let the
    // stream load). A video the user paused stays paused.
    function pauseForGuard(video) {
      if (!video.paused) {
        activeGuard.pausedByGuard = true;
      }

      pauseVideo(video);
    }

    function releaseGuardPause(doc, video) {
      activeGuard.pauseRequested = false;

      if (activeGuard.pausedByGuard) {
        activeGuard.pausedByGuard = false;
        playVideo(video);
        requestMainWorldPlayerPlay(currentWindow, doc);
      }
    }

    // Media events do not bubble, so the lock listens on the document in the
    // capture phase. That also covers a <video> YouTube creates after the guard
    // armed, which would otherwise play with sound until the next heartbeat.
    // Only the guarded player counts: hover previews and other players are not
    // touched.
    function handleProtectedPlayback(event) {
      const video = event && event.target;
      const player = findYouTubePlayer(playbackLockDocument);

      if (!activeGuard || !video || !player || !player.contains(video)) {
        return;
      }

      if (event.type === "volumechange") {
        // YouTube can unmute the stream through its own API while the guard
        // is up. Only the element the shield holds is muted again: when the
        // shield lets go of an element it gives back its sound itself, and
        // that must not be undone here.
        if (activeGuard.shielded && video === mutedVideo && !video.muted) {
          muteForShield(video);
        }

        return;
      }

      if (activeGuard.shielded) {
        muteForShield(video);
      }

      // An ad must keep playing, or it never ends. A stream whose rewind
      // window is still unknown must keep playing too, or it never loads one.
      if (
        activeGuard.engaged &&
        !isAdShowing(playbackLockDocument) &&
        getRewindState(video) !== "checking"
      ) {
        pauseForGuard(video);
        requestMainWorldPlayerPause(currentWindow, playbackLockDocument);
      }

      // A <video> YouTube swapped in during a jump reports here first.
      if (pendingSeek) {
        pendingSeek.check();
      }
    }

    function bindPlaybackLock(doc) {
      if (playbackLockDocument === doc || typeof doc.addEventListener !== "function") {
        return;
      }

      clearPlaybackLock();
      PROTECTED_PLAYBACK_EVENTS.forEach((eventName) => {
        doc.addEventListener(eventName, handleProtectedPlayback, true);
      });
      playbackLockDocument = doc;
    }

    function clearPlaybackLock() {
      if (!playbackLockDocument) {
        return;
      }

      PROTECTED_PLAYBACK_EVENTS.forEach((eventName) => {
        playbackLockDocument.removeEventListener(eventName, handleProtectedPlayback, true);
      });
      playbackLockDocument = null;
    }

    function appendTextElement(doc, parent, tagName, className, textKey) {
      const element = doc.createElement(tagName);
      element.className = className;
      setText(element, textKey);
      parent.appendChild(element);
      return element;
    }

    function appendActionButton(doc, parent, action, textKey, handler) {
      const button = doc.createElement("button");
      button.type = "button";
      button.dataset.liveGuardAction = action;
      setText(button, textKey);
      button.addEventListener("click", (event) => {
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }

        handler();
      });
      parent.appendChild(button);
      return button;
    }

    // resumeMode: "none" leaves the player paused, "play" resumes in place, and
    // "live" jumps to the live edge first (the guard pauses near the DVR start, so
    // a plain resume would replay the stream from the beginning).
    function dismissGuard(doc, markAttempted, resumeMode) {
      const video = findVideoElement(doc);

      cancelPendingSeek();
      clearPlaybackLock();
      clearOverlayTracking();
      restoreShieldMute();

      if (activeGuard) {
        if (markAttempted && activeGuard.videoId) {
          attemptedVideoIds.add(activeGuard.videoId);
        }

        clearActiveTimer();
        activeGuard = null;
      }

      removeLiveGuardOverlay(doc);
      removeAdNote(doc);
      removeLiveStartObscuring(doc);

      if (resumeMode === "live") {
        seekVideoToLiveEdge(video);
        requestMainWorldPlayerContinue(currentWindow, doc);
        playVideo(video);
      } else if (resumeMode === "play") {
        playVideo(video);
        requestMainWorldPlayerPlay(currentWindow, doc);
      }
    }

    // The overlay can stay on screen for a moment after an ad starts (the next
    // tick swaps it for the ad note). A click then is not a choice: it would
    // apply to the ad and leave the stream unprotected once the ad ends.
    function choiceBlockedByAd(doc) {
      if (!isAdShowing(doc)) {
        return false;
      }

      runTick(doc);
      return true;
    }

    function continueLive(doc) {
      if (!choiceBlockedByAd(doc)) {
        dismissGuard(doc, true, "live");
      }
    }

    function playFromCurrentPosition(doc) {
      if (!choiceBlockedByAd(doc)) {
        dismissGuard(doc, true, "play");
      }
    }

    function cancelPendingSeek() {
      if (!pendingSeek) {
        return;
      }

      clearTimer(pendingSeek.timer);
      clearTimer(pendingSeek.frameTimer);
      SEEK_DONE_EVENTS.forEach((eventName) => {
        pendingSeek.video.removeEventListener(eventName, pendingSeek.handleSeeked);
      });
      pendingSeek = null;
    }

    // The jump did not happen: protection stays, the overlay says so, and
    // both buttons are usable again. No choice is recorded.
    function failPendingSeek(doc) {
      cancelPendingSeek();
      activeGuard.seekFailed = true;
      refreshLiveGuardOverlay(doc);
    }

    // Protection stays up until the jump is visibly done: while the DVR segment
    // loads, the paused player keeps showing the current live frame. The
    // bridge's seek reply only says the request went through, so it is not
    // proof. Done means: "seeked" fired, the video sits near the start, and one
    // more frame has been drawn.
    function startFromBeginning(doc) {
      if (choiceBlockedByAd(doc)) {
        return;
      }

      // The bridge answers at once. A fresh answer has the same rewind window
      // that the bridge's seek below goes to: the player moves the window
      // start in steps of about 10 s.
      requestLatestLiveState(doc);

      const video = findVideoElement(doc);

      // The button is disabled until there is a DVR window to jump into.
      if (getRewindState(video) !== "available") {
        return;
      }

      const startTime = getJumpStartTime(video);
      const seek = {
        check: null,
        confirming: null,
        handleSeeked: null,
        timer: null,
        frameTimer: null,
        video,
      };

      cancelPendingSeek();
      activeGuard.seekFailed = false;
      pendingSeek = seek;

      // readyState >= 2: the frame at the current position is loaded. The
      // live moment is a whole rewind window after the start, so a jump that
      // lands there never passes.
      const reachedStart = (media) => (
        !media.seeking &&
        media.readyState >= 2 &&
        media.currentTime >= startTime - LIVE_START_SEEK_CONFIRM_BEFORE_START_SECONDS &&
        media.currentTime <= startTime + LIVE_START_SEEK_CONFIRM_AFTER_START_SECONDS
      );

      // The jump is judged on whatever <video> the player holds now: on a live
      // stream YouTube completes it by swapping in a new element already at
      // the start (live check 2026-11-05). A new element anywhere else — the
      // live moment — never passes reachedStart, so it is never started.
      const confirmSeek = (media) => {
        if (pendingSeek !== seek || findVideoElement(doc) !== media) {
          return;
        }

        // An ad started meanwhile: the ad phase drops this jump, and no
        // choice is recorded.
        if (choiceBlockedByAd(doc)) {
          return;
        }

        if (reachedStart(media)) {
          dismissGuard(doc, true, "play");
        }
      };

      seek.check = () => {
        const media = findVideoElement(doc);

        if (pendingSeek !== seek || seek.confirming === media || !media || !reachedStart(media)) {
          return;
        }

        // Wait for one more drawn frame before revealing anything.
        seek.confirming = media;

        if (typeof media.requestVideoFrameCallback !== "function") {
          currentWindow.requestAnimationFrame(() => confirmSeek(media));
          return;
        }

        media.requestVideoFrameCallback(() => confirmSeek(media));
        // A paused <video> may not present a new frame until it plays, so the
        // frame callback can stay silent; then being loaded at the start is
        // proof enough, or "Start from beginning" would never finish.
        clearTimer(seek.frameTimer);
        seek.frameTimer = setTimer(() => confirmSeek(media), LIVE_START_SEEK_FRAME_FALLBACK_MS);
      };
      seek.handleSeeked = seek.check;

      seek.timer = setTimer(() => {
        if (pendingSeek === seek) {
          failPendingSeek(doc);
        }
      }, LIVE_START_SEEK_CONFIRM_TIMEOUT_MS);

      SEEK_DONE_EVENTS.forEach((eventName) => {
        video.addEventListener(eventName, seek.handleSeeked);
      });
      nextSeekRequestId += 1;
      requestMainWorldPlayerSeek(currentWindow, doc, startTime, nextSeekRequestId);

      try {
        video.currentTime = startTime;
      } catch (error) {
        // If YouTube blocks direct media seeking, the main-world request still ran.
      }

      refreshLiveGuardOverlay(doc);
    }

    // Where "Start from beginning" goes, in <video> seconds. On a stream
    // longer than the player's rewind window, <video>.seekable still starts
    // at 0, but the player only goes back to its own window start (live
    // check 2026-11-06, Sky News: the jump landed at 3607, not near 0). The
    // bridge reports that start; without it, the media's own start counts.
    function getJumpStartTime(video) {
      if (
        latestLiveState &&
        latestLiveState.videoId === activeGuard.videoId &&
        Number.isFinite(latestLiveState.rewindStart)
      ) {
        return latestLiveState.rewindStart;
      }

      return getEarliestSeekableStart(video);
    }

    // "available": there is a DVR window to jump into. "checking": the window
    // is not known yet; the stream is loading it (an empty seekable range
    // also means no metadata yet). "unavailable": the stream has been given
    // LIVE_START_TIMEOUT_MS to load, and there is still nothing to rewind to.
    function getRewindState(video) {
      const startTime = getEarliestSeekableStart(video);
      const endTime = getLatestSeekableEnd(video);

      // No <video> (YouTube is re-creating it) loads nothing: the wait starts
      // with the element that does.
      if (!video) {
        activeGuard.noRewindSince = null;
        return "checking";
      }

      // The player knows better than the media element: when the streamer has
      // turned rewinding off, <video> still reports a large seekable range
      // (live check 2026-11-05: allowSeeking false, seekable 0–8533306).
      const playerState =
        latestLiveState && latestLiveState.videoId === activeGuard.videoId
          ? latestLiveState
          : null;

      if (playerState && playerState.canRewind === false) {
        activeGuard.noRewindSince = null;
        return "unavailable";
      }

      // <video>.seekable shows up before YouTube has moved the stream to its
      // live position; a jump made then is undone by that move (live check
      // 2026-11-05). So once the bridge answers, wait until the player itself
      // knows its rewind window and the media has settled.
      const playerNotReady =
        playerState !== null &&
        (playerState.canRewind !== true || video.readyState < 1 || video.seeking);

      if (
        !playerNotReady &&
        startTime !== null &&
        (endTime === null || endTime > startTime)
      ) {
        activeGuard.noRewindSince = null;
        return "available";
      }

      if (activeGuard.noRewindSince === null) {
        activeGuard.noRewindSince = getNow();
      }

      return getNow() - activeGuard.noRewindSince >= LIVE_START_TIMEOUT_MS
        ? "unavailable"
        : "checking";
    }

    function refreshLiveGuardOverlay(doc) {
      const overlay = getOverlay(doc);

      if (overlay) {
        updateLiveGuardOverlay(overlay, findVideoElement(doc));
      }
    }

    // Brings the existing overlay in line with the current state without
    // re-creating it: DVR availability, the failed-jump message, compact size.
    function updateLiveGuardOverlay(overlay, video) {
      const startButton = overlay.querySelector("[data-live-guard-action=\"start\"]");
      const copy = overlay.querySelector(".yas-live-guard-copy");
      const status = overlay.querySelector(".yas-live-guard-status");
      const rewindState = getRewindState(video);
      let statusKey = "";

      if (rewindState === "checking") {
        statusKey = "liveGuardChecking";
      } else if (rewindState === "unavailable") {
        statusKey = "liveGuardCannotRewind";
      } else if (activeGuard.seekFailed) {
        statusKey = "liveGuardJumpFailed";
      }

      startButton.hidden = rewindState === "unavailable";
      startButton.disabled = rewindState !== "available";
      startButton.style.opacity = startButton.disabled ? "0.5" : "";

      // Set with its key on every update, so a language change shows the
      // text of the current state, not of an earlier one.
      if (statusKey) {
        setText(status, statusKey);
      } else {
        status.textContent = "";
        delete status.dataset.yasI18n;
      }

      status.hidden = !statusKey;
      // The mini-player is too small for the explanation; title and buttons stay.
      copy.hidden = parseFloat(overlay.style.width) < LIVE_GUARD_COMPACT_WIDTH_PX;
    }

    function renderLiveGuardOverlay(doc) {
      if (
        !doc ||
        typeof doc.createElement !== "function" ||
        getOverlay(doc)
      ) {
        return null;
      }

      const host = findLiveGuardHost(doc);
      debugLog("renderOverlay: host =", host && (host.id || host.tagName || "?"));

      if (!host || typeof host.appendChild !== "function") {
        debugLog("renderOverlay: NO HOST — buttons cannot mount");
        return null;
      }

      const overlay = doc.createElement("div");
      overlay.id = LIVE_GUARD_OVERLAY_ID;
      overlay.className = "yas-live-guard-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      // Named by its visible title. A translated aria-label would come with
      // a title attribute (setLabel), whose tooltip would cover the player.
      overlay.setAttribute("aria-labelledby", LIVE_GUARD_TITLE_ID);

      if (!applyLiveGuardBounds(doc, overlay)) {
        debugLog("renderOverlay: player bounds not ready — will retry");
        return null;
      }

      const panel = doc.createElement("div");
      panel.className = "yas-live-guard-panel";
      overlay.appendChild(panel);

      const title = appendTextElement(doc, panel, "p", "yas-live-guard-title", "liveGuardTitle");
      title.id = LIVE_GUARD_TITLE_ID;
      appendTextElement(
        doc,
        panel,
        "p",
        "yas-live-guard-copy",
        activeGuard.statusUnknown ? "liveGuardUnknownStatus" : "liveGuardPaused",
      );

      // Its text comes from updateLiveGuardOverlay.
      const status = doc.createElement("p");
      status.className = "yas-live-guard-copy yas-live-guard-status";
      status.hidden = true;
      panel.appendChild(status);

      const actions = doc.createElement("div");
      actions.className = "yas-live-guard-actions";
      panel.appendChild(actions);

      appendActionButton(doc, actions, "start", "liveGuardStartButton", () => {
        startFromBeginning(doc);
      });

      if (activeGuard.statusUnknown) {
        // Resume where the video is: there may be no live edge to jump to.
        appendActionButton(doc, actions, "play", "liveGuardPlayButton", () => {
          playFromCurrentPosition(doc);
        });
      } else {
        appendActionButton(doc, actions, "continue", "liveGuardContinueButton", () => {
          continueLive(doc);
        });
      }

      host.appendChild(overlay);
      debugLog("renderOverlay: appended; present after =", Boolean(getOverlay(doc)));
      return overlay;
    }

    // During an ad the panel would cover "Skip ad", so a small click-through
    // note takes its place. Inline styles keep it independent of the panel CSS.
    function renderAdNote(doc) {
      const host = findLiveGuardHost(doc);

      if (!host) {
        return null;
      }

      const note = doc.createElement("div");
      note.id = LIVE_GUARD_AD_NOTE_ID;
      Object.assign(note.style, {
        position: "absolute",
        zIndex: "2147483647",
        boxSizing: "border-box",
        padding: "12px",
        pointerEvents: "none",
      });

      if (!applyLiveGuardBounds(doc, note)) {
        return null;
      }

      const label = doc.createElement("span");
      setText(label, "liveGuardAdNote");
      Object.assign(label.style, {
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "4px",
        background: "rgba(15, 15, 15, 0.82)",
        color: "#f8f8f8",
        font: "500 13px Roboto, Arial, sans-serif",
      });
      note.appendChild(label);
      host.appendChild(note);
      return note;
    }

    function holdGuardDuringAd(doc, video) {
      if (!activeGuard.adShowing) {
        activeGuard.adShowing = true;
        cancelPendingSeek();
        removeLiveGuardOverlay(doc);
        // The stream gets its full time to load the rewind window after the ad.
        activeGuard.noRewindSince = null;
        // A paused ad never ends.
        releaseGuardPause(doc, video);
      }

      if (!getAdNote(doc)) {
        renderAdNote(doc);
      }

      const note = getAdNote(doc);

      if (note) {
        placeLiveGuardElement(doc, note);
        bindOverlayTracking(doc);
      }

      activeGuard.guarded = Boolean(note);
    }

    function holdGuard(doc, video) {
      addLiveStartObscuring(doc);
      activeGuard.shielded = true;
      muteForShield(video);

      if (isAdShowing(doc)) {
        holdGuardDuringAd(doc, video);
        return;
      }

      if (activeGuard.adShowing) {
        activeGuard.adShowing = false;
        removeAdNote(doc);
      }

      // A pending jump is judged on the <video> the player holds now (YouTube
      // may have swapped in a new one already at the start).
      if (pendingSeek) {
        pendingSeek.check();
      }

      // A paused live player never loads the stream, so its rewind window
      // stays unknown and "Start from beginning" never becomes usable. Until
      // the window is known the stream plays, muted and invisible under the
      // guard's CSS; then it is paused. Without a <video> (YouTube is
      // re-creating it) there is nothing to pause or play yet.
      activeGuard.loading = getRewindState(video) === "checking";

      if (video && activeGuard.loading) {
        releaseGuardPause(doc, video);
      } else if (video) {
        // Re-assert on every heartbeat: a YouTube SPA re-render can swap the
        // <video>, drop our protection class, or quietly resume playback.
        pauseForGuard(video);

        if (!activeGuard.pauseRequested) {
          activeGuard.pauseRequested = true;
          requestMainWorldPlayerPause(currentWindow, doc);
        }
      }

      // (Re-)mount the overlay whenever it is missing. The buttons live in a
      // <body> node that a watch-page re-render can detach, which would leave
      // the stream paused and blurred with no way to act on it.
      if (!getOverlay(doc)) {
        renderLiveGuardOverlay(doc);
      }

      // Re-place the overlay on every heartbeat so it follows theater mode,
      // fullscreen, the mini-player, window resizes, and layout shifts (scroll
      // is handled by the document-coordinate positioning itself).
      const overlay = getOverlay(doc);

      if (overlay) {
        placeLiveGuardElement(doc, overlay);
        updateLiveGuardOverlay(overlay, video);
        bindOverlayTracking(doc);
      }

      activeGuard.guarded = Boolean(overlay);
      debugLog(
        "holdGuard: guarded =", activeGuard.guarded,
        "size =", overlay && overlay.style && `${overlay.style.width}x${overlay.style.height}`,
      );
    }

    function cancel(doc, markAttempted) {
      dismissGuard(doc, markAttempted, "none");
    }

    function scheduleTick(doc, delay) {
      if (!activeGuard) {
        return;
      }

      clearActiveTimer();
      activeGuard.timer = setTimer(() => {
        if (activeGuard) {
          activeGuard.timer = null;
        }

        runTick(doc);
      }, delay || LIVE_START_POLL_MS);
    }

    // Off the watch page the guard follows the player (mini-player) until it
    // closes or shows another video. Closed means: no #movie_player, or the
    // bridge has not named this video for a while.
    function playerLeftGuardedVideo(doc, now) {
      return Boolean(
        !findYouTubePlayer(doc) ||
        (activeGuard.playerVideoId && activeGuard.playerVideoId !== activeGuard.videoId) ||
        now - activeGuard.playerSeenAt >= LIVE_GUARD_PLAYER_GONE_MS
      );
    }

    function runTick(doc) {
      if (!activeGuard) {
        return;
      }

      const now = getNow();
      const pageVideoId = getLiveStartVideoId(currentWindow, doc);

      if (pageVideoId && pageVideoId !== activeGuard.videoId) {
        cancel(doc, false);
        return;
      }

      requestLatestLiveState(doc);

      if (pageVideoId) {
        activeGuard.playerSeenAt = now;
      } else if (playerLeftGuardedVideo(doc, now)) {
        cancel(doc, false);
        return;
      }

      const video = findVideoElement(doc);
      const videoId = activeGuard.videoId;
      const elapsed = now - activeGuard.startedAt;
      const liveNow = hasStrongLiveSignal(doc, videoId, latestLiveState);
      const notLive = !liveNow && hasExplicitNotLiveSignal(doc, videoId, latestLiveState);
      const looksLive = !notLive && hasWeakLiveSignal(doc, video);
      debugLog(
        "tick: hasVideo =", Boolean(video),
        "liveNow =", liveNow,
        "notLive =", notLive,
        "looksLive =", looksLive,
        "engaged =", activeGuard.engaged,
      );

      if (!activeGuard.engaged && video) {
        if (liveNow || (looksLive && elapsed >= LIVE_START_NOT_LIVE_GRACE_MS)) {
          activeGuard.engaged = true;
        } else if (!notLive && elapsed >= LIVE_START_TIMEOUT_MS) {
          // Still unknown after the timeout: ask instead of guessing. Giving up
          // here would play a slow-to-load stream's current moment.
          activeGuard.engaged = true;
          activeGuard.statusUnknown = true;
        }
      }

      // Once engaged, only the user's choice, turning protection off, or the
      // player leaving this video ends the guard. A later "not live" (the stream
      // just ended) must not lift it — that would reveal the finale — and
      // neither does a <video> YouTube is re-creating.
      if (activeGuard.engaged) {
        holdGuard(doc, video);
        // Poll quickly until the overlay actually mounts (player bounds may not
        // be ready yet on SPA navigation), during an ad, so the buttons come
        // back as soon as it ends, and while the stream loads, so it is paused
        // as soon as the rewind window is known; otherwise a slow heartbeat.
        scheduleTick(
          doc,
          activeGuard.guarded && !activeGuard.adShowing && !activeGuard.loading
            ? LIVE_GUARD_HEARTBEAT_MS
            : LIVE_START_POLL_MS,
        );
        return;
      }

      // Not decided yet. The eager shield (blur + mute) stays up while status
      // is unknown, and weak live signals raise it; a positive "not live" for
      // this video drops it, so regular videos unblur quickly.
      if (notLive) {
        if (activeGuard.shielded) {
          activeGuard.shielded = false;
          removeLiveStartObscuring(doc);
          restoreShieldMute();
        }

        // Give up once the video also reports a regular, finite duration after
        // the grace window (or at the timeout). Give-up paths never mark the
        // video as attempted: only an explicit user choice does, so a premature
        // give-up during an SPA transition cannot block a later re-arm.
        if (
          elapsed >= LIVE_START_TIMEOUT_MS ||
          (
            video &&
            Number.isFinite(video.duration) &&
            elapsed >= LIVE_START_NOT_LIVE_GRACE_MS
          )
        ) {
          cancel(doc, false);
          return;
        }
      } else if (activeGuard.shielded || looksLive) {
        activeGuard.shielded = true;
        addLiveStartObscuring(doc);
        muteForShield(video);
      }

      // Past the timeout without a <video> there is nothing to decide yet;
      // keep watching, but slowly.
      scheduleTick(
        doc,
        elapsed >= LIVE_START_TIMEOUT_MS ? LIVE_GUARD_HEARTBEAT_MS : LIVE_START_POLL_MS,
      );
    }

    function sync(settings, doc) {
      const currentDocument = doc || currentWindow.document;
      const normalizedSettings = normalizeSettings(settings);
      const pageVideoId = getLiveStartVideoId(currentWindow, currentDocument);

      if (pageVideoId && pageVideoId !== lastPlayerVideoId) {
        // Choices hold while the player stays on one video: re-renders,
        // repeated SPA events, the mini-player. Another video resets them, so
        // coming back to a stream asks again instead of opening at the live edge.
        lastPlayerVideoId = pageVideoId;
        attemptedVideoIds.clear();
        shieldAttemptedVideoIds.clear();
      }

      const target = getLiveStartTarget(
        normalizedSettings,
        currentWindow,
        attemptedVideoIds,
        currentDocument,
      );
      debugLog("sync: videoId =", target.videoId, "shouldAttempt =", target.shouldAttempt);

      if (!normalizedSettings.extensionEnabled || !normalizedSettings.startLiveFromBeginning) {
        cancel(currentDocument, false);
        return;
      }

      if (!target.videoId) {
        // Off the watch page. A choice holds only while its stream keeps
        // playing in the mini-player. Once the mini-player is closed or the
        // stream stopped, opening it again asks again.
        const video = findVideoElement(currentDocument);

        if (!activeGuard && (!video || video.paused)) {
          lastPlayerVideoId = null;
          attemptedVideoIds.clear();
        }

        // An undecided guard follows the player into the mini-player; runTick
        // ends it once the player closes or moves on.
        runTick(currentDocument);
        return;
      }

      if (!target.shouldAttempt) {
        cancel(currentDocument, false);
        return;
      }

      if (activeGuard && activeGuard.videoId === target.videoId) {
        runTick(currentDocument);
        return;
      }

      cancel(currentDocument, false);
      // Shield immediately, but only on the first attempt per video: until the
      // live status is known, the current live moment (score, commentary audio)
      // must not leak. Later re-arms (storage changes, stray SPA events after a
      // give-up) skip the eager shield so an already-resolved regular video
      // does not flash blurred again; a real live stream still gets the full
      // guard from its positive live signal.
      const firstShieldAttempt = !shieldAttemptedVideoIds.has(target.videoId);
      shieldAttemptedVideoIds.add(target.videoId);
      activeGuard = {
        videoId: target.videoId,
        startedAt: getNow(),
        playerSeenAt: getNow(),
        playerVideoId: null,
        engaged: false,
        statusUnknown: false,
        guarded: false,
        adShowing: false,
        // The stream plays (muted, invisible) to load its rewind window.
        loading: false,
        pauseRequested: false,
        // The guard stopped a playing video and has not resumed it since.
        pausedByGuard: false,
        shielded: firstShieldAttempt,
        noRewindSince: null,
        seekFailed: false,
        timer: null,
      };
      latestLiveState = null;

      if (firstShieldAttempt) {
        addLiveStartObscuring(currentDocument);
      }

      bindPlaybackLock(currentDocument);
      runTick(currentDocument);
    }

    // "Hide spoilers again" on a stream: the owner wants the choice every
    // time (2026-11-06), so an earlier Start from beginning / Continue live
    // for this video no longer counts. The next sync arms the guard again.
    function forgetChoice(videoId) {
      attemptedVideoIds.delete(videoId);
      shieldAttemptedVideoIds.delete(videoId);
    }

    return {
      sync,
      cancel,
      forgetChoice,
      getAttemptedVideoIds() {
        return new Set(attemptedVideoIds);
      },
      // For the chat guard: the page-world player data says this video is not
      // live (the DOM microdata it also checks is not refreshed on SPA moves).
      isKnownNotLive(videoId) {
        return pageWorldSaysCurrentVideoIsNotLive(latestLiveState, videoId);
      },
      // For the chat guard: the live guard for this video is up and waiting for
      // the user's choice (overlay or ad note shown, playback held).
      isWaitingForChoice(videoId) {
        return Boolean(
          activeGuard &&
          activeGuard.engaged &&
          activeGuard.videoId === videoId
        );
      },
    };
  }

  debugLog("live-start-controller.js loaded");

  return {
    LIVE_START_OBSCURED_CLASS,
    LIVE_GUARD_OVERLAY_ID,
    LIVE_GUARD_PAUSE_EVENT,
    LIVE_GUARD_PLAY_EVENT,
    LIVE_GUARD_CONTINUE_EVENT,
    LIVE_START_SEEK_EVENT,
    LIVE_START_SEEK_RESULT_EVENT,
    LIVE_STATE_REQUEST_EVENT,
    LIVE_STATE_RESULT_EVENT,
    LIVE_START_TIMEOUT_MS,
    LIVE_START_POLL_MS,
    LIVE_START_NOT_LIVE_GRACE_MS,
    LIVE_GUARD_HEARTBEAT_MS,
    LIVE_GUARD_AD_NOTE_ID,
    LIVE_START_SEEK_CONFIRM_TIMEOUT_MS,
    LIVE_START_SEEK_FRAME_FALLBACK_MS,
    LIVE_GUARD_PLAYER_GONE_MS,
    CHANNEL_LIVE_PATH_PATTERN,
    documentSaysVideoIsNotLive,
    getLiveStartVideoId,
    getLiveStartTarget,
    isLikelyLivePlayback,
    seekToEarliestSeekablePosition,
    createLiveStartController,
  };
});
