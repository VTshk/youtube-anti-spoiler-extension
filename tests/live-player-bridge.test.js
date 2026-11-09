const assert = require("node:assert/strict");
const test = require("node:test");

const bridge = require("../src/content/live-player-bridge.js");

function createDocument(getPlayer) {
  const listeners = new Map();
  const dispatchedEvents = [];

  return {
    dispatchedEvents,
    addEventListener(eventName, listener) {
      listeners.set(eventName, listener);
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      return true;
    },
    querySelector(selector) {
      return selector === "#movie_player" ? getPlayer() : null;
    },
    dispatch(eventName, detail) {
      const listener = listeners.get(eventName);

      assert.equal(typeof listener, "function", `${eventName} listener is registered`);
      listener({
        detail,
      });
    },
  };
}

function createRoot(doc, timers) {
  return {
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options.detail;
    },
    document: doc,
    setTimeout(callback, delay) {
      timers.push({
        callback,
        delay,
      });
      return callback;
    },
  };
}

test("live player bridge patches page-world history to emit a navigation event", () => {
  const dispatched = [];
  let pushStateArgs = null;
  const win = {
    Event: function FakeEvent(type) {
      this.type = type;
    },
    dispatchEvent(event) {
      dispatched.push(event.type);
      return true;
    },
    history: {
      pushState(...args) {
        pushStateArgs = args;
        return "pushed";
      },
      replaceState() {
        return "replaced";
      },
    },
  };

  assert.equal(bridge.patchHistory(win), true);
  assert.equal(win.history.pushState({ page: 1 }, "", "/watch?v=next"), "pushed");
  assert.deepEqual(pushStateArgs, [{ page: 1 }, "", "/watch?v=next"]);
  assert.equal(win.history.replaceState(null, "", "/watch?v=other"), "replaced");
  assert.deepEqual(dispatched, [bridge.REFRESH_EVENT, bridge.REFRESH_EVENT]);
});

test("live player bridge history patch requires a dispatch-capable window", () => {
  assert.equal(bridge.patchHistory(null), false);
  assert.equal(bridge.patchHistory({ history: {} }), false);
});

test("live player bridge init patches history alongside its event listeners", () => {
  const dispatched = [];
  const doc = createDocument(() => null);
  const win = {
    document: doc,
    Event: function FakeEvent(type) {
      this.type = type;
    },
    dispatchEvent(event) {
      dispatched.push(event.type);
      return true;
    },
    history: {
      pushState() {},
    },
  };

  bridge.initLivePlayerBridge(win);
  win.history.pushState({}, "", "/watch?v=spa-nav");

  assert.deepEqual(dispatched, [bridge.REFRESH_EVENT]);
});

test("live player bridge seeks with the page-world YouTube player API", () => {
  const seekToCalls = [];
  const player = {
    getProgressState() {
      return {
        seekableStart: 42,
      };
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 7,
  }));

  assert.deepEqual(seekToCalls, [[42, true]]);
  // The content script checks the seek itself (seeked events): nothing is reported back.
  assert.equal(doc.dispatchedEvents.length, 0);
});

test("live player bridge falls back to the content seekable start", () => {
  const seekToCalls = [];
  const player = {
    getProgressState() {
      return {};
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 8,
  }));

  assert.deepEqual(seekToCalls, [[24, true]]);
});

test("live player bridge ignores a seek while the player is not ready, and seeks once it is", () => {
  let player = null;
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 9,
  }));
  assert.equal(doc.dispatchedEvents.length, 0);

  const seekToCalls = [];
  player = {
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
    },
  };
  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 10,
  }));

  assert.deepEqual(seekToCalls, [[24, true]]);
});

test("live player bridge pauses the page-world YouTube player", () => {
  let pauseCalls = 0;
  const player = {
    pauseVideo() {
      pauseCalls += 1;
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch("youtube-anti-spoiler-live-guard-pause");

  assert.equal(pauseCalls, 1);
});

test("live player bridge plays the page-world YouTube player", () => {
  let playCalls = 0;
  const player = {
    playVideo() {
      playCalls += 1;
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  assert.equal(bridge.LIVE_GUARD_PLAY_EVENT, "youtube-anti-spoiler-live-guard-play");

  doc.dispatch(bridge.LIVE_GUARD_PLAY_EVENT);

  assert.equal(playCalls, 1);
});

test("live player bridge continue jumps to the live edge before resuming", () => {
  const seekToCalls = [];
  let playCalls = 0;
  const player = {
    getProgressState() {
      return {
        seekableStart: 0,
        seekableEnd: 7200,
      };
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
    },
    playVideo() {
      playCalls += 1;
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  assert.equal(
    bridge.LIVE_GUARD_CONTINUE_EVENT,
    "youtube-anti-spoiler-live-guard-continue",
  );

  doc.dispatch(bridge.LIVE_GUARD_CONTINUE_EVENT);

  assert.deepEqual(seekToCalls, [[7200, true]]);
  assert.equal(playCalls, 1);
});

test("live player bridge continue prefers the native live-head seek", () => {
  let liveHeadCalls = 0;
  let playCalls = 0;
  const player = {
    seekToLiveHead() {
      liveHeadCalls += 1;
    },
    seekTo() {
      throw new Error("seekTo should not be used when seekToLiveHead exists");
    },
    playVideo() {
      playCalls += 1;
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_GUARD_CONTINUE_EVENT);

  assert.equal(liveHeadCalls, 1);
  assert.equal(playCalls, 1);
});

test("live player bridge reports current live state from page-world player data", () => {
  const player = {
    getVideoData() {
      return {
        video_id: "current-live",
        isLive: true,
        isLiveContent: true,
      };
    },
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "current-live",
          isLive: true,
          isLiveContent: true,
        },
      };
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_STATE_REQUEST_EVENT, JSON.stringify({
    requestId: 12,
    videoId: "current-live",
  }));

  assert.equal(doc.dispatchedEvents[0].type, bridge.LIVE_STATE_RESULT_EVENT);
  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    canRewind: null,
    isLive: true,
    playabilityStatus: null,
    requestId: 12,
    rewindStart: null,
    signals: {
      playerResponseLive: true,
      videoDataLive: true,
    },
    videoId: "current-live",
  });
});

test("live player bridge reports a finished-stream VOD as not live", () => {
  // isLiveContent stays true on recordings of finished streams, and the
  // microformat keeps a liveBroadcastDetails object with an endTimestamp.
  // Treating either as "live" made the guard block plain VOD replays.
  const player = {
    getVideoData() {
      return {
        video_id: "stream-vod",
        isLive: false,
        isLiveContent: true,
      };
    },
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "stream-vod",
          isLive: false,
          isLiveContent: true,
        },
        microformat: {
          playerMicroformatRenderer: {
            liveBroadcastDetails: {
              isLiveNow: false,
              startTimestamp: "2026-07-29T18:00:00+00:00",
              endTimestamp: "2026-07-29T20:00:00+00:00",
            },
          },
        },
      };
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_STATE_REQUEST_EVENT, JSON.stringify({
    requestId: 13,
    videoId: "stream-vod",
  }));

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    canRewind: null,
    isLive: false,
    playabilityStatus: null,
    requestId: 13,
    rewindStart: null,
    signals: {},
    videoId: "stream-vod",
  });
});

test("live player bridge trusts live-now markers in the player response", () => {
  const player = {
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "live-now",
        },
        microformat: {
          playerMicroformatRenderer: {
            liveBroadcastDetails: {
              isLiveNow: true,
              startTimestamp: "2026-07-30T18:00:00+00:00",
            },
          },
        },
        playabilityStatus: {
          liveStreamability: {},
        },
      };
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, []));

  doc.dispatch(bridge.LIVE_STATE_REQUEST_EVENT, JSON.stringify({
    requestId: 14,
    videoId: "live-now",
  }));

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    canRewind: null,
    isLive: true,
    playabilityStatus: null,
    requestId: 14,
    rewindStart: null,
    signals: {
      playerResponseLive: true,
    },
    videoId: "live-now",
  });
});

function requestLiveState(player, rootExtras) {
  const doc = createDocument(() => player);
  const root = Object.assign(createRoot(doc, []), rootExtras || {});

  bridge.initLivePlayerBridge(root);
  doc.dispatch(bridge.LIVE_STATE_REQUEST_EVENT, JSON.stringify({
    requestId: 21,
  }));

  return JSON.parse(doc.dispatchedEvents[0].detail);
}

test("live player bridge reports an unknown live state while no source names a video", () => {
  assert.deepEqual(requestLiveState(null), {
    canRewind: null,
    isLive: null,
    playabilityStatus: null,
    requestId: 21,
    rewindStart: null,
    signals: {},
    videoId: null,
  });
});

test("live player bridge keeps a bare videoData isLive:false as unknown", () => {
  // videoData.isLive is false for a stream whose data has not hydrated yet,
  // so on its own it must not read as "not live".
  const result = requestLiveState({
    getVideoData() {
      return {
        video_id: "hydrating",
        isLive: false,
      };
    },
  });

  assert.equal(result.isLive, null);
  assert.equal(result.videoId, "hydrating");
});

test("live player bridge reports a regular video as not live from isLiveContent:false", () => {
  const result = requestLiveState({
    getVideoData() {
      return {
        video_id: "regular",
        isLive: false,
      };
    },
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "regular",
          isLiveContent: false,
        },
      };
    },
  });

  assert.equal(result.isLive, false);
  assert.equal(result.videoId, "regular");
});

test("live player bridge ignores a stale initial player response for another video", () => {
  // Full page load on live stream A, SPA navigation to VOD B: the player
  // response is not ready yet and ytInitialPlayerResponse still describes A.
  const result = requestLiveState(
    {
      getVideoData() {
        return {
          video_id: "vod-b",
          isLive: false,
        };
      },
      getPlayerResponse() {
        return null;
      },
    },
    {
      ytInitialPlayerResponse: {
        videoDetails: {
          videoId: "live-a",
          isLive: true,
        },
      },
    },
  );

  assert.deepEqual(result, {
    canRewind: null,
    isLive: null,
    playabilityStatus: null,
    requestId: 21,
    rewindStart: null,
    signals: {},
    videoId: "vod-b",
  });
});

test("live player bridge ignores player response markers for another video", () => {
  const result = requestLiveState({
    getVideoData() {
      return {
        video_id: "current-live",
        isLive: false,
      };
    },
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "previous-vod",
          isLiveContent: false,
        },
      };
    },
  });

  assert.equal(result.isLive, null);
  assert.equal(result.videoId, "current-live");
});

test("live player bridge ignores a player response that names no video", () => {
  const result = requestLiveState({
    getVideoData() {
      return {
        video_id: "named",
      };
    },
    getPlayerResponse() {
      return {
        microformat: {
          playerMicroformatRenderer: {
            liveBroadcastDetails: {
              isLiveNow: true,
            },
          },
        },
      };
    },
  });

  assert.equal(result.isLive, null);
  assert.deepEqual(result.signals, {});
});

test("live player bridge reports the current video's playability status", () => {
  for (const status of [
    "OK",
    "LOGIN_REQUIRED",
    "UNPLAYABLE",
    "ERROR",
    "AGE_CHECK_REQUIRED",
    "LIVE_STREAM_OFFLINE",
  ]) {
    const result = requestLiveState({
      getVideoData() {
        return { video_id: "current" };
      },
      getPlayerResponse() {
        return {
          playabilityStatus: { status },
          videoDetails: { videoId: "current" },
        };
      },
    });

    assert.equal(result.playabilityStatus, status, status);
  }
});

test("live player bridge reports YouTube's error response while no video is named", () => {
  // Live check 2026-11-09, bot wall: the player response has no videoDetails
  // and getVideoData() names no video.
  const result = requestLiveState({
    getVideoData() {
      return { video_id: "" };
    },
    getPlayerResponse() {
      return {
        playabilityStatus: {
          status: "LOGIN_REQUIRED",
          reason: "Sign in to confirm you're not a bot",
        },
      };
    },
  });

  assert.equal(result.videoId, null);
  assert.equal(result.playabilityStatus, "LOGIN_REQUIRED");
});

test("live player bridge ignores the playability status of a stale response", () => {
  // SPA navigation from an unavailable video A to stream B: the player names
  // B, the responses still describe A.
  const result = requestLiveState(
    {
      getVideoData() {
        return { video_id: "stream-b" };
      },
      getPlayerResponse() {
        return {
          playabilityStatus: { status: "UNPLAYABLE" },
          videoDetails: { videoId: "video-a" },
        };
      },
    },
    {
      ytInitialPlayerResponse: {
        playabilityStatus: { status: "ERROR" },
        videoDetails: { videoId: "video-a" },
      },
    },
  );

  assert.equal(result.videoId, "stream-b");
  assert.equal(result.playabilityStatus, null);
});

test("live player bridge ignores an error response without a video id once the player names a video", () => {
  const result = requestLiveState({
    getVideoData() {
      return { video_id: "named" };
    },
    getPlayerResponse() {
      return { playabilityStatus: { status: "LOGIN_REQUIRED" } };
    },
  });

  assert.equal(result.videoId, "named");
  assert.equal(result.playabilityStatus, null);
});

test("live player bridge takes the video id from the player response when videoData has none", () => {
  const result = requestLiveState(
    {
      getPlayerResponse() {
        return {
          videoDetails: {
            videoId: "from-response",
            isLive: true,
          },
        };
      },
    },
  );

  assert.equal(result.isLive, true);
  assert.equal(result.videoId, "from-response");
});

test("live player bridge lets a live-now marker win over a not-live marker of the same video", () => {
  const result = requestLiveState(
    {
      getVideoData() {
        return {
          video_id: "same-video",
        };
      },
      getPlayerResponse() {
        return {
          videoDetails: {
            videoId: "same-video",
            isLive: true,
          },
        };
      },
    },
    {
      ytInitialPlayerResponse: {
        videoDetails: {
          videoId: "same-video",
        },
        microformat: {
          playerMicroformatRenderer: {
            liveBroadcastDetails: {
              endTimestamp: "2026-07-29T20:00:00+00:00",
            },
          },
        },
      },
    },
  );

  assert.equal(result.isLive, true);
});

// R13 I5: playabilityStatus.liveStreamability stays on finished broadcasts,
// so it is not a "live right now" marker (the R8 table is the contract).

test("live player bridge does not take liveStreamability for a live-now marker", () => {
  const result = requestLiveState({
    getVideoData() {
      return {
        video_id: "ended-stream",
      };
    },
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "ended-stream",
        },
        microformat: {
          playerMicroformatRenderer: {
            liveBroadcastDetails: {
              isLiveNow: false,
            },
          },
        },
        playabilityStatus: {
          liveStreamability: {},
        },
      };
    },
  });

  assert.equal(result.isLive, false);
  assert.deepEqual(result.signals, {});
});

test("live player bridge reports liveStreamability alone as unknown", () => {
  const result = requestLiveState({
    getVideoData() {
      return {
        video_id: "streamability-only",
      };
    },
    getPlayerResponse() {
      return {
        videoDetails: {
          videoId: "streamability-only",
        },
        playabilityStatus: {
          liveStreamability: {},
        },
      };
    },
  });

  assert.equal(result.isLive, null);
  assert.equal(result.videoId, "streamability-only");
});

// R13 I4: without the player API the bridge falls back to the player's own
// <video>, never to the first <video> on the page (a hover preview).

test("live player bridge falls back only to the player's own <video>", () => {
  const createMedia = () => ({
    pauseCalls: 0,
    playCalls: 0,
    pause() {
      this.pauseCalls += 1;
    },
    play() {
      this.playCalls += 1;
    },
  });
  const playerVideo = createMedia();
  const preview = createMedia();
  const doc = createDocument(() => ({}));

  doc.querySelector = (selector) => {
    if (selector === "#movie_player") {
      return {};
    }

    if (selector === "#movie_player video") {
      return playerVideo;
    }

    return selector === "video" ? preview : null;
  };

  bridge.initLivePlayerBridge(createRoot(doc, []));
  doc.dispatch(bridge.LIVE_GUARD_PAUSE_EVENT);
  doc.dispatch(bridge.LIVE_GUARD_PLAY_EVENT);

  assert.equal(playerVideo.pauseCalls, 1);
  assert.equal(playerVideo.playCalls, 1);
  assert.equal(preview.pauseCalls, 0);
  assert.equal(preview.playCalls, 0);
});

function createRewindPlayer(progressState) {
  return {
    getVideoData() {
      return { video_id: "dvr-live", isLive: true };
    },
    getProgressState() {
      return progressState;
    },
  };
}

test("live player bridge reports a stream whose streamer turned rewinding off", () => {
  // Live check 2026-11-05: allowSeeking false with a known 12 h window, while
  // <video>.seekable still claimed 0–8533306.
  const result = requestLiveState(createRewindPlayer({
    allowSeeking: false,
    seekableStart: 8486511,
    seekableEnd: 8529711,
  }));

  assert.equal(result.canRewind, false);
});

test("live player bridge reports rewinding as unknown before the player knows its window", () => {
  // Before playback starts the player says allowSeeking: true for an empty window.
  const result = requestLiveState(createRewindPlayer({
    allowSeeking: true,
    seekableStart: 0,
    seekableEnd: 0,
  }));

  assert.equal(result.canRewind, null);
});

test("live player bridge reports a rewindable stream once its window is known", () => {
  const result = requestLiveState(createRewindPlayer({
    allowSeeking: true,
    seekableStart: 0,
    seekableEnd: 26333,
  }));

  assert.equal(result.canRewind, true);
});

// The bridge answers about the player's own <video>.
function requestLiveStateWithVideo(player, video) {
  const doc = createDocument(() => player);

  doc.querySelector = (selector) => {
    if (selector === "#movie_player") {
      return player;
    }

    return selector === "#movie_player video" ? video : null;
  };

  bridge.initLivePlayerBridge(createRoot(doc, []));
  doc.dispatch(bridge.LIVE_STATE_REQUEST_EVENT, JSON.stringify({
    requestId: 21,
  }));

  return JSON.parse(doc.dispatchedEvents[0].detail);
}

test("live player bridge reports where the rewind window starts in <video> seconds", () => {
  // Live check 2026-11-06 (Sky News, a 12 h window on a 14 h stream): the
  // <video> at the live edge read 46790 with seekable 0–50390, the player
  // read current 1528172 and seekableStart 1484992. The window starts
  // 43180 s back, at <video> 3610, not at <video>.seekable 0.
  const result = requestLiveStateWithVideo(
    createRewindPlayer({
      allowSeeking: true,
      current: 1528172,
      seekableStart: 1484992,
      seekableEnd: 1528177,
    }),
    { currentTime: 46790, seeking: false },
  );

  assert.equal(result.canRewind, true);
  assert.equal(result.rewindStart, 3610);
});

test("live player bridge does not report the rewind window start while the <video> is seeking", () => {
  // While seeking, the player's current already reads the target and the
  // <video> does not: their difference says nothing.
  const result = requestLiveStateWithVideo(
    createRewindPlayer({
      allowSeeking: true,
      current: 1484992,
      seekableStart: 1484992,
      seekableEnd: 1528177,
    }),
    { currentTime: 0, seeking: true },
  );

  assert.equal(result.rewindStart, null);
});

// --- Portion 5: skip buttons hidden while the player refuses to seek ---

// A player whose progress state the test can change, with the attribute
// methods the bridge uses.
function createSeekPlayer(progressState) {
  const attributes = new Set();

  return {
    progressState,
    getProgressState() {
      return this.progressState;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    toggleAttribute(name, force) {
      if (force) {
        attributes.add(name);
      } else {
        attributes.delete(name);
      }

      return force;
    },
  };
}

function startSeekBlockedCheck(player) {
  const doc = createDocument(() => player);
  const intervals = [];
  const root = Object.assign(createRoot(doc, []), {
    setInterval(callback, delay) {
      intervals.push({ callback, delay });
    },
  });

  bridge.initLivePlayerBridge(root);
  return intervals;
}

test("live player bridge marks the player as seek-blocked once a second while seeking is refused", () => {
  // Live check 2026-11-05 (uLWEssCrXYc): a stream without rewinding reports
  // allowSeeking false for a known window.
  const player = createSeekPlayer({
    allowSeeking: false,
    seekableStart: 8498516,
    seekableEnd: 8541703,
  });
  const intervals = startSeekBlockedCheck(player);

  assert.equal(bridge.SEEK_BLOCKED_ATTRIBUTE, "data-yas-seek-blocked");
  assert.deepEqual(intervals.map((interval) => interval.delay), [1000]);
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), false);

  intervals[0].callback();
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), true);

  // Still refused: the mark stays.
  intervals[0].callback();
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), true);

  // A stream with rewinding (H2SgImoLMdU) or a regular video.
  player.progressState = { allowSeeking: true, seekableStart: 0, seekableEnd: 38316 };
  intervals[0].callback();
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), false);
});

test("live player bridge does not mark the player while its seek window is unknown", () => {
  const player = createSeekPlayer({
    allowSeeking: false,
    seekableStart: 8498516,
    seekableEnd: 8541703,
  });

  bridge.syncSeekBlockedAttribute(createDocument(() => player));
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), true);

  // Before playback the player reports an empty window.
  player.progressState = { allowSeeking: false, seekableStart: 0, seekableEnd: 0 };
  bridge.syncSeekBlockedAttribute(createDocument(() => player));
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), false);

  player.progressState = undefined;
  bridge.syncSeekBlockedAttribute(createDocument(() => player));
  assert.equal(player.hasAttribute("data-yas-seek-blocked"), false);
});

test("live player bridge seek-blocked check does nothing without a player", () => {
  const intervals = startSeekBlockedCheck(null);

  assert.doesNotThrow(() => intervals[0].callback());
});
