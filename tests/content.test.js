const assert = require("node:assert/strict");
const test = require("node:test");

const content = require("../src/content/content.js");

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
      child.parentNode = this;
      this.children.push(child);
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
    player,
    chat,
  };
  const body = createElement("body");
  const head = createElement("head");

  if (documentState.player && typeof documentState.player.appendChild === "function") {
    documentState.player.id = "movie_player";
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
    querySelector(selector) {
      if (selector === "video") {
        return video;
      }

      if (selector.startsWith("#youtube-anti-spoiler-live-guard")) {
        return body.querySelector(selector);
      }

      if (selector === "#movie_player") {
        return this.player;
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

test("getEnabledClassNames maps enabled settings to stable root classes", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: true,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      startLiveFromBeginning: true,
    }),
    [
        "yas-extension-enabled",
        "yas-hide-time",
        "yas-hide-player-progress-bar",
        "yas-hide-video-previews",
        "yas-start-live-from-beginning",
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
  let pauseCalls = 0;
  const videoListeners = {};
  const video = {
    currentTime: 300,
    duration: Infinity,
    seekable: createSeekableRange(24),
    addEventListener(eventName, listener) {
      videoListeners[eventName] = listener;
    },
    removeEventListener(eventName) {
      delete videoListeners[eventName];
    },
    pause() {
      pauseCalls += 1;
    },
    play() {
      return Promise.resolve();
    },
  };
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

  controller.sync(
    {
      extensionEnabled: true,
      startLiveFromBeginning: true,
    },
    doc,
  );

  assert.equal(pauseCalls, 1);
  assert.equal(typeof videoListeners.play, "function");

  videoListeners.play();

  assert.equal(pauseCalls, 2);

  const overlay = doc.getElementById(content.LIVE_GUARD_OVERLAY_ID);
  overlay.querySelector('[data-live-guard-action="continue"]').click();

  assert.equal(videoListeners.play, undefined);
});

test("live guard does not show for regular videos with transient infinite duration", () => {
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
  const doc = createLiveDocument({ video });
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

  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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

  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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

  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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

  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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
  let pauseCalls = 0;
  const player = createElement("div");
  player.className = "html5-video-player ytp-live";
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
    player,
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=live-player-class",
    },
    setTimeout() {},
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

test("live guard shows when YouTube exposes the live chat frame", () => {
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
    hasLiveChatSignal: true,
  });
  const controller = content.createLiveStartController({
    location: {
      href: "https://www.youtube.com/watch?v=live-chat-frame",
    },
    setTimeout() {},
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

  now = content.LIVE_START_TIMEOUT_MS;
  timers.at(-1)();

  assert.equal(pauseCalls, 0);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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

test("chat spoiler guard stops retrying when no chat frame ever appears", () => {
  const doc = createLiveDocument({});
  const scheduled = [];
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.location = { href: "https://www.youtube.com/watch?v=no-chat-video" };
  globalThis.setTimeout = (callback) => {
    scheduled.push(callback);
    return callback;
  };

  try {
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: true,
    }, doc);

    // Drain every scheduled retry; the budget must make this terminate instead
    // of re-scheduling forever on a page that never gets a chat frame.
    let executed = 0;
    const retryBudget = content.LIVE_START_TIMEOUT_MS / content.LIVE_START_POLL_MS;

    while (scheduled.length > 0 && executed <= retryBudget + 1) {
      scheduled.shift()();
      executed += 1;
    }

    assert.equal(scheduled.length, 0);
    assert.equal(executed <= retryBudget, true);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    delete globalThis.location;
    content.applySettings({
      extensionEnabled: true,
      startLiveFromBeginning: false,
    }, doc);
  }
});

test("live guard waits for player bounds when the player host is unavailable", () => {
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
    liveBroadcastContent: "True",
    metadataVideoId: "host-wait",
    hasWatchLiveSignal: true,
  });
  const controller = content.createLiveStartController(
    {
      location: {
        href: "https://www.youtube.com/watch?v=host-wait",
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

  assert.equal(pauseCalls, 1);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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
  now = content.LIVE_START_NOT_LIVE_GRACE_MS;
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
  const dispatchedEvents = [];
  const videoCurrentTimes = [];
  let playCalls = 0;
  const video = {
    duration: Infinity,
    seekable: createSeekableRange(24),
    get currentTime() {
      return videoCurrentTimes.at(-1) || 300;
    },
    set currentTime(value) {
      videoCurrentTimes.push(value);
    },
    pause() {},
    play() {
      playCalls += 1;
      return Promise.resolve();
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "start-from-beginning",
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
      href: "https://www.youtube.com/watch?v=start-from-beginning",
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
  overlay.querySelector('[data-live-guard-action="start"]').click();

  const seekEvents = dispatchedEvents.filter(
    (event) => event.type === content.LIVE_START_SEEK_EVENT,
  );

  assert.equal(seekEvents.length, 1);
  assert.deepEqual(JSON.parse(seekEvents[0].detail), {
    fallbackSeconds: 24,
    requestId: 1,
  });
  assert.deepEqual(videoCurrentTimes, [24]);
  assert.equal(playCalls, 1);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
  assert.deepEqual([...controller.getAttemptedVideoIds()], ["start-from-beginning"]);
});

test("live guard start from beginning fails open when DVR is unavailable", () => {
  const dispatchedEvents = [];
  const videoCurrentTimes = [];
  let playCalls = 0;
  const video = {
    duration: Infinity,
    seekable: {
      length: 0,
    },
    get currentTime() {
      return videoCurrentTimes.at(-1) || 300;
    },
    set currentTime(value) {
      videoCurrentTimes.push(value);
    },
    pause() {},
    play() {
      playCalls += 1;
      return Promise.resolve();
    },
  };
  const doc = createLiveDocument({
    video,
    player: createElement("div"),
    liveBroadcastContent: "True",
    metadataVideoId: "no-dvr",
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
      href: "https://www.youtube.com/watch?v=no-dvr",
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
  overlay.querySelector('[data-live-guard-action="start"]').click();

  assert.equal(
    dispatchedEvents.some((event) => event.type === content.LIVE_START_SEEK_EVENT),
    false,
  );
  assert.deepEqual(videoCurrentTimes, []);
  assert.equal(playCalls, 1);
  assert.equal(doc.getElementById(content.LIVE_GUARD_OVERLAY_ID), null);
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
  now = content.LIVE_START_NOT_LIVE_GRACE_MS;
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

  now = content.LIVE_START_NOT_LIVE_GRACE_MS;
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

test("buildSpoilerCss blurs live video pixels while the live guard is active", () => {
  const css = content.buildSpoilerCss();
  const liveVideoRule = css.match(
    /html\.yas-live-start-obscured #movie_player video[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(liveVideoRule, /filter:\s*blur\(/);
  assert.doesNotMatch(liveVideoRule, /opacity:\s*0/);
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

  assert.match(thumbnailTimeRule, /\.ytBadgeShapeText:not\(\.ytBadgeShapeThumbnailLive\)/);
  assert.match(thumbnailTimeRule, /:not\(\.ytBadgeShapeThumbnailLive \*\)/);
  assert.match(thumbnailTimeRule, /:not\(:has\(\.ytBadgeShapeThumbnailLive\)\)/);
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
