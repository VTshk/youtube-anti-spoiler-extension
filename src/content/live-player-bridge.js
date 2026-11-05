(function initLivePlayerBridgeScript(root, factory) {
  const api = factory(root);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    api.initLivePlayerBridge(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createLivePlayerBridge() {
  const LIVE_START_SEEK_EVENT = "youtube-anti-spoiler-live-start-seek";
  const LIVE_START_SEEK_RESULT_EVENT = "youtube-anti-spoiler-live-start-seek-result";
  const LIVE_GUARD_PAUSE_EVENT = "youtube-anti-spoiler-live-guard-pause";
  const LIVE_GUARD_PLAY_EVENT = "youtube-anti-spoiler-live-guard-play";
  const LIVE_GUARD_CONTINUE_EVENT = "youtube-anti-spoiler-live-guard-continue";
  const LIVE_STATE_REQUEST_EVENT = "youtube-anti-spoiler-live-state-request";
  const LIVE_STATE_RESULT_EVENT = "youtube-anti-spoiler-live-state-result";
  const REFRESH_EVENT = "youtube-anti-spoiler-locationchange";
  const LIVE_START_VERIFY_DELAY_MS = 500;
  const LIVE_START_SEEK_TOLERANCE_SECONDS = 2;
  const BRIDGE_FLAG = "__youtubeAntiSpoilerLivePlayerBridgeInitialized";
  // Classes content.js puts on <html>; the MAIN world cannot read
  // chrome.storage, so they are its only view of the settings.
  const EXTENSION_ENABLED_CLASS = "yas-extension-enabled";
  const HIDE_VIDEO_TITLES_CLASS = "yas-hide-video-titles";
  const HIDE_VIDEO_PREVIEWS_CLASS = "yas-hide-video-previews";
  const HIDDEN_MEDIA_TITLE = "YouTube video";

  function parseSeekDetail(detail) {
    if (typeof detail !== "string") {
      return {};
    }

    try {
      return JSON.parse(detail);
    } catch (error) {
      return {};
    }
  }

  function getFiniteNumber(value) {
    return Number.isFinite(value) ? value : null;
  }

  function getPlayerSeekStart(player, fallbackSeconds) {
    if (player && typeof player.getProgressState === "function") {
      try {
        const progressState = player.getProgressState();
        const seekableStart = getFiniteNumber(
          progressState && progressState.seekableStart,
        );

        if (seekableStart !== null) {
          return seekableStart;
        }
      } catch (error) {
        // Fall through to the content-world video seekable start.
      }
    }

    const fallbackSeekStart = getFiniteNumber(fallbackSeconds);
    return fallbackSeekStart !== null ? fallbackSeekStart : 0;
  }

  function getPlayerSeekableEnd(player) {
    if (player && typeof player.getProgressState === "function") {
      try {
        const progressState = player.getProgressState();
        return getFiniteNumber(progressState && progressState.seekableEnd);
      } catch (error) {
        // Fall through; the caller decides whether a live-head seek is possible.
      }
    }

    return null;
  }

  function getPlayerCurrentTime(player) {
    if (!player || typeof player.getCurrentTime !== "function") {
      return null;
    }

    try {
      return getFiniteNumber(player.getCurrentTime());
    } catch (error) {
      return null;
    }
  }

  function isNearSeekTarget(currentTime, seekSeconds) {
    return (
      Number.isFinite(currentTime) &&
      Number.isFinite(seekSeconds) &&
      Math.abs(currentTime - seekSeconds) <= LIVE_START_SEEK_TOLERANCE_SECONDS
    );
  }

  function findPlayer(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return null;
    }

    return doc.querySelector("#movie_player");
  }

  function getObject(value) {
    return value && typeof value === "object" ? value : null;
  }

  function getNestedObject(rootObject, path) {
    return path.reduce((current, key) => (
      getObject(current) ? current[key] : null
    ), rootObject);
  }

  function getVideoDataLiveSignal(videoData) {
    if (!videoData || typeof videoData !== "object") {
      return false;
    }

    // isLive means "live right now". isLiveContent stays true on VOD replays of
    // finished streams, so it must never count as a live signal — the guard
    // would block plain recordings and "Continue live" would seek to the end.
    return videoData.isLive === true;
  }

  function getVideoDataVideoId(videoData) {
    if (!videoData || typeof videoData !== "object") {
      return null;
    }

    return videoData.video_id || videoData.videoId || null;
  }

  function getPlayerResponseLiveSignal(playerResponse) {
    if (!playerResponse || typeof playerResponse !== "object") {
      return false;
    }

    const videoDetails = getObject(playerResponse.videoDetails);
    const liveBroadcastDetails = getNestedObject(
      playerResponse,
      ["microformat", "playerMicroformatRenderer", "liveBroadcastDetails"],
    );

    // Only "live right now" markers count. isLiveContent, a bare
    // liveBroadcastDetails object and playabilityStatus.liveStreamability
    // persist on VODs of finished broadcasts.
    return Boolean(
      (videoDetails && videoDetails.isLive === true) ||
      (liveBroadcastDetails && liveBroadcastDetails.isLiveNow === true)
    );
  }

  function getPlayerResponseNotLiveSignal(playerResponse) {
    const videoDetails = getObject(playerResponse.videoDetails);
    const liveBroadcastDetails = getNestedObject(
      playerResponse,
      ["microformat", "playerMicroformatRenderer", "liveBroadcastDetails"],
    );

    return Boolean(
      (liveBroadcastDetails && liveBroadcastDetails.isLiveNow === false) ||
      (liveBroadcastDetails && liveBroadcastDetails.endTimestamp) ||
      (videoDetails && videoDetails.isLiveContent === false)
    );
  }

  function getPlayerResponseVideoId(playerResponse) {
    return getNestedObject(playerResponse, ["videoDetails", "videoId"]) || null;
  }

  function getPlayerVideoData(player) {
    if (!player || typeof player.getVideoData !== "function") {
      return null;
    }

    try {
      return player.getVideoData();
    } catch (error) {
      return null;
    }
  }

  function getPlayerApiResponse(player) {
    if (!player || typeof player.getPlayerResponse !== "function") {
      return null;
    }

    try {
      return getObject(player.getPlayerResponse());
    } catch (error) {
      return null;
    }
  }

  // isLive is true (some source says "live right now"), false (no source says
  // live and one explicitly says it is not) or null (nothing known yet). Only
  // sources that name the current video count: after an SPA navigation the
  // player response or ytInitialPlayerResponse can still describe the previous
  // video, and mixing them up either blocks a VOD or unblocks a live stream.
  function getLiveState(root, doc) {
    const player = findPlayer(doc);
    const videoData = getPlayerVideoData(player);
    const playerResponse = getPlayerApiResponse(player);
    const initialPlayerResponse = getObject(root && root.ytInitialPlayerResponse);
    const videoId =
      getVideoDataVideoId(videoData) ||
      getPlayerResponseVideoId(playerResponse) ||
      getPlayerResponseVideoId(initialPlayerResponse);
    const signals = {};

    if (!videoId) {
      return {
        isLive: null,
        signals,
        videoId: null,
      };
    }

    const matchingResponses = [playerResponse, initialPlayerResponse].filter(
      (response) => response && getPlayerResponseVideoId(response) === videoId,
    );

    if (
      getVideoDataVideoId(videoData) === videoId &&
      getVideoDataLiveSignal(videoData)
    ) {
      signals.videoDataLive = true;
    }

    if (matchingResponses.some(getPlayerResponseLiveSignal)) {
      signals.playerResponseLive = true;
    }

    let isLive = null;

    if (signals.videoDataLive || signals.playerResponseLive) {
      isLive = true;
    } else if (matchingResponses.some(getPlayerResponseNotLiveSignal)) {
      isLive = false;
    }

    return {
      // The player's progress state describes the video it holds, so it only
      // counts when that is the video reported here.
      canRewind: getVideoDataVideoId(videoData) === videoId ? getPlayerCanRewind(player) : null,
      isLive,
      signals,
      videoId,
    };
  }

  // Whether the streamer allows rewinding (DVR). null until the player knows
  // its DVR window: before playback starts it reports allowSeeking: true with
  // an empty 0–0 window (live check 2026-11-05).
  function getPlayerCanRewind(player) {
    if (!player || typeof player.getProgressState !== "function") {
      return null;
    }

    try {
      const progressState = player.getProgressState();
      const seekableStart = getFiniteNumber(progressState && progressState.seekableStart);
      const seekableEnd = getFiniteNumber(progressState && progressState.seekableEnd);

      if (
        typeof progressState.allowSeeking !== "boolean" ||
        seekableStart === null ||
        seekableEnd === null ||
        seekableEnd <= seekableStart
      ) {
        return null;
      }

      return progressState.allowSeeking;
    } catch (error) {
      return null;
    }
  }

  function seekPlayer(doc, fallbackSeconds) {
    const player = findPlayer(doc);
    const seekSeconds = getPlayerSeekStart(player, fallbackSeconds);

    if (!player || typeof player.seekTo !== "function") {
      return {
        currentTime: getPlayerCurrentTime(player),
        seekSeconds,
        success: false,
      };
    }

    try {
      player.seekTo(seekSeconds, true);
      return {
        currentTime: null,
        seekSeconds,
        success: false,
      };
    } catch (error) {
      return {
        currentTime: getPlayerCurrentTime(player),
        seekSeconds,
        success: false,
      };
    }
  }

  function pausePlayer(doc) {
    const player = findPlayer(doc);

    if (player && typeof player.pauseVideo === "function") {
      try {
        player.pauseVideo();
        return true;
      } catch (error) {
        // Fall through to the media element fallback.
      }
    }

    if (!doc || typeof doc.querySelector !== "function") {
      return false;
    }

    // Only the player's own <video>: a hover preview elsewhere on the page is
    // not the guarded stream.
    const video = doc.querySelector("#movie_player video");

    if (!video || typeof video.pause !== "function") {
      return false;
    }

    try {
      video.pause();
      return true;
    } catch (error) {
      return false;
    }
  }

  function playMediaElement(doc) {
    if (!doc || typeof doc.querySelector !== "function") {
      return false;
    }

    const video = doc.querySelector("#movie_player video");

    if (!video || typeof video.play !== "function") {
      return false;
    }

    try {
      const result = video.play();

      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  function playPlayer(doc) {
    const player = findPlayer(doc);

    if (player && typeof player.playVideo === "function") {
      try {
        player.playVideo();
        return true;
      } catch (error) {
        return playMediaElement(doc);
      }
    }

    return playMediaElement(doc);
  }

  function seekPlayerToLiveHead(doc) {
    const player = findPlayer(doc);

    if (player && typeof player.seekToLiveHead === "function") {
      try {
        player.seekToLiveHead();
        return true;
      } catch (error) {
        // Fall through to the progress-state live edge.
      }
    }

    const seekableEnd = getPlayerSeekableEnd(player);

    if (
      seekableEnd !== null &&
      player &&
      typeof player.seekTo === "function"
    ) {
      try {
        player.seekTo(seekableEnd, true);
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  function continuePlayer(doc) {
    // "Continue live" must jump to the live edge first: the guard pauses the
    // stream near the start of the DVR window, so a plain resume would replay
    // from the beginning instead of the current live moment.
    seekPlayerToLiveHead(doc);
    return playPlayer(doc);
  }

  function verifyPlayerSeek(doc, seekResult) {
    const player = findPlayer(doc);
    const currentTime = getPlayerCurrentTime(player);

    return {
      currentTime,
      seekSeconds: seekResult.seekSeconds,
      success: isNearSeekTarget(currentTime, seekResult.seekSeconds),
    };
  }

  function serializeSeekResultDetail(requestId, result) {
    return JSON.stringify({
      currentTime: result.currentTime,
      requestId,
      seekSeconds: result.seekSeconds,
      success: result.success,
    });
  }

  function dispatchSeekResult(root, doc, requestId, result) {
    if (
      !root ||
      typeof root.CustomEvent !== "function" ||
      !doc ||
      typeof doc.dispatchEvent !== "function"
    ) {
      return false;
    }

    try {
      doc.dispatchEvent(new root.CustomEvent(LIVE_START_SEEK_RESULT_EVENT, {
        bubbles: true,
        composed: true,
        detail: serializeSeekResultDetail(requestId, result),
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function dispatchLiveStateResult(root, doc, requestId, result) {
    if (
      !root ||
      typeof root.CustomEvent !== "function" ||
      !doc ||
      typeof doc.dispatchEvent !== "function"
    ) {
      return false;
    }

    try {
      doc.dispatchEvent(new root.CustomEvent(LIVE_STATE_RESULT_EVENT, {
        bubbles: true,
        composed: true,
        detail: JSON.stringify({
          canRewind: result.canRewind === undefined ? null : result.canRewind,
          isLive: result.isLive,
          requestId,
          signals: result.signals,
          videoId: result.videoId,
        }),
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function scheduleSeekVerification(root, doc, requestId, seekResult) {
    if (
      seekResult.success ||
      !root ||
      typeof root.setTimeout !== "function"
    ) {
      dispatchSeekResult(root, doc, requestId, seekResult);
      return;
    }

    root.setTimeout(() => {
      dispatchSeekResult(
        root,
        doc,
        requestId,
        verifyPlayerSeek(doc, seekResult),
      );
    }, LIVE_START_VERIFY_DELAY_MS);
  }

  function patchHistory(win) {
    // History must be patched here, in the MAIN world: the page's
    // pushState/replaceState calls never pass through the isolated-world
    // binding, so a content-script patch would only see its own (nonexistent)
    // calls. The dispatched window event crosses worlds, where the content
    // script listens for it as a navigation fallback besides yt-navigate-*.
    if (
      !win ||
      !win.history ||
      typeof win.dispatchEvent !== "function" ||
      typeof win.Event !== "function"
    ) {
      return false;
    }

    ["pushState", "replaceState"].forEach((methodName) => {
      const originalMethod = win.history[methodName];

      if (typeof originalMethod !== "function") {
        return;
      }

      win.history[methodName] = function patchedHistoryMethod() {
        const result = originalMethod.apply(this, arguments);

        try {
          win.dispatchEvent(new win.Event(REFRESH_EVENT));
        } catch (error) {
          // Navigation refresh is best-effort; never break YouTube's routing.
        }

        return result;
      };
    });

    return true;
  }

  function hasRootClass(win, className) {
    return win.document.documentElement.classList.contains(className);
  }

  function hideSpoilersInMetadata(win, metadata) {
    const hideTitle = hasRootClass(win, HIDE_VIDEO_TITLES_CLASS);
    const hideArtwork = hasRootClass(win, HIDE_VIDEO_PREVIEWS_CLASS);

    if (!metadata || (!hideTitle && !hideArtwork)) {
      return metadata;
    }

    // A new object, so YouTube's own metadata is never changed.
    return new win.MediaMetadata({
      title: hideTitle ? HIDDEN_MEDIA_TITLE : metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: hideArtwork ? [] : metadata.artwork,
    });
  }

  // Chrome's media controls (the toolbar media hub, the Windows media
  // overlay) show the title, artwork, position, and duration the page hands
  // to navigator.mediaSession. Like the history patch, this has to run in
  // the MAIN world, before YouTube's own scripts use the API.
  function patchMediaSession(win) {
    if (
      !win.navigator ||
      !win.navigator.mediaSession ||
      typeof win.MediaSession !== "function" ||
      typeof win.MediaMetadata !== "function"
    ) {
      return false;
    }

    const prototype = win.MediaSession.prototype;
    const originalSetPositionState = prototype.setPositionState;
    const metadataProperty = Object.getOwnPropertyDescriptor(prototype, "metadata");

    // What YouTube last handed over, so it can be masked or put back when
    // the settings change mid-video.
    let youtubeMetadata = null;

    prototype.setPositionState = function patchedSetPositionState() {
      if (hasRootClass(win, EXTENSION_ENABLED_CLASS)) {
        // Without arguments the call clears the position state, so a state
        // set before protection was switched on stops counting too.
        return originalSetPositionState.call(this);
      }

      return originalSetPositionState.apply(this, arguments);
    };

    Object.defineProperty(prototype, "metadata", {
      configurable: true,
      enumerable: metadataProperty.enumerable,
      get: metadataProperty.get,
      set(metadata) {
        youtubeMetadata = metadata;
        metadataProperty.set.call(this, hideSpoilersInMetadata(win, metadata));
      },
    });

    // YouTube sets the metadata and position once per video, so a setting
    // switched mid-video would not reach the media controls until the next
    // one. content.js switches settings through the classes on <html>.
    new win.MutationObserver(() => {
      const session = win.navigator.mediaSession;

      metadataProperty.set.call(session, hideSpoilersInMetadata(win, youtubeMetadata));

      if (hasRootClass(win, EXTENSION_ENABLED_CLASS)) {
        originalSetPositionState.call(session);
      }
    }).observe(win.document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return true;
  }

  function initLivePlayerBridge(root) {
    const currentWindow = root || {};
    const currentDocument = currentWindow.document;

    if (
      !currentDocument ||
      currentWindow[BRIDGE_FLAG] ||
      typeof currentDocument.addEventListener !== "function"
    ) {
      return;
    }

    currentWindow[BRIDGE_FLAG] = true;

    patchHistory(currentWindow);
    patchMediaSession(currentWindow);

    currentDocument.addEventListener(LIVE_START_SEEK_EVENT, (event) => {
      const detail = parseSeekDetail(event && event.detail);
      const result = seekPlayer(currentDocument, detail.fallbackSeconds);
      scheduleSeekVerification(
        currentWindow,
        currentDocument,
        detail.requestId,
        result,
      );
    }, true);

    currentDocument.addEventListener(LIVE_GUARD_PAUSE_EVENT, () => {
      pausePlayer(currentDocument);
    }, true);

    currentDocument.addEventListener(LIVE_GUARD_PLAY_EVENT, () => {
      playPlayer(currentDocument);
    }, true);

    currentDocument.addEventListener(LIVE_GUARD_CONTINUE_EVENT, () => {
      continuePlayer(currentDocument);
    }, true);

    currentDocument.addEventListener(LIVE_STATE_REQUEST_EVENT, (event) => {
      const detail = parseSeekDetail(event && event.detail);
      dispatchLiveStateResult(
        currentWindow,
        currentDocument,
        detail.requestId,
        getLiveState(currentWindow, currentDocument),
      );
    }, true);
  }

  return {
    LIVE_GUARD_PAUSE_EVENT,
    LIVE_GUARD_PLAY_EVENT,
    LIVE_GUARD_CONTINUE_EVENT,
    LIVE_STATE_REQUEST_EVENT,
    LIVE_STATE_RESULT_EVENT,
    LIVE_START_SEEK_EVENT,
    LIVE_START_SEEK_RESULT_EVENT,
    LIVE_START_VERIFY_DELAY_MS,
    REFRESH_EVENT,
    continuePlayer,
    dispatchSeekResult,
    getPlayerCurrentTime,
    getPlayerSeekStart,
    getPlayerSeekableEnd,
    getLiveState,
    HIDDEN_MEDIA_TITLE,
    initLivePlayerBridge,
    isNearSeekTarget,
    parseSeekDetail,
    patchHistory,
    patchMediaSession,
    pausePlayer,
    playPlayer,
    scheduleSeekVerification,
    seekPlayer,
    seekPlayerToLiveHead,
    verifyPlayerSeek,
  };
});
