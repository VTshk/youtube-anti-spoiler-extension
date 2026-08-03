(function initLiveStartController(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    require("../shared/settings.js");
  }

  const api = factory(root);

  root.YouTubeAntiSpoiler = Object.assign(root.YouTubeAntiSpoiler || {}, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createLiveStartModule(root) {
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

  function getLiveStartVideoId(win) {
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

    return liveMatch ? decodeURIComponent(liveMatch[1]) : null;
  }

  function getLiveStartTarget(settings, win, attemptedVideoIds) {
    const normalizedSettings = normalizeSettings(settings);
    const videoId = getLiveStartVideoId(win);
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

  function isLikelyLivePlayback(doc, video, videoId, liveState) {
    return Boolean(
      video &&
      (
        pageWorldSaysCurrentVideoIsLive(liveState, videoId) ||
        documentHasLiveSignal(doc, videoId) ||
        (
          !Number.isFinite(video.duration) &&
          (
            elementHasClass(findYouTubePlayer(doc), "ytp-live") ||
            documentHasLiveChatSignal(doc)
          )
        )
      )
    );
  }

  function isClearlyNotLivePlayback(doc, video, videoId, liveState) {
    // A finite duration alone is not proof: a live stream briefly reports one
    // mid-transition. Only give up on a *positive* not-live signal for this exact
    // video — the page-world player data or an explicit "false" broadcast flag.
    return Boolean(
      video &&
      Number.isFinite(video.duration) &&
      !pageWorldSaysCurrentVideoIsLive(liveState, videoId) &&
      (
        pageWorldSaysCurrentVideoIsNotLive(liveState, videoId) ||
        documentSaysVideoIsNotLive(doc, videoId)
      )
    );
  }

  function findVideoElement(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    return (
      doc.querySelector("#movie_player video.html5-main-video") ||
      doc.querySelector("#movie_player .html5-main-video") ||
      doc.querySelector("#movie_player video") ||
      doc.querySelector("ytd-player video") ||
      doc.querySelector("video")
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
    let pauseLockVideo = null;
    let pauseLockListener = null;
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
      if (!video || mutedVideo === video) {
        return;
      }

      restoreShieldMute();

      try {
        mutedVideoWasMuted = video.muted === true;
        video.muted = true;
        mutedVideo = video;
      } catch (error) {
        mutedVideo = null;
        mutedVideoWasMuted = false;
      }
    }

    function getOverlay(doc) {
      if (!doc || typeof doc.getElementById !== "function") {
        return null;
      }

      return doc.getElementById(LIVE_GUARD_OVERLAY_ID);
    }

    function findLiveGuardHost(doc) {
      if (!doc) {
        return null;
      }

      // Mount on <body> so the overlay sits above YouTube's player stacking
      // contexts (a child of #movie_player gets hidden behind the player's own
      // layers). Position is tracked to the player via document coordinates.
      const candidates = [
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

      return candidates.find((candidate) => (
        candidate && typeof candidate.getBoundingClientRect === "function"
      )) || null;
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
      const boundsTarget = findLiveGuardBoundsTarget(doc);

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

      // Document coordinates (viewport rect + scroll) so an absolutely
      // positioned overlay scrolls together with the player instead of floating.
      overlay.style.left = `${rect.left + getScrollOffset("x")}px`;
      overlay.style.top = `${rect.top + getScrollOffset("y")}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      return true;
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
        const overlay = getOverlay(doc);

        if (overlay) {
          applyLiveGuardBounds(doc, overlay);
        }
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

      if (
        !parsedDetail ||
        typeof parsedDetail.videoId !== "string" ||
        typeof parsedDetail.isLive !== "boolean"
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

      if (
        !activeGuard ||
        !liveStateMatchesVideo(liveState, activeGuard.videoId)
      ) {
        return;
      }

      latestLiveState = liveState;
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

    function clearPauseLock() {
      if (
        pauseLockVideo &&
        pauseLockListener &&
        typeof pauseLockVideo.removeEventListener === "function"
      ) {
        try {
          pauseLockVideo.removeEventListener("play", pauseLockListener, true);
        } catch (error) {
        }
      }

      pauseLockVideo = null;
      pauseLockListener = null;
    }

    function bindPauseLock(doc, video) {
      if (
        !video ||
        typeof video.addEventListener !== "function" ||
        (pauseLockVideo === video && pauseLockListener)
      ) {
        return;
      }

      clearPauseLock();

      pauseLockListener = () => {
        if (!activeGuard) {
          return;
        }

        pauseVideo(video);
        requestMainWorldPlayerPause(currentWindow, doc);
      };

      try {
        video.addEventListener("play", pauseLockListener, true);
        pauseLockVideo = video;
      } catch (error) {
        pauseLockListener = null;
      }
    }

    function appendTextElement(doc, parent, tagName, className, text) {
      const element = doc.createElement(tagName);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    }

    function appendActionButton(doc, parent, action, text, handler) {
      const button = doc.createElement("button");
      button.type = "button";
      button.dataset.liveGuardAction = action;
      button.textContent = text;
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

      clearPauseLock();
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

    function continueLive(doc) {
      dismissGuard(doc, true, "live");
    }

    function startFromBeginning(doc) {
      const video = findVideoElement(doc);
      const startTime = getEarliestSeekableStart(video);

      if (startTime !== null) {
        nextSeekRequestId += 1;
        requestMainWorldPlayerSeek(currentWindow, doc, startTime, nextSeekRequestId);

        try {
          video.currentTime = startTime;
        } catch (error) {
          // If YouTube blocks direct media seeking, the main-world request still ran.
        }
      }

      dismissGuard(doc, true, "play");
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
      overlay.setAttribute("aria-label", "Live spoiler protection");

      if (!applyLiveGuardBounds(doc, overlay)) {
        debugLog("renderOverlay: player bounds not ready — will retry");
        return null;
      }

      const panel = doc.createElement("div");
      panel.className = "yas-live-guard-panel";
      overlay.appendChild(panel);

      appendTextElement(
        doc,
        panel,
        "p",
        "yas-live-guard-title",
        "Spoiler protection is active",
      );
      appendTextElement(
        doc,
        panel,
        "p",
        "yas-live-guard-copy",
        "This live stream was paused before showing the current moment.",
      );

      const actions = doc.createElement("div");
      actions.className = "yas-live-guard-actions";
      panel.appendChild(actions);

      appendActionButton(doc, actions, "start", "Start from beginning", () => {
        startFromBeginning(doc);
      });
      appendActionButton(doc, actions, "continue", "Continue live", () => {
        continueLive(doc);
      });

      host.appendChild(overlay);
      debugLog("renderOverlay: appended; present after =", Boolean(getOverlay(doc)));
      return overlay;
    }

    function showGuard(doc, video) {
      if (!activeGuard) {
        return;
      }

      if (!activeGuard.pauseRequested) {
        activeGuard.pauseRequested = true;
        requestMainWorldPlayerPause(currentWindow, doc);
      }

      // Re-assert on every heartbeat: a YouTube SPA re-render can swap the
      // <video>, drop our blur class, or quietly resume playback.
      pauseVideo(video);
      muteForShield(video);
      addLiveStartObscuring(doc);
      activeGuard.shielded = true;
      bindPauseLock(doc, video);

      // (Re-)mount the overlay whenever it is missing. The buttons live in a
      // <body> node that a watch-page re-render can detach, which would leave
      // the stream paused and blurred with no way to act on it.
      if (!getOverlay(doc)) {
        renderLiveGuardOverlay(doc);
      }

      // Re-track the player on every heartbeat so the overlay follows theater
      // mode, window resizes, and layout shifts (scroll is handled by the
      // document-coordinate positioning itself).
      const overlay = getOverlay(doc);

      if (overlay) {
        applyLiveGuardBounds(doc, overlay);
        bindOverlayTracking(doc);
      }

      activeGuard.guarded = Boolean(overlay);
      debugLog(
        "showGuard: guarded =", activeGuard.guarded,
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

    function runTick(doc) {
      if (!activeGuard) {
        return;
      }

      if (getLiveStartVideoId(currentWindow) !== activeGuard.videoId) {
        cancel(doc, false);
        return;
      }

      const video = findVideoElement(doc);
      requestLatestLiveState(doc);

      const hasLiveSignal = isLikelyLivePlayback(
        doc,
        video,
        activeGuard.videoId,
        latestLiveState,
      );
      debugLog(
        "tick: hasVideo =", Boolean(video),
        "hasLiveSignal =", hasLiveSignal,
        "guarded =", activeGuard.guarded,
      );

      if (video && hasLiveSignal) {
        showGuard(doc, video);
        // Poll quickly until the overlay actually mounts (player bounds may not
        // be ready yet on SPA navigation), then settle into a slow heartbeat
        // that keeps it re-mounted and re-positioned.
        scheduleTick(
          doc,
          activeGuard.guarded ? LIVE_GUARD_HEARTBEAT_MS : LIVE_START_POLL_MS,
        );
        return;
      }

      // Once the guard is on screen, a transient loss of the live signal (common
      // mid SPA re-render) must not tear it down — only an explicit user action
      // or a real navigation away dismisses it. Keep re-asserting the pause,
      // blur, and overlay meanwhile: the same re-render that dropped the signal
      // can also have detached the overlay, and without a remount the stream
      // would sit paused and blurred with no buttons to act on.
      if (activeGuard.guarded) {
        if (video) {
          showGuard(doc, video);
        }

        scheduleTick(doc, LIVE_GUARD_HEARTBEAT_MS);
        return;
      }

      // While live status is unknown the eager shield (blur + mute, applied at
      // arm time) stays up. Drop it on the first positive not-live hint so
      // regular videos unblur quickly; the guard itself keeps polling and would
      // re-shield if a real live signal hydrates later.
      const notLiveHint =
        pageWorldSaysCurrentVideoIsNotLive(latestLiveState, activeGuard.videoId) ||
        documentSaysVideoIsNotLive(doc, activeGuard.videoId);

      if (activeGuard.shielded && notLiveHint) {
        activeGuard.shielded = false;
        removeLiveStartObscuring(doc);
        restoreShieldMute();
      } else if (activeGuard.shielded) {
        muteForShield(video);
      }

      // Give-up paths never mark the video as attempted: only an explicit user
      // choice does. A premature give-up during an SPA transition must not block
      // the guard from re-arming once the live signal finally hydrates.
      if (
        video &&
        isClearlyNotLivePlayback(doc, video, activeGuard.videoId, latestLiveState) &&
        getNow() - activeGuard.startedAt >= LIVE_START_NOT_LIVE_GRACE_MS
      ) {
        cancel(doc, false);
        return;
      }

      if (getNow() - activeGuard.startedAt >= LIVE_START_TIMEOUT_MS) {
        cancel(doc, false);
        return;
      }

      scheduleTick(doc);
    }

    function sync(settings, doc) {
      const currentDocument = doc || currentWindow.document;
      const target = getLiveStartTarget(settings, currentWindow, attemptedVideoIds);
      debugLog("sync: videoId =", target.videoId, "shouldAttempt =", target.shouldAttempt);

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
        guarded: false,
        pauseRequested: false,
        shielded: firstShieldAttempt,
        timer: null,
      };
      latestLiveState = null;

      if (firstShieldAttempt) {
        addLiveStartObscuring(currentDocument);
      }

      runTick(currentDocument);
    }

    return {
      sync,
      cancel,
      getAttemptedVideoIds() {
        return new Set(attemptedVideoIds);
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
    documentSaysVideoIsNotLive,
    getLiveStartVideoId,
    getLiveStartTarget,
    isLikelyLivePlayback,
    seekToEarliestSeekablePosition,
    createLiveStartController,
  };
});
