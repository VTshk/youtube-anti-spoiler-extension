const assert = require("node:assert/strict");
const test = require("node:test");

const { installEnglishI18n } = require("./helpers/english-messages.js");

// The in-page texts come from _locales/en through chrome.i18n.
installEnglishI18n();

const content = require("../src/content/content.js");
// Timing constants and ids that content.js does not re-export.
const liveStart = require("../src/content/live-start-controller.js");

function createClassList() {
  const classes = new Set();

  return {
    add(className) {
      classes.add(className);
    },
    remove(className) {
      classes.delete(className);
    },
    contains(className) {
      return classes.has(className);
    },
  };
}

function createElement(tagName) {
  const element = {
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    id: "",
    listeners: {},
    parentNode: null,
    style: {},
    textContent: "",
    appendChild(child) {
      // Like the DOM: appending an attached node moves it.
      if (child.parentNode && child.parentNode !== this) {
        child.parentNode.children = child.parentNode.children.filter(
          (sibling) => sibling !== child,
        );
      }

      if (child.parentNode !== this) {
        this.children.push(child);
      }

      child.parentNode = this;
      return child;
    },
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    click() {
      if (this.listeners.click) {
        this.listeners.click({
          preventDefault() {},
        });
      }
    },
    remove() {
      if (!this.parentNode) {
        return;
      }

      this.parentNode.children = this.parentNode.children.filter(
        (child) => child !== this,
      );
      this.parentNode = null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;

      if (name === "id") {
        this.id = value;
      }
    },
    querySelector(selector) {
      const matches = (candidate) => {
        if (selector.startsWith("#")) {
          return candidate.id === selector.slice(1);
        }

        if (selector.startsWith(".")) {
          return candidate.className.split(" ").includes(selector.slice(1));
        }

        const actionMatch = selector.match(/^\[data-live-guard-action="(.+)"\]$/);
        const chatActionMatch = selector.match(/^\[data-chat-guard-action="(.+)"\]$/);
        return Boolean(
          (actionMatch && candidate.dataset.liveGuardAction === actionMatch[1]) ||
          (chatActionMatch && candidate.dataset.chatGuardAction === chatActionMatch[1])
        );
      };

      const queue = [...this.children];

      while (queue.length > 0) {
        const candidate = queue.shift();

        if (matches(candidate)) {
          return candidate;
        }

        queue.push(...candidate.children);
      }

      return null;
    },
  };

  return element;
}

function createLiveDocument({
  video = null,
  player = null,
  chat = null,
  hasLiveSignal = false,
  hasLiveChatSignal = false,
  hasWatchLiveSignal = false,
  liveBroadcastContent = null,
  endDateContent = null,
  metadataVideoId = null,
  watchFlexyVideoId = null,
} = {}) {
  const classList = createClassList();
  const listeners = new Map();
  const documentState = {
    hasLiveSignal,
    hasLiveChatSignal,
    hasWatchLiveSignal,
    liveBroadcastContent,
    endDateContent,
    metadataVideoId,
    watchFlexyVideoId,
    player,
    chat,
    video,
  };
  const body = createElement("body");
  const head = createElement("head");

  if (documentState.player && typeof documentState.player.appendChild === "function") {
    documentState.player.id = "movie_player";
    if (typeof documentState.player.contains !== "function") {
      // The player's <video> is whatever the page currently holds.
      documentState.player.contains = (node) => node === documentState.video;
    }
    if (
      !documentState.player.skipBoundingClientRect &&
      typeof documentState.player.getBoundingClientRect !== "function"
    ) {
      documentState.player.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
      });
    }
    body.appendChild(documentState.player);
  }

  if (documentState.chat && typeof documentState.chat.appendChild === "function") {
    body.appendChild(documentState.chat);
  }

  return Object.assign(documentState, {
    body,
    head,
    documentElement: {
      classList,
      appendChild(child) {
        return head.appendChild(child);
      },
    },
    createElement,
    addEventListener(eventName, listener) {
      const eventListeners = listeners.get(eventName) || [];
      eventListeners.push(listener);
      listeners.set(eventName, eventListeners);
    },
    removeEventListener(eventName, listener) {
      const eventListeners = listeners.get(eventName) || [];
      listeners.set(
        eventName,
        eventListeners.filter((eventListener) => eventListener !== listener),
      );
    },
    dispatchEvent(event) {
      const eventListeners = listeners.get(event.type) || [];

      eventListeners.forEach((eventListener) => {
        eventListener(event);
      });

      return true;
    },
    getElementById(id) {
      return body.querySelector(`#${id}`);
    },
    // No hovered or stashed titles in these pages; applyTranslations looks
    // up every element that carries a message key.
    querySelectorAll(selector) {
      const datasetName = { "[data-yas-i18n]": "yasI18n", "[data-yas-i18n-label]": "yasI18nLabel" }[selector];
      const collect = (element) => element.children.flatMap((child) => [child, ...collect(child)]);

      return datasetName ? collect(body).filter((element) => element.dataset[datasetName]) : [];
    },
    querySelector(selector) {
      if (selector === "video") {
        return this.video;
      }

      if (selector.startsWith("#youtube-anti-spoiler-live-guard")) {
        return body.querySelector(selector);
      }

      if (selector === "#movie_player") {
        return this.player;
      }

      // The guard looks for the <video> only inside the player.
      if (selector === "#movie_player video") {
        return this.player && this.video && this.player.contains(this.video)
          ? this.video
          : null;
      }

      if (
        selector.includes('meta[itemprop="videoId"]') &&
        this.metadataVideoId !== null
      ) {
        return {
          content: this.metadataVideoId,
          getAttribute(name) {
            return name === "content" ? this.content : null;
          },
        };
      }

      if (
        selector.includes('meta[itemprop="isLiveBroadcast"]') &&
        this.liveBroadcastContent !== null
      ) {
        return {
          content: this.liveBroadcastContent,
          getAttribute(name) {
            return name === "content" ? this.content : null;
          },
        };
      }

      if (
        selector.includes('meta[itemprop="endDate"]') &&
        this.endDateContent !== null
      ) {
        return {
          content: this.endDateContent,
          getAttribute(name) {
            return name === "content" ? this.content : null;
          },
        };
      }

      if (selector.includes("ytd-watch-flexy") && this.watchFlexyVideoId !== null) {
        const watchFlexyVideoId = this.watchFlexyVideoId;

        return {
          getAttribute(name) {
            return name === "video-id" ? watchFlexyVideoId : null;
          },
        };
      }

      if (selector.includes("ytd-watch-flexy") && this.hasWatchLiveSignal) {
        return {};
      }

      if (selector.includes("ytd-live-chat-frame") && (this.hasLiveChatSignal || this.chat)) {
        return this.chat || {};
      }

      if (selector.includes("ytp-live") && this.hasLiveSignal) {
        return {};
      }

      return null;
    },
  });
}

function createSeekableRange(startValue) {
  return {
    length: 1,
    start(index) {
      assert.equal(index, 0);
      return startValue;
    },
  };
}

function createMutableSeekableRange(startValue) {
  return {
    length: 0,
    start(index) {
      assert.equal(index, 0);
      return startValue;
    },
  };
}

const LIVE_SETTINGS = Object.freeze({
  extensionEnabled: true,
  startLiveFromBeginning: true,
});

// Controller clock for tests: advance(ms) moves time forward and runs every
// timer that falls due, in order, as the browser would.
function createFakeClock() {
  const clock = {
    now: 0,
    timers: [],
    advance(ms) {
      const target = clock.now + ms;

      for (;;) {
        const due = clock.timers
          .filter((timer) => !timer.done && timer.dueAt <= target)
          .sort((first, second) => first.dueAt - second.dueAt)[0];

        if (!due) {
          break;
        }

        clock.now = due.dueAt;
        due.done = true;
        due.callback();
      }

      clock.now = target;
    },
  };

  clock.options = {
    now() {
      return clock.now;
    },
    setTimeout(callback, delay) {
      const timer = { callback, dueAt: clock.now + (delay || 0), done: false };
      clock.timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      if (timer) {
        timer.done = true;
      }
    },
  };

  return clock;
}

function createLiveVideo(overrides) {
  return Object.assign({
    currentTime: 300,
    duration: Infinity,
    muted: false,
    paused: false,
    readyState: 4,
    seeking: false,
    seekable: {
      length: 1,
      start() {
        return 24;
      },
      end() {
        return 3600;
      },
    },
    listeners: {},
    frameCallbacks: [],
    pauseCalls: 0,
    playCalls: 0,
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    removeEventListener(eventName, listener) {
      if (this.listeners[eventName] === listener) {
        delete this.listeners[eventName];
      }
    },
    requestVideoFrameCallback(callback) {
      this.frameCallbacks.push(callback);
    },
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    },
    play() {
      this.playCalls += 1;
      this.paused = false;
      return Promise.resolve();
    },
  }, overrides);
}

function createGuardWindow(href) {
  return {
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    location: { href },
  };
}

// Plays the MAIN-world bridge: answers every live-state request with
// answer() — { videoId, isLive } — or stays silent when it returns null.
function answerLiveStateRequests(doc, win, answer) {
  doc.addEventListener(content.LIVE_STATE_REQUEST_EVENT, (event) => {
    const reply = answer();

    if (!reply) {
      return;
    }

    doc.dispatchEvent(new win.CustomEvent(content.LIVE_STATE_RESULT_EVENT, {
      detail: JSON.stringify({
        canRewind: reply.canRewind === undefined ? null : reply.canRewind,
        isLive: reply.isLive,
        requestId: JSON.parse(event.detail).requestId,
        videoId: reply.videoId,
      }),
    }));
  });
}

function recordDispatchedEvents(doc) {
  const events = [];
  const dispatch = doc.dispatchEvent;

  doc.dispatchEvent = (event) => {
    events.push(event);
    return dispatch.call(doc, event);
  };

  return events;
}

function getLiveOverlay(doc) {
  return doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);
}

function getLiveOverlayButton(doc, action) {
  const overlay = getLiveOverlay(doc);
  return overlay && overlay.querySelector(`[data-live-guard-action="${action}"]`);
}

function isLiveObscured(doc) {
  return doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS);
}

// The guard is up and waiting: overlay shown, picture blurred, sound off,
// and nothing started playback.
function assertGuardHolds(doc, video) {
  assert.notEqual(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);
  assert.equal(video.playCalls, 0);
}

// R2: after the timeout without a known status the guard asks, offering
// "Start from beginning" and a plain "Play" instead of "Continue live".
function assertAsksAboutUnknownStatus(doc) {
  const overlay = getLiveOverlay(doc);

  assert.notEqual(overlay, null);
  assert.equal(
    overlay.querySelector(".yas-live-guard-copy").textContent,
    "Couldn't tell whether this is a live stream.",
  );
  assert.notEqual(getLiveOverlayButton(doc, "start"), null);
  assert.notEqual(getLiveOverlayButton(doc, "play"), null);
  assert.equal(getLiveOverlayButton(doc, "continue"), null);
}

test("getEnabledClassNames maps enabled settings to stable root classes", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: true,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      hideVideoTitles: true,
      startLiveFromBeginning: true,
      showSkipButtons: true,
      hideComments: true,
    }),
    [
        "yas-extension-enabled",
        "yas-hide-time",
        "yas-hide-player-progress-bar",
        "yas-hide-video-previews",
        "yas-hide-video-titles",
        "yas-start-live-from-beginning",
        "yas-show-skip-buttons",
        "yas-hide-comments",
      ],
  );
});

test("getEnabledClassNames returns no hiding classes when the extension is disabled", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: false,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      startLiveFromBeginning: true,
    }),
    [],
  );
});

test("getEnabledClassNames keeps time hiding enabled when stored setting is false", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: true,
      hideTime: false,
      hidePlayerProgressBar: true,
      hideVideoPreviews: false,
      startLiveFromBeginning: true,
      showSkipButtons: false,
      hideComments: false,
    }),
    [
      "yas-extension-enabled",
      "yas-hide-time",
      "yas-hide-player-progress-bar",
      "yas-start-live-from-beginning",
    ],
  );
});

test("getLiveStartTarget allows a protected YouTube watch page that has not been attempted", () => {
  assert.deepEqual(
    content.getLiveStartTarget(
      {
        extensionEnabled: true,
        startLiveFromBeginning: true,
      },
      {
        location: {
          href: "https://www.youtube.com/watch?v=abc123",
        },
      },
      new Set(),
    ),
    {
      shouldAttempt: true,
      videoId: "abc123",
    },
  );
});

test("getLiveStartTarget rejects disabled protection, disabled setting, and attempted videos", () => {
  assert.deepEqual(
    content.getLiveStartTarget(
      {
        extensionEnabled: false,
        startLiveFromBeginning: true,
      },
      {
        location: {
          href: "https://www.youtube.com/watch?v=abc123",
        },
      },
      new Set(),
    ),
    {
      shouldAttempt: false,
      videoId: "abc123",
    },
  );
  assert.deepEqual(
    content.getLiveStartTarget(
      {
        extensionEnabled: true,
        startLiveFromBeginning: false,
      },
      {
        location: {
          href: "https://www.youtube.com/watch?v=abc123",
        },
      },
      new Set(),
    ),
    {
      shouldAttempt: false,
      videoId: "abc123",
    },
  );
  assert.deepEqual(
    content.getLiveStartTarget(
      {
        extensionEnabled: true,
        startLiveFromBeginning: true,
      },
      {
        location: {
          href: "https://www.youtube.com/watch?v=abc123",
        },
      },
      new Set(["abc123"]),
    ),
    {
      shouldAttempt: false,
      videoId: "abc123",
    },
  );
});

test("seekToEarliestSeekablePosition moves the video to the earliest DVR point", () => {
  const video = {
    currentTime: 120,
    seekable: createSeekableRange(12),
  };

  assert.equal(content.seekToEarliestSeekablePosition(video), true);
  assert.equal(video.currentTime, 12);
});

test("isLikelyLivePlayback trusts matching page-world live state even with finite duration", () => {
  const doc = createLiveDocument({
    player: createElement("div"),
  });
  const video = {
    duration: 3600,
  };

  assert.equal(
    content.isLikelyLivePlayback(
      doc,
      video,
      "finite-live",
      {
        isLive: true,
        videoId: "finite-live",
      },
    ),
    true,
  );
});

test("live guard pauses and shields a live stream without seeking automatically", () => {
  const dispatchedEvents = [];
  const videoCurrentTimes = [];
  let pauseCalls = 0;
  const video = {
    duration: Infinity,
    seekable: createSeekableRange(24),
    get currentTime() {
      return videoCurrentTimes.at(-1) || 300;
    },
    set currentTime(value) {
      videoCurrentTimes.push(value);
    },
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "live-guard",
    hasWatchLiveSignal: true,
  });
  doc.dispatchEvent = (event) => {
    dispatchedEvents.push(event);
    return true;
  };
  const controller = content.createLiveStartController({
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options.detail;
    },
    location: {
      href: "https://www.youtube.com/watch?v=live-guard",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);

  assert.equal(pauseCalls, 1);
  assert.equal(videoCurrentTimes.length, 0);
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_START_SEEK_EVENT),
    false,
  );
  assert.equal(Boolean(overlay), true);
  assert.equal(
    overlay.querySelector(".yas-live-guard-title").textContent,
    "Spoiler protection is active",
  );
  assert.equal(
    doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS),
    true,
  );
});

test("live guard keeps a live stream paused until the user chooses an action", () => {
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "pause-lock",
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=pause-lock",
    },
  });

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(video.pauseCalls, 1);

  // Media events do not bubble: the lock listens on the document (capture).
  doc.dispatchEvent({ type: "play", target: video });

  assert.equal(video.pauseCalls, 2);

  getLiveOverlayButton(doc, "continue").click();
  doc.dispatchEvent({ type: "play", target: video });

  // The choice is made: the lock is gone with the guard.
  assert.equal(video.pauseCalls, 2);
});

test("live guard does not take a transient infinite duration alone for a live stream", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({ video, player: createElement("div") });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=regular-video",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // Still unknown at the timeout: ask instead of guessing (R2) — and not as
  // a live stream, so there is no "Continue live".
  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 1);
  assertAsksAboutUnknownStatus(doc);
});

test("live guard does not show for regular videos with false live metadata", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "False",
    metadataVideoId: "regular-with-meta",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=regular-with-meta",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  // An explicit "not live" for this very video: no guard at any point, the
  // eager shield is gone, and nothing is remembered as a choice.
  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
  assert.equal(isLiveObscured(doc), false);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard ignores player live control templates on regular videos", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    hasLiveSignal: true,
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=regular-with-player-template",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // Still unknown at the timeout: ask instead of guessing (R2) — and not as
  // a live stream, so there is no "Continue live".
  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 1);
  assertAsksAboutUnknownStatus(doc);
});

test("live guard ignores watch live attributes without matching live metadata", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=regular-with-watch-attrs",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // Still unknown at the timeout: ask instead of guessing (R2) — and not as
  // a live stream, so there is no "Continue live".
  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 1);
  assertAsksAboutUnknownStatus(doc);
});

test("live guard ignores stale true live metadata for another video", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "previous-live-video",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=current-regular-video",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // Still unknown at the timeout: ask instead of guessing (R2) — and not as
  // a live stream, so there is no "Continue live".
  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 1);
  assertAsksAboutUnknownStatus(doc);
});

test("live guard shows for videos with true live metadata", () => {
  let pauseCalls = 0;
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "true-live-meta",
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=true-live-meta",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 1);
  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard shows for the active YouTube player live class", () => {
  // A weak signal (unknown duration + live player class): during the grace
  // window only the shield (blur + mute), then the overlay.
  const clock = createFakeClock();
  const player = createElement("div");
  player.className = "html5-video-player ytp-live";
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=live-player-class"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(video.pauseCalls, 0);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);

  clock.advance(liveStart.LIVE_START_NOT_LIVE_GRACE_MS);

  assert.equal(video.pauseCalls, 1);
  assertGuardHolds(doc, video);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
});

test("live guard does not show for a live player class when the video has an end date", () => {
  // A finished broadcast's replay looks live while it loads; its end date is
  // an explicit "not live" and outweighs the weak signal.
  const clock = createFakeClock();
  const player = createElement("div");
  player.className = "html5-video-player ytp-live";
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    endDateContent: "2026-07-29T20:00:00+00:00",
    metadataVideoId: "ended-player-class",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=ended-player-class"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(isLiveObscured(doc), false);
  assert.equal(video.muted, false);

  clock.advance(content.LIVE_START_TIMEOUT_MS);

  assert.equal(video.pauseCalls, 0);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
});

test("live guard shows when YouTube exposes the live chat frame", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    hasLiveChatSignal: true,
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=live-chat-frame"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(video.pauseCalls, 0);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);

  clock.advance(liveStart.LIVE_START_NOT_LIVE_GRACE_MS);

  assert.equal(video.pauseCalls, 1);
  assertGuardHolds(doc, video);
});

test("live guard drops the shield when the bridge says a chat-frame video is not live", () => {
  // Weak signal first (chat frame + unknown duration), then an explicit
  // "not live" for this video inside the grace window: the shield drops
  // before any overlay was shown.
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=replay-chat");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    hasLiveChatSignal: true,
  });
  let bridgeAnswer = null;
  answerLiveStateRequests(doc, win, () => bridgeAnswer);
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);

  bridgeAnswer = { videoId: "replay-chat", isLive: false };
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(isLiveObscured(doc), false);
  assert.equal(video.muted, false);

  clock.advance(content.LIVE_START_TIMEOUT_MS);

  assert.equal(video.pauseCalls, 0);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
});

test("live guard pauses a finite-duration stream when page-world state confirms live", () => {
  let pauseCalls = 0;
  const video = {
    currentTime: 300,
    duration: 3600,
    seekable: createSeekableRange(24),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
  });
  const root = {
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    location: {
      href: "https://www.youtube.com/watch?v=finite-live",
    },
    setTimeout() {},
  };
  const controller = content.createLiveStartController(root);

  doc.addEventListener(content.LIVE_STATE_REQUEST_EVENT, (event) => {
    const request = JSON.parse(event.detail);

    doc.dispatchEvent(new root.CustomEvent(content.LIVE_STATE_RESULT_EVENT, {
      detail: JSON.stringify({
        // The player knows its rewind window, so the guard can pause at once
        // instead of letting the stream load first.
        canRewind: true,
        isLive: true,
        requestId: request.requestId,
        signals: {
          playerResponseLive: true,
        },
        videoId: "finite-live",
      }),
    }));
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 1);
  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard ignores a stale player live class after regular duration is known", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const player = createElement("div");
  player.className = "html5-video-player ytp-live";
  const video = {
    currentTime: 30,
    duration: 3600,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player,
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=regular-stale-player-live",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // Still unknown at the timeout: ask instead of guessing (R2) — and not as
  // a live stream, so there is no "Continue live".
  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 1);
  assertAsksAboutUnknownStatus(doc);
});

test("live guard overlay is mounted on the body and positioned over the player", () => {
  const player = createElement("div");
  player.getBoundingClientRect = () => ({
    left: 12,
    top: 34,
    width: 640,
    height: 360,
  });
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "player-area",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=player-area",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);

  assert.equal(overlay.parentNode, doc.body);
  assert.equal(overlay.style.left, "12px");
  assert.equal(overlay.style.top, "34px");
  assert.equal(overlay.style.width, "640px");
  assert.equal(overlay.style.height, "360px");
});

test("live guard overlay offsets by scroll so it tracks the player down the page", () => {
  const player = createElement("div");
  player.getBoundingClientRect = () => ({
    left: 10,
    top: -200,
    width: 640,
    height: 360,
  });
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "scrolled-player",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=scrolled-player",
    },
    scrollX: 0,
    scrollY: 500,
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);

  assert.equal(overlay.parentNode, doc.body);
  assert.equal(overlay.style.left, "10px");
  // top = viewport top (-200) + scrollY (500) = document-space 300px.
  assert.equal(overlay.style.top, "300px");
});

test("live guard overlay waits instead of mounting when player bounds are unavailable", () => {
  const player = createElement("div");
  player.skipBoundingClientRect = true;
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "no-player-bounds",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=no-player-bounds",
      },
    },
    {
      setTimeout() {},
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard remounts its overlay during a transient live-signal loss", () => {
  let now = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    seekable: createSeekableRange(0),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "flaky-signal-live",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=flaky-signal-live",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);
  assert.notEqual(overlay, null);

  // A watch-page re-render detaches the overlay and briefly drops every live
  // signal at once; the heartbeat must bring the buttons back regardless.
  overlay.remove();
  doc.liveBroadcastContent = null;
  doc.metadataVideoId = null;
  now += 1000;
  timers.at(-1)();

  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("chat spoiler guard keeps live chat blurred until explicitly disabled", () => {
  const chat = createElement("ytd-live-chat-frame");
  const doc = createLiveDocument({ chat });

  content.applySettings({
    extensionEnabled: true,
    startLiveFromBeginning: true,
  }, doc);

  const overlay = doc.getElementById(content.CHAT_GUARD_OVERLAY_ID);

  assert.equal(
    doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
    true,
  );
  assert.equal(overlay.parentNode, chat);
  assert.equal(
    overlay.querySelector(".yas-chat-guard-title").textContent,
    "Comments hidden",
  );
  assert.equal(
    overlay.querySelector('[data-chat-guard-action="show"]').textContent,
    "Show comments",
  );

  overlay.querySelector('[data-chat-guard-action="show"]').click();

  assert.equal(
    doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
    false,
  );
  assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
});

test("chat spoiler guard stays hidden when live protection is off", () => {
  const chat = createElement("ytd-live-chat-frame");
  const doc = createLiveDocument({ chat });

  content.applySettings({
    extensionEnabled: true,
    startLiveFromBeginning: false,
  }, doc);

  assert.equal(
    doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
    false,
  );
  assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
});

test("chat spoiler guard re-arms for the next video after being shown", () => {
  const docA = createLiveDocument({ chat: createElement("ytd-live-chat-frame") });

  globalThis.location = { href: "https://www.youtube.com/watch?v=first-live" };

  try {
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, docA);

    docA.getElementById(content.CHAT_GUARD_OVERLAY_ID)
      .querySelector('[data-chat-guard-action="show"]')
      .click();
    assert.equal(docA.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);

    // Same video: the choice sticks.
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, docA);
    assert.equal(docA.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);

    // A new video must not inherit "Show comments" from the previous stream.
    globalThis.location = { href: "https://www.youtube.com/watch?v=second-live" };
    const docB = createLiveDocument({ chat: createElement("ytd-live-chat-frame") });
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, docB);
    assert.notEqual(docB.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
  } finally {
    delete globalThis.location;
  }
});

test("chat spoiler guard leaves replay chat visible on finished-stream VODs", () => {
  const chat = createElement("ytd-live-chat-frame");
  const doc = createLiveDocument({
    chat,
    liveBroadcastContent: "True",
    endDateContent: "2026-08-01T00:00:00+00:00",
    metadataVideoId: "finished-vod",
  });

  globalThis.location = { href: "https://www.youtube.com/watch?v=finished-vod" };

  try {
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, doc);

    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      false,
    );
    assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
  } finally {
    delete globalThis.location;
    // The guard keeps a once-a-second check even here (I3); stop it.
    switchChatGuardOff();
  }
});

test("chat spoiler guard stays protective while live status is still unknown", () => {
  const chat = createElement("ytd-live-chat-frame");
  const doc = createLiveDocument({
    chat,
    metadataVideoId: "hydrating-stream",
  });

  globalThis.location = { href: "https://www.youtube.com/watch?v=hydrating-stream" };

  try {
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, doc);

    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      true,
    );
    assert.notEqual(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
  } finally {
    delete globalThis.location;
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: false,
    }, doc);
  }
});

test("chat spoiler guard does not run outside watch pages", () => {
  const doc = createLiveDocument({ chat: createElement("ytd-live-chat-frame") });

  globalThis.location = { href: "https://www.youtube.com/" };

  try {
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, doc);

    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      false,
    );
    assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
  } finally {
    delete globalThis.location;
  }
});

// Switches the module-level chat guard off, which also clears its pending
// check (a real timer when earlier tests left the guard on).
function switchChatGuardOff() {
  content.applySettings({
    extensionEnabled: true,
    startLiveFromBeginning: false,
  }, createLiveDocument({}));
}

// The chat guard and the module-level live controller in content.js use the
// global timers. This captures them so a test runs them by hand.
function captureGlobalTimers() {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];

  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, done: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (timers.includes(timer)) {
      timer.done = true;
      return;
    }

    originalClearTimeout(timer);
  };

  return {
    pending() {
      return timers.filter((timer) => !timer.done);
    },
    // Runs every timer that is pending right now, oldest first.
    runPending() {
      this.pending().forEach((timer) => {
        if (!timer.done) {
          timer.done = true;
          timer.callback();
        }
      });
    },
    restore() {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

test("chat spoiler guard keeps checking once a second after the quick retries", () => {
  switchChatGuardOff();
  const doc = createLiveDocument({});
  const timers = captureGlobalTimers();
  const retryBudget = content.LIVE_START_TIMEOUT_MS / content.LIVE_START_POLL_MS;

  globalThis.location = { href: "https://www.youtube.com/watch?v=late-chat" };

  try {
    // The comments guard keeps its own once-a-second check; this test
    // counts only the chat guard's.
    content.applySettings({ ...LIVE_SETTINGS, hideComments: false }, doc);

    // No chat frame yet: quick retries, within the budget.
    let quickRetries = 0;

    while (
      quickRetries <= retryBudget &&
      timers.pending()[0].delay === content.LIVE_START_POLL_MS
    ) {
      timers.runPending();
      quickRetries += 1;
    }

    assert.equal(quickRetries > 0 && quickRetries <= retryBudget, true);

    // Then one slow check at a time instead of giving up.
    assert.equal(timers.pending().length, 1);
    assert.equal(timers.pending()[0].delay, 1000);

    // The chat frame shows up late: the slow check still mounts the overlay.
    const chat = createElement("ytd-live-chat-frame");
    doc.chat = chat;
    doc.body.appendChild(chat);
    timers.runPending();

    assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID).parentNode, chat);
    assert.equal(timers.pending().length, 1);
    assert.equal(timers.pending()[0].delay, 1000);

    // YouTube re-creates the chat frame and the overlay goes with the old
    // one; the next check mounts it again.
    chat.remove();
    const recreatedChat = createElement("ytd-live-chat-frame");
    doc.chat = recreatedChat;
    doc.body.appendChild(recreatedChat);
    timers.runPending();

    assert.equal(
      doc.getElementById(content.CHAT_GUARD_OVERLAY_ID).parentNode,
      recreatedChat,
    );

    // Off the watch page the checks stop.
    globalThis.location = { href: "https://www.youtube.com/" };
    timers.runPending();

    assert.equal(timers.pending().length, 0);
    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      false,
    );
  } finally {
    timers.restore();
    delete globalThis.location;
    switchChatGuardOff();
  }
});

test("chat spoiler guard lifts when the page-world player says the video is not live", () => {
  switchChatGuardOff();
  const doc = createLiveDocument({ chat: createElement("ytd-live-chat-frame") });
  const shared = globalThis.YouTubeAntiSpoiler;
  const originalReadSettings = shared.readSettings;
  const timers = captureGlobalTimers();

  globalThis.location = { href: "https://www.youtube.com/watch?v=bridge-vod" };
  shared.readSettings = () => new Promise(() => {});
  answerLiveStateRequests(doc, globalThis, () => ({ videoId: "bridge-vod", isLive: false }));

  try {
    content.refreshProtection(doc);

    // The chat guard ran before the live controller asked the bridge.
    assert.notEqual(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);

    timers.runPending();

    // No DOM microdata here: the bridge's "not live" alone lifts the guard.
    assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      false,
    );
  } finally {
    delete globalThis.location;
    // Off the watch page, without a player: ends the module-level live guard.
    content.refreshProtection(doc);
    switchChatGuardOff();
    timers.restore();
    shared.readSettings = originalReadSettings;
  }
});

test("chat spoiler guard stays while the live guard waits for a choice, even if the stream ends", () => {
  switchChatGuardOff();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    chat: createElement("ytd-live-chat-frame"),
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "ends-while-waiting",
  });
  const shared = globalThis.YouTubeAntiSpoiler;
  const originalReadSettings = shared.readSettings;
  const timers = captureGlobalTimers();
  let isLive = true;

  globalThis.location = { href: "https://www.youtube.com/watch?v=ends-while-waiting" };
  shared.readSettings = () => new Promise(() => {});
  answerLiveStateRequests(doc, globalThis, () => ({ videoId: "ends-while-waiting", isLive }));

  try {
    content.refreshProtection(doc);

    assert.notEqual(getLiveOverlay(doc), null);
    assert.notEqual(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);

    // The stream ends while the live overlay waits: the bridge and the page
    // both say "not live" now. The chat of a just-ended stream shows the
    // result, so it stays covered.
    isLive = false;
    doc.endDateContent = "2026-11-05T20:00:00+00:00";
    timers.runPending();
    timers.runPending();

    assert.notEqual(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      true,
    );
    assert.notEqual(getLiveOverlay(doc), null);

    // Once the user has chosen, the chat follows the "not live" status again.
    getLiveOverlayButton(doc, "continue").click();
    timers.runPending();

    assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      false,
    );
  } finally {
    delete globalThis.location;
    // Player closed and off the watch page: ends the module-level live guard
    // even if an assertion above failed while it was still waiting.
    doc.player = null;
    content.refreshProtection(doc);
    switchChatGuardOff();
    timers.restore();
    shared.readSettings = originalReadSettings;
  }
});

test("live guard waits for the player instead of pausing a <video> outside it", () => {
  // I4 (was "waits for player bounds when the player host is unavailable",
  // where the guard paused a <video> found anywhere on the page).
  const clock = createFakeClock();
  const player = createElement("div");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "host-wait",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=host-wait"),
    clock.options,
  );

  // No #movie_player yet: the <video> on the page is not the guarded one.
  doc.player = null;
  controller.sync(LIVE_SETTINGS, doc);
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(video.pauseCalls, 0);
  assert.equal(video.muted, false);
  assert.equal(getLiveOverlay(doc), null);
  // The shield stays up meanwhile.
  assert.equal(isLiveObscured(doc), true);

  // The player shows up around it: now it is paused and the buttons appear.
  doc.player = player;
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.pauseCalls, 1);
  assertGuardHolds(doc, video);
});

test("live guard requests a page-world player pause when shown", () => {
  const dispatchedEvents = [];
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "page-world-pause",
    hasWatchLiveSignal: true,
  });
  doc.dispatchEvent = (event) => {
    dispatchedEvents.push(event);
    return true;
  };
  const controller = content.createLiveStartController({
    CustomEvent: function CustomEvent(type) {
      this.type = type;
    },
    location: {
      href: "https://www.youtube.com/watch?v=page-world-pause",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_STATE_REQUEST_EVENT),
    true,
  );
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_PAUSE_EVENT),
    true,
  );
});

test("live guard continue live removes protection and resumes playback", () => {
  const dispatchedEvents = [];
  let pauseCalls = 0;
  let playCalls = 0;
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {
      pauseCalls += 1;
    },
    play() {
      playCalls += 1;
      return Promise.resolve();
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "continue-live",
    hasWatchLiveSignal: true,
  });
  doc.dispatchEvent = (event) => {
    dispatchedEvents.push(event);
    return true;
  };
  const controller = content.createLiveStartController({
    CustomEvent: function CustomEvent(type) {
      this.type = type;
    },
    location: {
      href: "https://www.youtube.com/watch?v=continue-live",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);
  overlay.querySelector('[data-live-guard-action="continue"]').click();

  assert.equal(pauseCalls, 1);
  assert.equal(playCalls, 1);
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_CONTINUE_EVENT),
    true,
  );
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
  assert.equal(
    doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS),
    false,
  );
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["continue-live"]);
});

test("live guard continue live seeks the media element to the live edge", () => {
  const dispatchedEvents = [];
  const videoCurrentTimes = [];
  const video = {
    duration: Infinity,
    seekable: {
      length: 1,
      start() {
        return 24;
      },
      end(index) {
        assert.equal(index, 0);
        return 3600;
      },
    },
    get currentTime() {
      return videoCurrentTimes.at(-1) || 24;
    },
    set currentTime(value) {
      videoCurrentTimes.push(value);
    },
    pause() {},
    play() {
      return Promise.resolve();
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "continue-live-edge",
    hasWatchLiveSignal: true,
  });
  doc.dispatchEvent = (event) => {
    dispatchedEvents.push(event);
    return true;
  };
  const controller = content.createLiveStartController({
    CustomEvent: function CustomEvent(type) {
      this.type = type;
    },
    location: {
      href: "https://www.youtube.com/watch?v=continue-live-edge",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);
  overlay.querySelector('[data-live-guard-action="continue"]').click();

  // The media element is jumped to the latest seekable point (the live edge),
  // not left at the DVR start where the guard paused it.
  assert.deepEqual(videoCurrentTimes, [3600]);
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_CONTINUE_EVENT),
    true,
  );
});

test("live guard re-arms after a transient SPA give-up instead of poisoning the video", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  // YouTube swaps in the new live videoId before the broadcast metadata
  // hydrates, while a finite-duration <video> from the previous page lingers.
  const video = {
    currentTime: 300,
    duration: 3600,
    seekable: createSeekableRange(30),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    metadataVideoId: "spa-poison-guard",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=spa-poison-guard",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  // Past the not-live grace window with only the matching videoId (no live flag):
  // the guard must NOT treat this as a confirmed VOD and must NOT remember it.
  now = liveStart.LIVE_START_NOT_LIVE_GRACE_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  // The live stream finishes hydrating; the next sync arms the guard.
  video.duration = Infinity;
  doc.liveBroadcastContent = "True";
  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 1);
  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard start from beginning performs one user-triggered seek and resumes", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=start-from-beginning");
  const video = createLiveVideo({ seekable: createSeekableRange(24) });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "start-from-beginning",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  const seekEvents = dispatchedEvents.filter(
    (event) => event.type === content.LIVE_START_SEEK_EVENT,
  );

  assert.equal(seekEvents.length, 1);
  assert.deepEqual(JSON.parse(seekEvents[0].detail), {
    fallbackSeconds: 24,
    requestId: 1,
  });
  assert.equal(video.currentTime, 24);

  // The request alone proves nothing: the paused player may still show the
  // live frame while the DVR segment loads.
  assertGuardHolds(doc, video);

  video.listeners.seeked();

  // At the start, but the new frame is not drawn yet.
  assertGuardHolds(doc, video);
  assert.equal(video.frameCallbacks.length, 1);

  video.frameCallbacks[0]();

  assert.equal(video.playCalls, 1);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
  assert.equal(video.muted, false);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["start-from-beginning"]);
});

test("live guard keeps start from beginning disabled while the DVR window is still loading", () => {
  // R7: an empty seekable range at first means "not ready yet", not "no DVR".
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=dvr-loading");
  const video = createLiveVideo({ readyState: 0, seekable: { length: 0 } });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "dvr-loading",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);
  const startButton = getLiveOverlayButton(doc, "start");
  const status = overlay.querySelector(".yas-live-guard-status");

  assert.equal(startButton.hidden, false);
  assert.equal(startButton.disabled, true);
  assert.equal(status.hidden, false);
  assert.equal(status.textContent, "Checking whether the stream can be rewound…");

  // A click on the disabled button does nothing.
  startButton.click();

  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_START_SEEK_EVENT),
    false,
  );
  assert.equal(video.currentTime, 300);
  assertGuardHolds(doc, video);

  // The DVR window arrives: the same overlay is updated, not re-created.
  video.readyState = 1;
  video.seekable = createSeekableRange(24);
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(getLiveOverlay(doc), overlay);
  assert.equal(startButton.disabled, false);
  assert.equal(status.hidden, true);

  startButton.click();

  assert.equal(
    dispatchedEvents.filter((event) => event.type === content.LIVE_START_SEEK_EVENT).length,
    1,
  );
  assert.equal(video.currentTime, 24);
});

test("live guard says a stream can't be rewound when no rewind window loads in time", () => {
  // R12.4 (was "...only after metadata and a wait without DVR", R7): the
  // stream gets LIVE_START_TIMEOUT_MS of playing to load its rewind window,
  // whatever its readyState; then the guard pauses it and says so.
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=no-dvr");
  const video = createLiveVideo({ readyState: 0, seekable: { length: 0 } });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "no-dvr",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);

  const startButton = getLiveOverlayButton(doc, "start");
  const status = getLiveOverlay(doc).querySelector(".yas-live-guard-status");

  clock.advance(content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS);

  // Still loading: playing, hidden and muted, nothing paused.
  assert.equal(status.textContent, "Checking whether the stream can be rewound…");
  assert.equal(startButton.hidden, false);
  assert.equal(video.pauseCalls, 0);
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_PAUSE_EVENT),
    false,
  );

  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(
    status.textContent,
    "This stream can't be rewound. Continue live or leave the page.",
  );
  assert.equal(startButton.hidden, true);
  assert.equal(video.paused, true);
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_PAUSE_EVENT),
    true,
  );
  assertGuardHolds(doc, video);

  // "Continue live" is the remaining, explicit choice.
  getLiveOverlayButton(doc, "continue").click();

  assert.equal(video.playCalls, 1);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
});

test("live guard waits for a late live signal before showing the overlay", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 300,
    duration: 3600,
    seekable: createSeekableRange(30),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({ video, player: createElement("div") });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=late-live-guard",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  now = content.LIVE_START_POLL_MS;
  doc.liveBroadcastContent = "True";
  doc.metadataVideoId = "late-live-guard";
  timers.at(-1)();

  assert.equal(pauseCalls, 1);
  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard retries after stale SPA video data becomes the target live stream", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 300,
    duration: 3600,
    seekable: createSeekableRange(30),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({ video, player: createElement("div") });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=spa-live-guard",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  now = 1500;
  timers.at(-1)();

  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  video.duration = Infinity;
  doc.liveBroadcastContent = "True";
  doc.metadataVideoId = "spa-live-guard";
  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 1);
  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard re-mounts the overlay after a YouTube re-render detaches it", () => {
  const timers = [];
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "heal-overlay",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=heal-overlay",
      },
    },
    {
      now() {
        return 0;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // Simulate YouTube's SPA re-render detaching the body-mounted overlay.
  doc.getElementById(content.LIVE_GUARD_OVERLAY_ID).remove();
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);

  // The heartbeat re-mounts the buttons rather than leaving the stream paused
  // with no way to act.
  timers.at(-1)();
  assert.notEqual(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
});

test("live guard shields and mutes immediately while live status is unknown", () => {
  const timers = [];
  const video = {
    currentTime: 0,
    duration: NaN,
    muted: false,
    seekable: { length: 0 },
    pause() {},
  };
  const doc = createLiveDocument({ video, player: createElement("div") });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=unknown-status",
      },
    },
    {
      now() {
        return 0;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  // No overlay or pause yet — but the current moment is already blurred and
  // muted, so nothing leaks while the live status hydrates.
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
  assert.equal(
    doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS),
    true,
  );
  assert.equal(video.muted, true);
});

test("live guard drops the eager shield once the video is clearly not live", () => {
  const timers = [];
  const video = {
    currentTime: 30,
    duration: Infinity,
    muted: false,
    seekable: createSeekableRange(0),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "False",
    metadataVideoId: "shield-drop",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=shield-drop",
      },
    },
    {
      now() {
        return 0;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(
    doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS),
    false,
  );
  assert.equal(video.muted, false);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard does not re-shield a video it already resolved as not live", () => {
  let now = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: 3600,
    muted: false,
    seekable: createSeekableRange(0),
    pause() {},
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "False",
    metadataVideoId: "resolved-regular",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=resolved-regular",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  // First attempt: the not-live meta resolves it and the guard gives up after
  // the grace window.
  now = liveStart.LIVE_START_NOT_LIVE_GRACE_MS;
  timers.at(-1)();

  // A later sync (storage change, stray SPA event) must not blur the playing
  // video again while it "re-checks" — even without the meta present anymore.
  doc.liveBroadcastContent = null;
  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(
    doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS),
    false,
  );
  assert.equal(video.muted, false);
});

test("live guard does not arm for a finished broadcast VOD with an end date", () => {
  let now = 0;
  let pauseCalls = 0;
  const timers = [];
  const video = {
    currentTime: 30,
    duration: 7200,
    muted: false,
    seekable: createSeekableRange(0),
    pause() {
      pauseCalls += 1;
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    endDateContent: "2026-07-29T20:00:00+00:00",
    metadataVideoId: "ended-stream-vod",
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=ended-stream-vod",
      },
    },
    {
      now() {
        return now;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {},
    },
  );

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  // The ended marker is a positive not-live signal: no pause, no overlay, and
  // the eager shield drops right away.
  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
  assert.equal(
    doc.documentElement.classList.contains(content.LIVE_START_OBSCURED_CLASS),
    false,
  );
  assert.equal(video.muted, false);

  now = liveStart.LIVE_START_NOT_LIVE_GRACE_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard restores audio when the user continues live", () => {
  const video = {
    currentTime: 300,
    duration: Infinity,
    muted: false,
    seekable: {
      length: 1,
      start() {
        return 24;
      },
      end() {
        return 3600;
      },
    },
    pause() {},
    play() {
      return Promise.resolve();
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "unmute-continue",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=unmute-continue",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(video.muted, true);

  doc.getElementById(content.LIVE_GUARD_OVERLAY_ID)
    .querySelector('[data-live-guard-action="continue"]')
    .click();

  assert.equal(video.muted, false);
});

test("live guard leaves a user-muted stream muted after dismissal", () => {
  const video = {
    currentTime: 300,
    duration: Infinity,
    muted: true,
    seekable: {
      length: 1,
      start() {
        return 24;
      },
      end() {
        return 3600;
      },
    },
    pause() {},
    play() {
      return Promise.resolve();
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "stay-muted",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=stay-muted",
    },
  });

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  doc.getElementById(content.LIVE_GUARD_OVERLAY_ID)
    .querySelector('[data-live-guard-action="continue"]')
    .click();

  assert.equal(video.muted, true);
});

test("buildSpoilerCss targets YouTube thumbnail, player time, and progress selectors", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /ytd-thumbnail-overlay-time-status-renderer/);
  assert.match(css, /\.ytp-time-display/);
  assert.match(css, /\.ytp-progress-bar-container/);
  assert.match(css, /yas-hide-time/);
});

test("buildSpoilerCss blurs endscreen suggestions together with previews", () => {
  const css = content.buildSpoilerCss();

  // End cards, the post-playback videowall, and the autoplay "Up next"
  // screen all belong to the preview blur — they surface other videos'
  // thumbnails right when a match result is most at risk.
  [
    /\.ytp-ce-covering-image/,
    /\.ytp-ce-expanding-image/,
    /\.ytp-videowall-still-image/,
    /\.ytp-autonav-endscreen-upnext-thumbnail/,
  ].forEach((selector) => {
    assert.match(css, selector);
    const scoped = css.match(
      new RegExp(`html\\.yas-hide-video-previews [^{,]*${selector.source}`),
    );
    assert.notEqual(scoped, null, `${selector.source} scoped to preview class`);
  });
});

test("buildSpoilerCss blurs video titles under the title-hiding class", () => {
  const css = content.buildSpoilerCss();
  const titleRule = css.match(
    /html\.yas-hide-video-titles #video-title[\s\S]+?\{[\s\S]+?\}/,
  );

  assert.notEqual(titleRule, null);
  assert.match(titleRule[0], /filter:\s*blur/);
  assert.match(css, /html\.yas-hide-video-titles \.ytp-videowall-still-info-title/);
  assert.match(css, /html\.yas-hide-video-titles \.ytp-ce-video-title/);
  assert.match(css, /html\.yas-hide-video-titles \.ytp-autonav-endscreen-upnext-title/);
  assert.match(css, /html\.yas-hide-video-titles \.ytp-title-link/);
  assert.match(css, /html\.yas-hide-video-titles yt-lockup-metadata-view-model h3/);
  // Titles must stay clickable — no pointer-events lockout in the title rule.
  assert.doesNotMatch(titleRule[0], /pointer-events/);
});

test("buildSpoilerCss obscures the live player and live chat during live start", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /yas-live-start-obscured/);
  assert.match(css, /#movie_player/);
  assert.match(css, /ytd-live-chat-frame/);
  assert.match(css, /#chat/);
});

test("buildSpoilerCss does not force the live guard overlay over the full viewport", () => {
  const css = content.buildSpoilerCss();
  const overlayRule = css.match(
    /#youtube-anti-spoiler-live-guard[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(overlayRule, /position:\s*absolute/);
  assert.doesNotMatch(overlayRule, /position:\s*fixed/);
  assert.doesNotMatch(overlayRule, /inset:\s*0/);
  assert.doesNotMatch(overlayRule, /width:\s*100vw/);
  assert.doesNotMatch(overlayRule, /height:\s*100vh/);
});

test("buildSpoilerCss does not tie live chat blur to the live guard", () => {
  const css = content.buildSpoilerCss();

  assert.doesNotMatch(css, /html\.yas-start-live-from-beginning ytd-live-chat-frame/);
  assert.doesNotMatch(css, /html\.yas-live-start-obscured ytd-live-chat-frame/);
});

test("buildSpoilerCss hides live video pixels while the live guard is active", () => {
  // R12.2: the stream plays behind the guard while it loads its rewind
  // window; a blur would still let colours and motion through.
  const css = content.buildSpoilerCss();
  const liveVideoRule = css.match(
    /html\.yas-live-start-obscured #movie_player video[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(liveVideoRule, /html\.yas-live-start-obscured ytd-player video/);
  // The captions of the loading stream would show its commentary as text.
  assert.match(
    liveVideoRule,
    /html\.yas-live-start-obscured #movie_player \.ytp-caption-window-container/,
  );
  assert.match(liveVideoRule, /opacity:\s*0 !important/);
  assert.doesNotMatch(liveVideoRule, /filter:\s*blur\(/);
});

test("buildSpoilerCss keeps chat spoiler protection separate from the live guard", () => {
  const css = content.buildSpoilerCss();
  const chatRule = css.match(
    /html\.yas-chat-spoiler-protection ytd-live-chat-frame iframe[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(chatRule, /filter:\s*blur\(18px\)/);
  assert.doesNotMatch(chatRule, /yas-live-start-obscured/);
  assert.match(css, /#youtube-anti-spoiler-chat-guard/);
});

test("buildSpoilerCss targets compact video list duration badges", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /ytd-compact-video-renderer[^\n]+badge-shape-wiz/);
  assert.match(css, /yt-lockup-view-model[^\n]+badge-shape-wiz/);
});

test("buildSpoilerCss targets YouTube's ytBadgeShapeText duration class", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /\.ytBadgeShapeText/);
});

test("buildSpoilerCss keeps live thumbnail badges visible when hiding time", () => {
  const css = content.buildSpoilerCss();
  const thumbnailTimeRule = css.match(
    /html\.yas-hide-time[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(
    thumbnailTimeRule,
    /\.ytBadgeShapeText:not\(\.shortsLockupViewModelHost \*\):not\(\.ytBadgeShapeThumbnailLive\)/,
  );
  assert.match(thumbnailTimeRule, /:not\(\.ytBadgeShapeThumbnailLive \*\)/);
  assert.match(thumbnailTimeRule, /:not\(:has\(\.ytBadgeShapeThumbnailLive\)\)/);
});

test("buildSpoilerCss keeps the red LIVE badge under search result titles visible when hiding time", () => {
  const css = content.buildSpoilerCss();
  const thumbnailTimeRule = css.match(
    /html\.yas-hide-time[\s\S]+?\{[\s\S]+?\}/,
  )[0];
  const badgeTextSelector = thumbnailTimeRule
    .split(",\n")
    .find((selector) => selector.includes(".ytBadgeShapeText"));

  assert.ok(badgeTextSelector, "the time rule still hides .ytBadgeShapeText duration badges");
  assert.match(badgeTextSelector, /:not\(\.ytBadgeShapeLive\)/);
  assert.match(badgeTextSelector, /:not\(\.ytBadgeShapeLive \*\)/);
  assert.match(badgeTextSelector, /:not\(:has\(\.ytBadgeShapeLive\)\)/);
});

test("buildSpoilerCss hides player seek preview time with the time setting", () => {
  const css = content.buildSpoilerCss();
  const playerTimeRule = css.match(
    /html\.yas-hide-time \.ytp-time-display[\s\S]+?\{[\s\S]+?\}/,
  )[0];
  const progressRule = css.match(
    /html\.yas-hide-player-progress-bar[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(playerTimeRule, /\.ytp-tooltip-text/);
  assert.match(playerTimeRule, /\.ytp-tooltip-bottom-text/);
  assert.match(playerTimeRule, /\.ytp-tooltip-duration/);
  assert.match(playerTimeRule, /\.ytp-tooltip-progress-bar-pill-time-stamp/);
  assert.match(playerTimeRule, /\.ytPlayerStoryboardTimestamp/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-text/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-bottom-text/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-duration/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-progress-bar-pill-time-stamp/);
  assert.doesNotMatch(progressRule, /\.ytPlayerStoryboardTimestamp/);
});

test("buildSpoilerCss hides progress overlays with the progress setting", () => {
  const css = content.buildSpoilerCss();
  const progressRule = css.match(
    /html\.yas-hide-player-progress-bar[\s\S]+?\{[\s\S]+?\}/,
  )[0];
  const playerTimeRule = css.match(
    /html\.yas-hide-time \.ytp-time-display[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.doesNotMatch(progressRule, /ytThumbnailBottomOverlayViewModelHost/);
  assert.doesNotMatch(progressRule, /ThumbnailBottomOverlayViewModelHost/);
  assert.doesNotMatch(progressRule, /\.ytPlayerProgressBarProgressBar/);
  assert.match(progressRule, /\.ytPlayerProgressBarHost/);
  assert.match(progressRule, /\.ytPlayerProgressBarHostBottomInset/);
  assert.match(progressRule, /\.ytThumbnailOverlayProgressBarHostWatchedProgressBar/);
  assert.match(progressRule, /\.ytThumbnailOverlayProgressBarHostUseLegacyBar/);
  assert.doesNotMatch(playerTimeRule, /\.ytPlayerProgressBarHost/);
  assert.doesNotMatch(playerTimeRule, /\.ytPlayerProgressBarHostBottomInset/);
  assert.doesNotMatch(playerTimeRule, /\.ytThumbnailOverlayProgressBarHostWatchedProgressBar/);
  assert.doesNotMatch(playerTimeRule, /\.ytThumbnailOverlayProgressBarHostUseLegacyBar/);
  assert.match(progressRule, /ytd-thumbnail-overlay-resume-playback-renderer/);
});

test("buildSpoilerCss blurs video preview thumbnails separately", () => {
  const css = content.buildSpoilerCss();
  const previewRule = css.match(
    /html\.yas-hide-video-previews[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(css, /yas-hide-video-previews/);
  assert.match(css, /ytd-thumbnail[^\n]+img/);
  assert.match(css, /yt-thumbnail-view-model[^\n]+video/);
  assert.match(previewRule, /filter:\s*blur\(24px\)/);
  assert.doesNotMatch(previewRule, /visibility:\s*hidden/);
  assert.doesNotMatch(previewRule, /opacity:\s*0/);
});

test("refreshProtection hides spoilers before the storage read answers", async () => {
  const doc = createLiveDocument({});
  const shared = globalThis.YouTubeAntiSpoiler;
  const originalReadSettings = shared.readSettings;
  const classes = doc.documentElement.classList;
  let answerRead;

  shared.readSettings = () => new Promise((resolve) => {
    answerRead = resolve;
  });

  try {
    const pendingRefresh = content.refreshProtection(doc);

    // Storage has not answered yet, but protection is already in place.
    assert.equal(classes.contains("yas-extension-enabled"), true);
    assert.equal(classes.contains("yas-hide-time"), true);
    assert.equal(classes.contains("yas-hide-player-progress-bar"), true);

    answerRead({ extensionEnabled: false });
    await pendingRefresh;

    assert.equal(classes.contains("yas-hide-time"), false);

    // The next navigation applies the stored "off" at once instead of
    // flashing protection back on while storage is read again.
    shared.readSettings = () => new Promise(() => {});
    content.refreshProtection(doc);

    assert.equal(classes.contains("yas-hide-time"), false);
  } finally {
    shared.readSettings = () => Promise.resolve(shared.normalizeSettings({}));
    await content.refreshProtection(doc);
    shared.readSettings = originalReadSettings;
  }
});

test("buildSpoilerCss hides durations in the 2026 end-of-video grid and Up next", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /html\.yas-hide-time \.ytp-modern-videowall-still-info-duration/);
  assert.match(css, /html\.yas-hide-time \.ytp-autonav-timestamp/);
  // The empty duration pill is hidden as a whole, but LIVE badges stay.
  assert.match(
    css,
    /html\.yas-hide-time yt-thumbnail-badge-view-model:not\(\.ytBadgeShapeThumbnailLive\)[^,]*:not\(:has\(\.ytBadgeShapeThumbnailLive\)\)/,
  );
});

function assertScoped(css, className, selectors) {
  selectors.forEach((selector) => {
    assert.ok(
      css.includes(`html.${className} ${selector}`),
      `${selector} is scoped under ${className}`,
    );
  });
}

test("buildSpoilerCss hides timestamps in descriptions, chapters, and transcripts", () => {
  const css = content.buildSpoilerCss();

  assertScoped(css, "yas-hide-time", [
    'a.ytAttributedStringLink[href*="&t="]',
    'a.ytAttributedStringLink[href*="?t="]',
    "ytd-macro-markers-list-item-renderer #time",
    ".ytwTranscriptSegmentViewModelTimestamp",
    "ytd-video-renderer .metadata-snippet-container-one-line",
  ]);

  // "list=" also ends in "t=": a bare [href*="t="] would hide playlist links.
  assert.equal(css.includes('[href*="t="]'), false);
});

test("buildSpoilerCss blurs the new grid, hover previews, and chapter thumbnails", () => {
  assertScoped(content.buildSpoilerCss(), "yas-hide-video-previews", [
    ".ytp-modern-videowall-still-image",
    ".ytp-cued-thumbnail-overlay-image",
    "ytd-video-preview video",
    "ytd-macro-markers-list-item-renderer #thumbnail img",
    "ytd-watch-card-hero-video-renderer #hero-image img",
  ]);
});

test("buildSpoilerCss blurs titles in the new grid, fullscreen, Shorts, and search cards", () => {
  assertScoped(content.buildSpoilerCss(), "yas-hide-video-titles", [
    ".ytp-modern-videowall-still-info-title",
    ".ytPlayerOverlayVideoDetailsRendererTitle",
    ".ytLockupMetadataViewModelTitle",
    ".shortsLockupViewModelHostMetadataTitle",
    "yt-shorts-video-title-view-model",
    "ytd-watch-card-hero-video-renderer #watch-card-title",
  ]);
});

test("buildSpoilerCss hides the player's cued thumbnail during the live guard", () => {
  // B16, with R12.2: hidden like the video itself, not blurred.
  const css = content.buildSpoilerCss();
  const liveVideoRule = css.match(
    /html\.yas-live-start-obscured #movie_player video[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(
    liveVideoRule,
    /html\.yas-live-start-obscured #movie_player \.ytp-cued-thumbnail-overlay-image/,
  );
  assert.match(liveVideoRule, /opacity:\s*0 !important/);
});

// R1: "Start from beginning" lifts protection only after a confirmed jump.

test("live guard start from beginning holds while the video is still seeking", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "still-seeking",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=still-seeking"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  // currentTime already reads the target, but the seek is not finished.
  video.seeking = true;
  video.listeners.seeked();
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);

  assert.equal(video.currentTime, 24);
  assert.equal(video.frameCallbacks.length, 0);
  assertGuardHolds(doc, video);

  video.seeking = false;
  video.listeners.seeked();

  assertGuardHolds(doc, video);

  video.frameCallbacks[0]();

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(video.playCalls, 1);
});

test("live guard confirms a jump on a paused video that draws no new frame", () => {
  // A paused <video> may not present a frame until it plays. After "seeked"
  // at the start, a short wait without the frame callback is proof enough.
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "paused-no-frame",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=paused-no-frame"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();
  video.listeners.seeked();
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS - 1);

  assertGuardHolds(doc, video);

  clock.advance(1);

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
  assert.equal(video.playCalls, 1);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["paused-no-frame"]);
});

test("live guard falls back to one animation frame when the video has no frame callback", () => {
  const frames = [];
  const win = createGuardWindow("https://www.youtube.com/watch?v=animation-frame");
  win.requestAnimationFrame = (callback) => {
    frames.push(callback);
  };
  const video = createLiveVideo({ requestVideoFrameCallback: undefined });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "animation-frame",
  });
  const controller = content.createLiveStartController(win, createFakeClock().options);

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();
  video.listeners.seeked();

  assertGuardHolds(doc, video);
  assert.equal(frames.length, 1);

  frames[0]();

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(video.playCalls, 1);
});

test("live guard keeps protection and offers both buttons again when the jump fails", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "jump-fails",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=jump-fails"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  // The player snaps back toward the live edge right after the seek.
  video.listeners.seeked();
  video.currentTime = 3590;
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);

  assertGuardHolds(doc, video);

  clock.advance(
    liveStart.LIVE_START_SEEK_CONFIRM_TIMEOUT_MS - liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS,
  );

  const status = getLiveOverlay(doc).querySelector(".yas-live-guard-status");

  assert.equal(status.hidden, false);
  assert.equal(status.textContent, "Couldn't jump to the beginning.");
  assert.equal(getLiveOverlayButton(doc, "start").disabled, false);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
  assertGuardHolds(doc, video);

  // A late frame from the abandoned jump changes nothing.
  video.frameCallbacks.forEach((callback) => callback());

  assertGuardHolds(doc, video);

  // Trying again is a new jump.
  getLiveOverlayButton(doc, "start").click();

  const seekEvents = dispatchedEvents.filter(
    (event) => event.type === content.LIVE_START_SEEK_EVENT,
  );

  assert.equal(seekEvents.length, 2);
  assert.equal(JSON.parse(seekEvents[1].detail).requestId, 2);
  assert.equal(status.hidden, true);
});

test("live guard ignores a late seek confirmation after the player moved to another video", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=first-stream");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "first-stream",
  });
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  const staleSeeked = video.listeners.seeked;
  staleSeeked();

  // SPA navigation to another live stream in the same <video> element.
  win.location.href = "https://www.youtube.com/watch?v=second-stream";
  doc.metadataVideoId = "second-stream";
  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(video.listeners.seeked, undefined);

  staleSeeked();
  video.frameCallbacks.forEach((callback) => callback());
  clock.advance(liveStart.LIVE_START_SEEK_CONFIRM_TIMEOUT_MS);

  // The second stream's guard is untouched by the first one's jump.
  assertGuardHolds(doc, video);
  assert.equal(getLiveOverlay(doc).querySelector(".yas-live-guard-status").hidden, true);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard drops a pending jump when protection is switched off", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "switched-off",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=switched-off"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();
  video.listeners.seeked();
  controller.sync({ extensionEnabled: true, startLiveFromBeginning: false }, doc);

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);

  video.frameCallbacks.forEach((callback) => callback());
  clock.advance(liveStart.LIVE_START_SEEK_CONFIRM_TIMEOUT_MS);

  // Nothing starts playback on its own, and no choice is recorded.
  assert.equal(video.playCalls, 0);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

// R2, R3: unknown status and a stream that ends under the overlay.

test("live guard asks with Start from beginning and Play when the status stays unknown", () => {
  const clock = createFakeClock();
  const video = createLiveVideo({ duration: NaN });
  const doc = createLiveDocument({ video, player: createElement("div") });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=unknown-for-long"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  clock.advance(content.LIVE_START_TIMEOUT_MS - content.LIVE_START_POLL_MS);

  // Shielded the whole time, but no pause or overlay yet.
  assert.equal(video.pauseCalls, 0);
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);

  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.pauseCalls, 1);
  assertAsksAboutUnknownStatus(doc);
  assertGuardHolds(doc, video);

  getLiveOverlayButton(doc, "play").click();

  // Plays from where it is: no jump to a live edge.
  assert.equal(video.currentTime, 300);
  assert.equal(video.playCalls, 1);
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_PLAY_EVENT),
    true,
  );
  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_GUARD_CONTINUE_EVENT),
    false,
  );
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
  assert.equal(video.muted, false);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["unknown-for-long"]);
});

test("live guard keeps a shown overlay when the stream ends before the user chooses", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=ends-under-overlay");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "ends-under-overlay",
  });
  let bridgeAnswer = { videoId: "ends-under-overlay", isLive: true };
  answerLiveStateRequests(doc, win, () => bridgeAnswer);
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);

  // The stream ends: the page gains an end date, the bridge says not live.
  // Lifting the guard now would show the finale.
  doc.endDateContent = "2026-11-05T20:00:00+00:00";
  bridgeAnswer = { videoId: "ends-under-overlay", isLive: false };
  clock.advance(2 * content.LIVE_START_TIMEOUT_MS);

  assert.equal(getLiveOverlay(doc), overlay);
  assertGuardHolds(doc, video);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

// R4: when the guard ends, and what a choice covers.

// Arms the guard on a watch page, then goes to the home page while the
// mini-player keeps the stream. guard.bridgeAnswer is what the bridge says.
function armGuardThenLeaveForHome(videoId) {
  const clock = createFakeClock();
  const win = createGuardWindow(`https://www.youtube.com/watch?v=${videoId}`);
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: videoId,
  });
  const guard = { clock, win, video, doc, bridgeAnswer: { videoId, isLive: true } };

  answerLiveStateRequests(doc, win, () => guard.bridgeAnswer);
  guard.controller = content.createLiveStartController(win, clock.options);
  guard.controller.sync(LIVE_SETTINGS, doc);
  win.location.href = "https://www.youtube.com/";
  guard.controller.sync(LIVE_SETTINGS, doc);
  assertGuardHolds(doc, video);
  return guard;
}

function assertGuardEnded(guard) {
  assert.equal(getLiveOverlay(guard.doc), null);
  assert.equal(isLiveObscured(guard.doc), false);
  assert.equal(guard.video.muted, false);
  assert.deepEqual([...guard.controller.getAttemptedVideoIds()], []);
}

test("live guard follows the mini-player and comes back with the buttons on return", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=mini-stream");
  const player = createElement("div");
  let playerWidth = 640;
  player.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: playerWidth,
    height: (playerWidth * 9) / 16,
  });
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "mini-stream",
  });
  answerLiveStateRequests(doc, win, () => ({ videoId: "mini-stream", isLive: true }));
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);
  const copy = overlay.querySelector(".yas-live-guard-copy");

  assert.equal(copy.hidden, false);

  // Home page, the stream goes on in the small mini-player.
  win.location.href = "https://www.youtube.com/";
  playerWidth = 400;
  controller.sync(LIVE_SETTINGS, doc);
  clock.advance(5 * liveStart.LIVE_GUARD_PLAYER_GONE_MS);

  assert.equal(getLiveOverlay(doc), overlay);
  assertGuardHolds(doc, video);
  // Compact: title and buttons stay, the explanation goes.
  assert.equal(copy.hidden, true);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);

  // Back on the watch page: the same guard, full size again.
  win.location.href = "https://www.youtube.com/watch?v=mini-stream";
  playerWidth = 640;
  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(getLiveOverlay(doc), overlay);
  assert.equal(copy.hidden, false);
  assertGuardHolds(doc, video);
});

test("live guard ends when the mini-player is closed", () => {
  const guard = armGuardThenLeaveForHome("closed-mini");

  guard.doc.player = null;
  guard.clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assertGuardEnded(guard);
});

test("live guard ends when the player shows another video off the watch page", () => {
  const guard = armGuardThenLeaveForHome("replaced-mini");

  guard.bridgeAnswer = { videoId: "another-video", isLive: false };
  guard.clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assertGuardEnded(guard);
});

test("live guard ends when the bridge stops naming the video for three seconds", () => {
  const guard = armGuardThenLeaveForHome("silent-mini");

  guard.bridgeAnswer = null;
  guard.clock.advance(liveStart.LIVE_GUARD_PLAYER_GONE_MS - liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assertGuardHolds(guard.doc, guard.video);

  guard.clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assertGuardEnded(guard);
});

test("live guard survives YouTube re-creating the <video> element", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "video-swap",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=video-swap"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);

  doc.video = null;
  clock.advance(3 * liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(getLiveOverlay(doc), overlay);
  assert.equal(isLiveObscured(doc), true);

  // The new element is caught as soon as it starts, before any heartbeat.
  const recreatedVideo = createLiveVideo();
  doc.video = recreatedVideo;
  doc.dispatchEvent({ type: "play", target: recreatedVideo });

  assert.equal(recreatedVideo.pauseCalls, 1);
  assertGuardHolds(doc, recreatedVideo);
});

test("live guard remembers a choice on the same video and asks again after another video", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=stream-a");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "stream-a",
  });
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "continue").click();

  // Re-renders and repeated SPA events of the same page: no new overlay.
  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(getLiveOverlay(doc), null);

  // Home with the mini-player and back: still the same video.
  win.location.href = "https://www.youtube.com/";
  controller.sync(LIVE_SETTINGS, doc);
  win.location.href = "https://www.youtube.com/watch?v=stream-a";
  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(getLiveOverlay(doc), null);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["stream-a"]);

  // Another video resets the choices.
  win.location.href = "https://www.youtube.com/watch?v=regular-b";
  doc.metadataVideoId = "regular-b";
  doc.liveBroadcastContent = "False";
  controller.sync(LIVE_SETTINGS, doc);

  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  // Coming back to the stream asks again.
  win.location.href = "https://www.youtube.com/watch?v=stream-a";
  doc.metadataVideoId = "stream-a";
  doc.liveBroadcastContent = "True";
  controller.sync(LIVE_SETTINGS, doc);

  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
});

// R5: ads.

test("live guard lets a pre-roll ad play under blur and mute, then asks", () => {
  const clock = createFakeClock();
  const player = createElement("div");
  player.className = "html5-video-player ad-showing";
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "ad-first",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=ad-first"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  const note = doc.getElementById(liveStart.LIVE_GUARD_AD_NOTE_ID);

  assert.notEqual(note, null);
  // Click-through, so "Skip ad" underneath stays usable.
  assert.equal(note.style.pointerEvents, "none");
  assert.equal(note.children[0].textContent, "Ad — the choice will appear after it");
  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);
  assert.equal(video.pauseCalls, 0);

  // The ad keeps playing; the lock only keeps it muted.
  doc.dispatchEvent({ type: "play", target: video });
  clock.advance(5 * content.LIVE_START_POLL_MS);

  assert.equal(video.pauseCalls, 0);
  assert.equal(video.muted, true);

  // The ad ends and the stream starts: paused at once, then the buttons.
  player.className = "html5-video-player";
  doc.dispatchEvent({ type: "playing", target: video });

  assert.equal(video.pauseCalls, 1);

  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(doc.getElementById(liveStart.LIVE_GUARD_AD_NOTE_ID), null);
  assertGuardHolds(doc, video);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard swaps the overlay for the ad note when an ad starts later", () => {
  const clock = createFakeClock();
  const player = createElement("div");
  player.className = "html5-video-player";
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "ad-later",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=ad-later"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  const staleContinueButton = getLiveOverlayButton(doc, "continue");

  // A jump is pending when the ad starts.
  getLiveOverlayButton(doc, "start").click();
  player.className = "html5-video-player ad-interrupting";
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(getLiveOverlay(doc), null);
  assert.notEqual(doc.getElementById(liveStart.LIVE_GUARD_AD_NOTE_ID), null);
  assert.equal(video.listeners.seeked, undefined);
  // The guard undoes its own pause once, so the ad can run.
  assert.equal(video.playCalls, 1);
  assert.equal(
    dispatchedEvents.filter((event) => event.type === content.LIVE_GUARD_PLAY_EVENT).length,
    1,
  );

  // A click that lands on the old overlay during the ad is not a choice.
  staleContinueButton.click();
  clock.advance(5 * content.LIVE_START_POLL_MS);

  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.playCalls, 1);

  // The ad ends: paused again, buttons back.
  const pausesDuringAd = video.pauseCalls;
  player.className = "html5-video-player";
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.pauseCalls > pausesDuringAd, true);
  assert.equal(doc.getElementById(liveStart.LIVE_GUARD_AD_NOTE_ID), null);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
});

// R6: which playback the lock touches.

test("live guard only intercepts playback inside the guarded player", () => {
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "lock-scope",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=lock-scope"),
    createFakeClock().options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  // A hover preview elsewhere on the page is left alone.
  const preview = createLiveVideo();
  doc.dispatchEvent({ type: "play", target: preview });

  assert.equal(preview.pauseCalls, 0);
  assert.equal(preview.muted, false);

  // A <video> YouTube puts into the player after the guard armed is stopped
  // as soon as it loads.
  const replacement = createLiveVideo();
  doc.video = replacement;
  doc.dispatchEvent({ type: "loadeddata", target: replacement });

  assert.equal(replacement.pauseCalls, 1);
  assert.equal(replacement.muted, true);
});

test("live guard only mutes new playback while the shield waits for the live status", () => {
  const video = createLiveVideo({ duration: NaN });
  const doc = createLiveDocument({ video, player: createElement("div") });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=shield-lock"),
    createFakeClock().options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);

  const replacement = createLiveVideo({ duration: NaN });
  doc.video = replacement;
  doc.dispatchEvent({ type: "playing", target: replacement });

  assert.equal(replacement.muted, true);
  assert.equal(replacement.pauseCalls, 0);
});

// B10: fullscreen.

function createFullscreenElement() {
  const fullscreen = createElement("div");
  fullscreen.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 1920,
    height: 1080,
  });
  return fullscreen;
}

test("live guard mounts the overlay inside the fullscreen element", () => {
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "fullscreen-before",
  });
  const fullscreen = createFullscreenElement();
  doc.body.appendChild(fullscreen);
  doc.fullscreenElement = fullscreen;
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=fullscreen-before"),
    createFakeClock().options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);

  assert.equal(overlay.parentNode, fullscreen);
  assert.equal(overlay.style.left, "0px");
  assert.equal(overlay.style.top, "0px");
  assert.equal(overlay.style.width, "1920px");
  assert.equal(overlay.style.height, "1080px");
});

test("live guard moves the overlay into fullscreen and back out", () => {
  const player = createElement("div");
  player.getBoundingClientRect = () => ({
    left: 12,
    top: 34,
    width: 640,
    height: 360,
  });
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "fullscreen-after",
  });
  const fullscreen = createFullscreenElement();
  doc.body.appendChild(fullscreen);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=fullscreen-after"),
    createFakeClock().options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);

  assert.equal(overlay.parentNode, doc.body);

  doc.fullscreenElement = fullscreen;
  doc.dispatchEvent({ type: "fullscreenchange" });

  assert.equal(overlay.parentNode, fullscreen);
  assert.equal(overlay.style.left, "0px");
  assert.equal(overlay.style.width, "1920px");

  doc.fullscreenElement = null;
  doc.dispatchEvent({ type: "fullscreenchange" });

  assert.equal(overlay.parentNode, doc.body);
  assert.equal(overlay.style.left, "12px");
  assert.equal(overlay.style.top, "34px");
  assert.equal(overlay.style.width, "640px");
});

// R9: channel "live" URLs.

test("getLiveStartVideoId reads the stream id on channel live pages", () => {
  const doc = createLiveDocument({ watchFlexyVideoId: "channel-live-id" });

  [
    "/@somechannel/live",
    "/channel/UC1234567890/live",
    "/c/somename/live",
    "/user/someuser/live",
  ].forEach((path) => {
    assert.equal(
      content.getLiveStartVideoId({ location: { href: `https://www.youtube.com${path}` } }, doc),
      "channel-live-id",
      path,
    );
  });

  // Without the watch page element, the page's canonical link names it.
  const canonicalDoc = {
    querySelector(selector) {
      if (selector !== "link[rel=\"canonical\"]") {
        return null;
      }

      return {
        getAttribute(name) {
          return name === "href" ? "https://www.youtube.com/watch?v=canonical-id" : null;
        },
      };
    },
  };

  assert.equal(
    content.getLiveStartVideoId(
      { location: { href: "https://www.youtube.com/@somechannel/live" } },
      canonicalDoc,
    ),
    "canonical-id",
  );

  // Other channel pages are not watch pages.
  assert.equal(
    content.getLiveStartVideoId(
      { location: { href: "https://www.youtube.com/@somechannel/videos" } },
      doc,
    ),
    null,
  );
});

test("live guard protects a stream opened from a channel's /live page", () => {
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    watchFlexyVideoId: "channel-stream",
    liveBroadcastContent: "True",
    metadataVideoId: "channel-stream",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/@somechannel/live"),
    createFakeClock().options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assertGuardHolds(doc, video);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
});

// R12: a paused live player never learns its rewind window, so the stream
// loads (muted, hidden) until the window is known.

function countEvents(events, type) {
  return events.filter((event) => event.type === type).length;
}

test("live guard lets a stream load muted and hidden until its rewind window is known", () => {
  // As on live YouTube: the guard engages before playback has started.
  const clock = createFakeClock();
  const video = createLiveVideo({ paused: true, readyState: 0, seekable: { length: 0 } });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "loading-stream",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=loading-stream"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  const startButton = getLiveOverlayButton(doc, "start");
  const status = getLiveOverlay(doc).querySelector(".yas-live-guard-status");

  // Nothing pauses the player, here or in the page world.
  assert.equal(video.pauseCalls, 0);
  assert.equal(countEvents(dispatchedEvents, content.LIVE_GUARD_PAUSE_EVENT), 0);
  assert.equal(startButton.disabled, true);
  assert.equal(status.textContent, "Checking whether the stream can be rewound…");

  // YouTube starts the stream: the lock lets it play, without sound, and
  // the protection class keeps its pixels hidden.
  video.paused = false;
  doc.dispatchEvent({ type: "play", target: video });
  doc.dispatchEvent({ type: "playing", target: video });
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.pauseCalls, 0);
  assert.equal(video.paused, false);
  assert.equal(video.muted, true);
  assert.equal(isLiveObscured(doc), true);

  // The rewind window is known: paused at once, and the button works.
  video.readyState = 1;
  video.seekable = createSeekableRange(24);
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.paused, true);
  assert.equal(countEvents(dispatchedEvents, content.LIVE_GUARD_PAUSE_EVENT), 1);
  assert.equal(startButton.disabled, false);
  assert.equal(status.hidden, true);
  assertGuardHolds(doc, video);

  // From here the lock pauses again.
  const pausesBefore = video.pauseCalls;
  doc.dispatchEvent({ type: "play", target: video });

  assert.equal(video.pauseCalls, pausesBefore + 1);
});

test("live guard starts a stream it paused once the rewind window is unknown again", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "window-lost",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=window-lost"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assert.equal(video.paused, true);

  // YouTube reloads the stream's media: the rewind window is unknown again.
  // The guard paused this stream, so it starts it, muted and hidden.
  video.readyState = 0;
  video.seekable = { length: 0 };
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(video.playCalls, 1);
  assert.equal(video.paused, false);
  assert.equal(countEvents(dispatchedEvents, content.LIVE_GUARD_PLAY_EVENT), 1);
  assert.equal(video.muted, true);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(getLiveOverlayButton(doc, "start").disabled, true);

  // Window back: paused again, and no choice was recorded along the way.
  video.readyState = 4;
  video.seekable = createSeekableRange(24);
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.paused, true);
  assert.equal(getLiveOverlayButton(doc, "start").disabled, false);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard mutes again when YouTube unmutes the video under it", () => {
  // R12.3. The user had muted this stream; the guard must hand it back muted
  // even though YouTube unmuted it in between.
  const clock = createFakeClock();
  const video = createLiveVideo({ muted: true });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "unmuted-by-youtube",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=unmuted-by-youtube"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  // YouTube restores its own volume state through the player API.
  video.muted = false;
  doc.dispatchEvent({ type: "volumechange", target: video });

  assert.equal(video.muted, true);

  // A <video> outside the player is not touched.
  const preview = createLiveVideo();
  doc.dispatchEvent({ type: "volumechange", target: preview });

  assert.equal(preview.muted, false);

  // Missed events are caught by the heartbeat too.
  video.muted = false;
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(video.muted, true);
  assertGuardHolds(doc, video);

  // The original state is the user's, not the one YouTube set meanwhile.
  getLiveOverlayButton(doc, "continue").click();

  assert.equal(video.muted, true);

  // After the choice the lock is gone: the user's own unmute stays.
  video.muted = false;
  doc.dispatchEvent({ type: "volumechange", target: video });

  assert.equal(video.muted, false);
});

// R13 I1, I2: a pending jump is dropped when its <video> is replaced or an
// ad starts before it is confirmed.

test("live guard drops a pending jump when YouTube replaces the <video>", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "jump-video-swap",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=jump-video-swap"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();
  video.listeners.seeked();

  // YouTube swaps in a new <video>, still at the live moment.
  const replacement = createLiveVideo({ currentTime: 3600 });
  doc.video = replacement;

  // The old element's frame callback and fallback timer come in late.
  video.frameCallbacks.forEach((callback) => callback());
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);

  assert.equal(replacement.playCalls, 0);
  assert.equal(video.playCalls, 0);
  assert.notEqual(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  // The heartbeat takes over the new element: paused and muted. It is not at
  // the start, so the jump never confirms and times out.
  clock.advance(liveStart.LIVE_START_SEEK_CONFIRM_TIMEOUT_MS);

  assert.equal(replacement.paused, true);
  assert.equal(replacement.playCalls, 0);
  assertGuardHolds(doc, replacement);
  assert.equal(
    getLiveOverlay(doc).querySelector(".yas-live-guard-status").textContent,
    "Couldn't jump to the beginning.",
  );
  assert.equal(getLiveOverlayButton(doc, "start").disabled, false);
});

test("live guard confirms a jump that YouTube completes with a new <video> at the start", () => {
  // Live check 2026-11-05: jumping back on a DVR stream, YouTube emptied the
  // old <video> and swapped in a new one already at the start.
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "jump-new-element",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=jump-new-element"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  const replacement = createLiveVideo({ currentTime: 24 });
  doc.video = replacement;
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
  assert.equal(replacement.playCalls, 1);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["jump-new-element"]);
});

test("live guard cancels a pending jump at the heartbeat after the <video> is replaced", () => {
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "jump-swap-heartbeat",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=jump-swap-heartbeat"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  // The <video> is replaced before the old one reports "seeked".
  const replacement = createLiveVideo({ currentTime: 3600 });
  doc.video = replacement;
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  // The new element sits at the live moment: nothing is confirmed.
  assertGuardHolds(doc, replacement);
  assert.equal(replacement.playCalls, 0);

  clock.advance(liveStart.LIVE_START_SEEK_CONFIRM_TIMEOUT_MS);

  // The jump timed out: no listener left on the old element.
  assert.equal(video.listeners.seeked, undefined);
  assert.equal(
    getLiveOverlay(doc).querySelector(".yas-live-guard-status").textContent,
    "Couldn't jump to the beginning.",
  );
  assertGuardHolds(doc, replacement);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

test("live guard does not confirm a jump once an ad has started", () => {
  const clock = createFakeClock();
  const player = createElement("div");
  player.className = "html5-video-player";
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "jump-then-ad",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=jump-then-ad"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();
  video.listeners.seeked();

  // The ad class appears, and the frame callback runs before any heartbeat.
  player.className = "html5-video-player ad-showing";
  video.frameCallbacks[0]();

  assert.equal(getLiveOverlay(doc), null);
  assert.notEqual(doc.getElementById(liveStart.LIVE_GUARD_AD_NOTE_ID), null);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);
  assert.equal(video.listeners.seeked, undefined);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
  // The one play is the guard undoing its own pause so the ad can run.
  assert.equal(video.playCalls, 1);

  // The fallback timer of the dropped jump changes nothing either.
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);

  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.playCalls, 1);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  // After the ad: paused, the buttons again, nothing chosen.
  player.className = "html5-video-player";
  clock.advance(content.LIVE_START_POLL_MS);

  assert.equal(video.paused, true);
  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
  assert.equal(isLiveObscured(doc), true);
  assert.equal(video.muted, true);
  assert.deepEqual([...controller.getAttemptedVideoIds()], []);
});

// R13 I4: while the guard is up, only the player's own <video> counts.

test("live guard leaves a <video> outside the player alone while the player's own is missing", () => {
  const clock = createFakeClock();
  const player = createElement("div");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "player-video-missing",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=player-video-missing"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  // The player's <video> is gone for a moment; a hover preview elsewhere is
  // now the only <video> on the page.
  const preview = createLiveVideo();
  doc.video = preview;
  player.contains = () => false;
  clock.advance(2 * liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.equal(preview.pauseCalls, 0);
  assert.equal(preview.muted, false);
  assert.notEqual(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), true);

  // The buttons do not act on it either.
  getLiveOverlayButton(doc, "start").click();

  assert.equal(preview.currentTime, 300);
  assert.equal(countEvents(dispatchedEvents, content.LIVE_START_SEEK_EVENT), 0);
  assert.notEqual(getLiveOverlay(doc), null);
});

// R13 Q1, Q2: when a choice expires, and which pause the guard undoes.

test("live guard asks again once the mini-player is stopped or closed", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=mini-choice");
  const player = createElement("div");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "mini-choice",
  });
  const controller = content.createLiveStartController(win, clock.options);
  const goTo = (href) => {
    win.location.href = href;
    controller.sync(LIVE_SETTINGS, doc);
  };

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "continue").click();

  // Still playing in the mini-player: the choice holds.
  goTo("https://www.youtube.com/");

  assert.deepEqual([...controller.getAttemptedVideoIds()], ["mini-choice"]);

  // The user stops the mini-player; the next navigation drops the choice.
  video.paused = true;
  goTo("https://www.youtube.com/feed/subscriptions");

  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  goTo("https://www.youtube.com/watch?v=mini-choice");

  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
  // A fresh start: the eager shield is back too.
  assert.equal(isLiveObscured(doc), true);

  // Choose again, then close the mini-player altogether.
  getLiveOverlayButton(doc, "continue").click();
  goTo("https://www.youtube.com/");
  doc.player = null;
  goTo("https://www.youtube.com/feed/subscriptions");

  assert.deepEqual([...controller.getAttemptedVideoIds()], []);

  doc.player = player;
  goTo("https://www.youtube.com/watch?v=mini-choice");

  assert.notEqual(getLiveOverlayButton(doc, "continue"), null);
});

test("live guard resumes only playback it paused itself", () => {
  // The user paused the stream before the guard engaged.
  const clock = createFakeClock();
  const player = createElement("div");
  player.className = "html5-video-player";
  const video = createLiveVideo({ paused: true });
  const doc = createLiveDocument({
    video,
    player,
    liveBroadcastContent: "True",
    metadataVideoId: "user-paused",
  });
  const dispatchedEvents = recordDispatchedEvents(doc);
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=user-paused"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);

  assertGuardHolds(doc, video);

  // An ad starts: the guard did not stop this video, so it does not start it.
  player.className = "html5-video-player ad-showing";
  clock.advance(liveStart.LIVE_GUARD_HEARTBEAT_MS);

  assert.notEqual(doc.getElementById(liveStart.LIVE_GUARD_AD_NOTE_ID), null);
  assert.equal(video.playCalls, 0);
  assert.equal(countEvents(dispatchedEvents, content.LIVE_GUARD_PLAY_EVENT), 0);

  // After the ad the rewind window is unknown: still not started by the guard.
  player.className = "html5-video-player";
  video.readyState = 0;
  video.seekable = { length: 0 };
  clock.advance(content.LIVE_START_POLL_MS);

  assert.notEqual(getLiveOverlay(doc), null);
  assert.equal(video.playCalls, 0);
  assert.equal(countEvents(dispatchedEvents, content.LIVE_GUARD_PLAY_EVENT), 0);
});

// R13 I3: the chat is covered again when the same video turns out to be live.

test("chat spoiler guard covers the chat again when a not-live video turns out to be live", () => {
  switchChatGuardOff();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    chat: createElement("ytd-live-chat-frame"),
    video,
    player: createElement("div"),
  });
  const shared = globalThis.YouTubeAntiSpoiler;
  const originalReadSettings = shared.readSettings;
  const timers = captureGlobalTimers();
  let isLive = false;

  globalThis.location = { href: "https://www.youtube.com/watch?v=flips-to-live" };
  shared.readSettings = () => new Promise(() => {});
  answerLiveStateRequests(doc, globalThis, () => ({ videoId: "flips-to-live", isLive }));

  try {
    content.refreshProtection(doc);
    timers.runPending();

    // The bridge said "not live": the chat is uncovered.
    assert.equal(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      false,
    );

    // The same video is live after all, and the live guard waits for a choice.
    isLive = true;
    timers.runPending();
    timers.runPending();

    assert.notEqual(getLiveOverlay(doc), null);
    assert.notEqual(doc.getElementById(content.CHAT_GUARD_OVERLAY_ID), null);
    assert.equal(
      doc.documentElement.classList.contains(content.CHAT_GUARD_OBSCURED_CLASS),
      true,
    );
  } finally {
    delete globalThis.location;
    // Player closed and off the watch page: ends the module-level live guard.
    doc.player = null;
    content.refreshProtection(doc);
    switchChatGuardOff();
    timers.restore();
    shared.readSettings = originalReadSettings;
  }
});

// The chat guard's once-a-second check keeps a timer alive while the guard is
// on; switch it off so node --test can exit.
test.after(() => {
  switchChatGuardOff();
});

test("live guard trusts the player when the streamer turned rewinding off", () => {
  // Live check 2026-11-05: <video>.seekable claimed a huge window, but the
  // player said allowSeeking: false. "Start from beginning" must not be
  // offered — it could only fail.
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=no-rewind");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "no-rewind",
  });
  answerLiveStateRequests(doc, win, () => ({
    videoId: "no-rewind",
    isLive: true,
    canRewind: false,
  }));
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);
  clock.advance(content.LIVE_START_POLL_MS * 3);

  const status = getLiveOverlay(doc).querySelector(".yas-live-guard-status");

  assert.equal(
    status.textContent,
    "This stream can't be rewound. Continue live or leave the page.",
  );
  assert.equal(getLiveOverlayButton(doc, "start").hidden, true);
  assert.equal(video.paused, true);
  assertGuardHolds(doc, video);
});

test("live guard keeps the stream loading until the player knows its rewind window", () => {
  // Live check 2026-11-05: <video>.seekable appeared before YouTube moved the
  // stream to its live position, and a jump made then was undone.
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=early-seekable");
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "early-seekable",
  });
  let playerKnowsWindow = false;
  answerLiveStateRequests(doc, win, () => ({
    videoId: "early-seekable",
    isLive: true,
    canRewind: playerKnowsWindow ? true : null,
  }));
  const controller = content.createLiveStartController(win, clock.options);

  controller.sync(LIVE_SETTINGS, doc);
  clock.advance(content.LIVE_START_POLL_MS * 3);

  // Media seekable is there, but the player is not ready: keep loading.
  assert.equal(getLiveOverlayButton(doc, "start").disabled, true);
  assert.equal(video.pauseCalls, 0);

  playerKnowsWindow = true;
  clock.advance(content.LIVE_START_POLL_MS * 2);

  assert.equal(getLiveOverlayButton(doc, "start").disabled, false);
  assert.equal(video.paused, true);
  assertGuardHolds(doc, video);
});

test("live guard confirms a jump that YouTube completes by reloading the media", () => {
  // Live check 2026-11-05: jumping back on a live stream reloads the media at
  // the new position; "seeked" never fires, "loadeddata" does.
  const clock = createFakeClock();
  const video = createLiveVideo();
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "reload-jump",
  });
  const controller = content.createLiveStartController(
    createGuardWindow("https://www.youtube.com/watch?v=reload-jump"),
    clock.options,
  );

  controller.sync(LIVE_SETTINGS, doc);
  getLiveOverlayButton(doc, "start").click();

  // Reloading: at the start already, but no frame there yet.
  video.readyState = 1;
  video.listeners.loadeddata();
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);
  assertGuardHolds(doc, video);

  video.readyState = 4;
  video.listeners.canplay();
  clock.advance(liveStart.LIVE_START_SEEK_FRAME_FALLBACK_MS);

  assert.equal(getLiveOverlay(doc), null);
  assert.equal(isLiveObscured(doc), false);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["reload-jump"]);
});

test("buildSpoilerCss blurs seek-preview frames with previews and chapter names with titles", () => {
  const css = content.buildSpoilerCss();

  // With the timeline visible, hovering it shows storyboard frames from later
  // in the video and the chapter name there.
  assert.match(css, /html\.yas-hide-video-previews \.ytp-tooltip-bg/);
  assert.match(css, /html\.yas-hide-video-previews \.ytp-storyboard-framepreview-img/);
  assert.match(css, /html\.yas-hide-video-titles \.ytp-tooltip\.ytp-preview \.ytp-tooltip-title/);
  assert.match(css, /html\.yas-hide-video-titles \.ytp-tooltip-progress-bar-pill-title/);
  // Button tooltips share .ytp-tooltip-title; they must stay readable.
  assert.doesNotMatch(css, /html\.yas-hide-video-titles \.ytp-tooltip-title/);
});

function createTitledElement({ title, insideVideoTitle, rootClasses }) {
  const attributes = { title };
  const rootElement = { classList: createClassList() };
  rootClasses.forEach((className) => rootElement.classList.add(className));

  const element = {
    ownerDocument: { documentElement: rootElement },
    closest(selector) {
      if (selector === "[title]") {
        return "title" in attributes ? element : null;
      }

      return insideVideoTitle ? element : null;
    },
    getAttribute: (name) => (name in attributes ? attributes[name] : null),
    hasAttribute: (name) => name in attributes,
    setAttribute: (name, value) => {
      attributes[name] = String(value);
    },
    removeAttribute: (name) => {
      delete attributes[name];
    },
    attributes,
  };

  return element;
}

test("hovering a hidden video title takes its title attribute off before the tooltip shows", () => {
  const element = createTitledElement({
    title: "Team A 3-0 Team B | Highlights",
    insideVideoTitle: true,
    rootClasses: ["yas-hide-video-titles"],
  });

  content.stashHoveredTitleAttribute({ target: element });

  assert.equal(element.hasAttribute("title"), false);
  assert.equal(element.getAttribute("data-yas-title"), "Team A 3-0 Team B | Highlights");
});

test("hovering keeps the title attribute when titles are shown or it is not a video title", () => {
  const shownTitles = createTitledElement({
    title: "Team A 3-0 Team B",
    insideVideoTitle: true,
    rootClasses: ["yas-extension-enabled"],
  });
  const logo = createTitledElement({
    title: "YouTube Home",
    insideVideoTitle: false,
    rootClasses: ["yas-hide-video-titles"],
  });

  content.stashHoveredTitleAttribute({ target: shownTitles });
  content.stashHoveredTitleAttribute({ target: logo });

  assert.equal(shownTitles.getAttribute("title"), "Team A 3-0 Team B");
  assert.equal(logo.getAttribute("title"), "YouTube Home");
});

test("stashed title attributes come back when title hiding is switched off", () => {
  const stashed = createTitledElement({
    title: "Team A 3-0 Team B",
    insideVideoTitle: true,
    rootClasses: ["yas-hide-video-titles"],
  });
  const reused = createTitledElement({
    title: "Old video",
    insideVideoTitle: true,
    rootClasses: ["yas-hide-video-titles"],
  });
  content.stashHoveredTitleAttribute({ target: stashed });
  content.stashHoveredTitleAttribute({ target: reused });
  // YouTube reused this list item for another video meanwhile.
  reused.setAttribute("title", "New video");

  const doc = createLiveDocument({});
  doc.querySelectorAll = (selector) =>
    selector === "[data-yas-title]" ? [stashed, reused] : [];

  content.applySettings(
    { extensionEnabled: true, hideVideoTitles: false, startLiveFromBeginning: false },
    doc,
  );

  assert.equal(stashed.getAttribute("title"), "Team A 3-0 Team B");
  assert.equal(stashed.hasAttribute("data-yas-title"), false);
  assert.equal(reused.getAttribute("title"), "New video");
  assert.equal(reused.hasAttribute("data-yas-title"), false);
});

test("switching title hiding on takes the title attribute off a title already under the cursor", () => {
  // Protection was off while the cursor rested on a title, so the mouseover
  // happened before the hiding class existed.
  const hovered = createTitledElement({
    title: "Team A 3-0 Team B",
    insideVideoTitle: true,
    rootClasses: [],
  });
  const doc = createLiveDocument({});
  doc.querySelectorAll = (selector) => (selector === "[title]:hover" ? [hovered] : []);

  content.applySettings(
    { extensionEnabled: true, hideVideoTitles: true, startLiveFromBeginning: false },
    doc,
  );

  assert.equal(hovered.hasAttribute("title"), false);
  assert.equal(hovered.getAttribute("data-yas-title"), "Team A 3-0 Team B");
});

// --- Portion 5: the open video's title, "Most replayed" ---

function getRuleWithBody(css, firstSelector, body) {
  const start = css.indexOf(firstSelector);
  const end = css.indexOf(body, start);

  assert.ok(start >= 0 && end > start, `rule starting with ${firstSelector}`);
  return css.slice(start, end + body.length);
}

test("buildSpoilerCss blurs the open video's title and the line under it with titles", () => {
  const titleRule = getRuleWithBody(
    content.buildSpoilerCss(),
    "html.yas-hide-video-titles #video-title,",
    "{\n  filter: blur(8px) !important;\n}",
  );

  // Live check 2026-11-05: the h1 above the description, and the line with
  // views and "Streamed 1mo ago" (the exact date in its tooltip).
  assert.match(titleRule, /html\.yas-hide-video-titles ytd-watch-metadata h1(,| \{)/);
  assert.match(titleRule, /html\.yas-hide-video-titles ytd-watch-metadata ytd-watch-info-text(,| \{)/);
});

test("buildSpoilerCss blurs the description text, not its more / Show less buttons, with titles", () => {
  const titleRule = getRuleWithBody(
    content.buildSpoilerCss(),
    "html.yas-hide-video-titles #video-title,",
    "{\n  filter: blur(8px) !important;\n}",
  );

  // Owner decision 2026-11-05: the description often repeats the full title.
  // Live check: folded text is #snippet-text, unfolded text is #expanded;
  // the #expand / #collapse buttons are their siblings.
  assert.match(
    titleRule,
    /html\.yas-hide-video-titles ytd-watch-metadata #description-inline-expander #snippet-text(,| \{)/,
  );
  assert.match(
    titleRule,
    /html\.yas-hide-video-titles ytd-watch-metadata #description-inline-expander #expanded(,| \{)/,
  );
  assert.doesNotMatch(titleRule, /#expand(,| \{)|#collapse|#description-inline-expander(,| \{)/);
});

test("hovering the open video's title takes its title attribute off", () => {
  // <ytd-watch-metadata><h1><yt-formatted-string title="…">: of the title
  // selectors only "ytd-watch-metadata h1" matches an ancestor here.
  const element = createTitledElement({
    title: "Team A 3-0 Team B | Final",
    insideVideoTitle: false,
    rootClasses: ["yas-hide-video-titles"],
  });
  const heading = { tagName: "H1" };
  element.closest = (selector) => {
    if (selector === "[title]") {
      return element;
    }

    return selector.split(", ").includes("ytd-watch-metadata h1") ? heading : null;
  };

  content.stashHoveredTitleAttribute({ target: element });

  assert.equal(element.hasAttribute("title"), false);
  assert.equal(element.getAttribute("data-yas-title"), "Team A 3-0 Team B | Final");
});

test("buildSpoilerCss hides the Most replayed graph with previews and keeps blurring seek-preview frames", () => {
  const css = content.buildSpoilerCss();

  // A blurred curve would still show where its peaks are.
  assert.match(
    css,
    /html\.yas-hide-video-previews \.ytp-heat-map-container \{\n  visibility: hidden !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n\}/,
  );

  const previewRule = getRuleWithBody(
    css,
    "html.yas-hide-video-previews a#thumbnail img,",
    "{\n  filter: blur(24px) !important;\n}",
  );

  assert.doesNotMatch(previewRule, /heat-map/);
  assert.match(previewRule, /html\.yas-hide-video-previews \.ytp-tooltip-bg(,| \{)/);
  assert.match(previewRule, /html\.yas-hide-video-previews \.ytp-storyboard-framepreview-img(,| \{)/);
});

test("a language change re-translates an open live guard panel in its current state", () => {
  const clock = createFakeClock();
  const win = createGuardWindow("https://www.youtube.com/watch?v=language-switch");
  const video = createLiveVideo({ readyState: 0, seekable: { length: 0 } });
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "language-switch",
  });
  const controller = content.createLiveStartController(win, clock.options);
  const shared = globalThis.YouTubeAntiSpoiler;
  const testTexts = {
    liveGuardTitle: "TEST TITLE",
    liveGuardChecking: "TEST CHECKING",
    liveGuardCannotRewind: "TEST CANNOT REWIND",
    liveGuardContinueButton: "TEST CONTINUE",
  };

  controller.sync(LIVE_SETTINGS, doc);

  const overlay = getLiveOverlay(doc);
  const title = overlay.querySelector(".yas-live-guard-title");
  const status = overlay.querySelector(".yas-live-guard-status");

  try {
    shared.setMessages(testTexts);
    shared.applyTranslations(doc);

    // The same panel, not a rebuilt one.
    assert.equal(getLiveOverlay(doc), overlay);
    assert.equal(title.textContent, "TEST TITLE");
    assert.equal(status.textContent, "TEST CHECKING");
    assert.equal(getLiveOverlayButton(doc, "continue").textContent, "TEST CONTINUE");
    // Named by its visible title; no tooltip over the player.
    assert.equal(overlay.attributes["aria-labelledby"], title.id);
    assert.equal(overlay.attributes.title, undefined);

    // The state moves on; a later language change shows the new state's text.
    shared.setMessages(null);
    clock.advance(content.LIVE_START_TIMEOUT_MS);

    assert.equal(getLiveOverlay(doc), overlay);
    assert.equal(status.textContent, "This stream can't be rewound. Continue live or leave the page.");

    shared.setMessages(testTexts);
    shared.applyTranslations(doc);

    assert.equal(status.textContent, "TEST CANNOT REWIND");
    assertGuardHolds(doc, video);
  } finally {
    shared.setMessages(null);
  }
});
