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
  const timers = [];
  let currentTime = 300;
  const player = {
    getCurrentTime() {
      return currentTime;
    },
    getProgressState() {
      return {
        seekableStart: 42,
      };
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
      currentTime = seconds;
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, timers));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 7,
  }));

  assert.deepEqual(seekToCalls, [[42, true]]);
  assert.equal(doc.dispatchedEvents.length, 0);
  assert.equal(timers[0].delay, bridge.LIVE_START_VERIFY_DELAY_MS);

  timers[0].callback();

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    currentTime: 42,
    requestId: 7,
    seekSeconds: 42,
    success: true,
  });
});

test("live player bridge falls back to the content seekable start", () => {
  const seekToCalls = [];
  const timers = [];
  let currentTime = 300;
  const player = {
    getCurrentTime() {
      return currentTime;
    },
    getProgressState() {
      return {};
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
      currentTime = seconds;
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, timers));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 8,
  }));

  assert.deepEqual(seekToCalls, [[24, true]]);
  timers[0].callback();

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    currentTime: 24,
    requestId: 8,
    seekSeconds: 24,
    success: true,
  });
});

test("live player bridge reports an unready player so the content script can retry", () => {
  const timers = [];
  let player = null;
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, timers));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 9,
  }));

  timers[0].callback();

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    currentTime: null,
    requestId: 9,
    seekSeconds: 24,
    success: false,
  });

  const seekToCalls = [];
  let currentTime = 300;
  player = {
    getCurrentTime() {
      return currentTime;
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
      currentTime = seconds;
    },
  };
  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 10,
  }));

  assert.deepEqual(seekToCalls, [[24, true]]);
  timers[1].callback();

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[1].detail), {
    currentTime: 24,
    requestId: 10,
    seekSeconds: 24,
    success: true,
  });
});

test("live player bridge reports failure when YouTube stays at the live edge", () => {
  const timers = [];
  const seekToCalls = [];
  const player = {
    getCurrentTime() {
      return 300;
    },
    seekTo(seconds, allowSeekAhead) {
      seekToCalls.push([seconds, allowSeekAhead]);
    },
  };
  const doc = createDocument(() => player);

  bridge.initLivePlayerBridge(createRoot(doc, timers));

  doc.dispatch(bridge.LIVE_START_SEEK_EVENT, JSON.stringify({
    fallbackSeconds: 24,
    requestId: 11,
  }));

  assert.deepEqual(seekToCalls, [[24, true]]);
  timers[0].callback();

  assert.deepEqual(JSON.parse(doc.dispatchedEvents[0].detail), {
    currentTime: 300,
    requestId: 11,
    seekSeconds: 24,
    success: false,
  });
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
    isLive: true,
    requestId: 12,
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
    isLive: false,
    requestId: 13,
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
    isLive: true,
    requestId: 14,
    signals: {
      playerResponseLive: true,
    },
    videoId: "live-now",
  });
});
