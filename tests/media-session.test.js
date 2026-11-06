const assert = require("node:assert/strict");
const test = require("node:test");

const bridge = require("../src/content/live-player-bridge.js");

// A page window with the Media Session API shaped like Chrome's: `metadata`
// is an accessor on MediaSession.prototype, setPositionState a method there.
function createMediaWindow(rootClasses = []) {
  const classes = new Set(rootClasses);
  const positionCalls = [];

  function FakeMediaSession() {
    this.storedMetadata = null;
  }

  Object.defineProperty(FakeMediaSession.prototype, "metadata", {
    configurable: true,
    enumerable: true,
    get() {
      return this.storedMetadata;
    },
    set(metadata) {
      this.storedMetadata = metadata;
    },
  });

  FakeMediaSession.prototype.setPositionState = function setPositionState() {
    positionCalls.push([...arguments]);
  };

  function FakeMediaMetadata(init) {
    this.title = init.title;
    this.artist = init.artist;
    this.album = init.album;
    this.artwork = init.artwork;
  }

  // content.js changes the classes and the media title attribute on <html>;
  // the patch watches them. Like a real MutationObserver, only the
  // attributes named in attributeFilter are reported.
  const rootAttributes = {};
  const rootObservers = [];

  function FakeMutationObserver(callback) {
    this.observe = (target, options) => rootObservers.push({ callback, options });
  }

  function notifyRootObservers(attributeName) {
    rootObservers.forEach(({ callback, options }) => {
      if (options.attributeFilter.includes(attributeName)) {
        callback([]);
      }
    });
  }

  return {
    positionCalls,
    MutationObserver: FakeMutationObserver,
    setRootClass(className, enabled) {
      if (enabled) {
        classes.add(className);
      } else {
        classes.delete(className);
      }

      notifyRootObservers("class");
    },
    setRootAttribute(name, value) {
      rootAttributes[name] = value;
      notifyRootObservers(name);
    },
    document: {
      documentElement: {
        classList: {
          contains(className) {
            return classes.has(className);
          },
        },
        getAttribute(name) {
          return Object.prototype.hasOwnProperty.call(rootAttributes, name)
            ? rootAttributes[name]
            : null;
        },
      },
    },
    navigator: { mediaSession: new FakeMediaSession() },
    MediaSession: FakeMediaSession,
    MediaMetadata: FakeMediaMetadata,
  };
}

function createYouTubeMetadata(win) {
  return new win.MediaMetadata({
    title: "Team A 3-0 Team B | Highlights",
    artist: "Sports Channel",
    album: "",
    artwork: [{ src: "https://i.ytimg.com/vi/final/hqdefault.jpg", sizes: "480x360" }],
  });
}

const POSITION = Object.freeze({ duration: 5400, playbackRate: 1, position: 2700 });

test("media session gets no position or duration while protection is on", () => {
  const win = createMediaWindow(["yas-extension-enabled"]);

  assert.equal(bridge.patchMediaSession(win), true);
  win.navigator.mediaSession.setPositionState(POSITION);

  // Called without arguments, which clears any earlier position state.
  assert.deepEqual(win.positionCalls, [[]]);
});

test("media session passes the position through when protection is off", () => {
  const win = createMediaWindow([]);

  bridge.patchMediaSession(win);
  win.navigator.mediaSession.setPositionState(POSITION);
  win.setRootClass("yas-extension-enabled", true);
  win.navigator.mediaSession.setPositionState(POSITION);

  // Switching protection on clears the position at once, then YouTube's
  // next call is cleared too.
  assert.deepEqual(win.positionCalls, [[POSITION], [], []]);
});

test("media session title is replaced while video titles are hidden", () => {
  const win = createMediaWindow(["yas-extension-enabled", "yas-hide-video-titles"]);
  const metadata = createYouTubeMetadata(win);

  bridge.patchMediaSession(win);
  win.navigator.mediaSession.metadata = metadata;

  const shown = win.navigator.mediaSession.metadata;
  assert.equal(shown.title, "YouTube video");
  assert.equal(shown.title, bridge.HIDDEN_MEDIA_TITLE);
  assert.equal(shown.artist, "Sports Channel");
  assert.deepEqual(shown.artwork, metadata.artwork);
  // YouTube's own object is left as it was.
  assert.equal(metadata.title, "Team A 3-0 Team B | Highlights");
});

test("media session artwork is dropped while previews are blurred", () => {
  const win = createMediaWindow(["yas-extension-enabled", "yas-hide-video-previews"]);

  bridge.patchMediaSession(win);
  win.navigator.mediaSession.metadata = createYouTubeMetadata(win);

  const shown = win.navigator.mediaSession.metadata;
  assert.equal(shown.title, "Team A 3-0 Team B | Highlights");
  assert.deepEqual(shown.artwork, []);
});

test("media session metadata is untouched without the hiding classes", () => {
  const win = createMediaWindow(["yas-extension-enabled"]);
  const metadata = createYouTubeMetadata(win);

  bridge.patchMediaSession(win);
  win.navigator.mediaSession.metadata = metadata;

  assert.equal(win.navigator.mediaSession.metadata, metadata);

  // Clearing the metadata still works.
  win.setRootClass("yas-hide-video-titles", true);
  win.navigator.mediaSession.metadata = null;
  assert.equal(win.navigator.mediaSession.metadata, null);
});

test("media session patch skips a page without the Media Session API", () => {
  assert.equal(bridge.patchMediaSession({ navigator: {} }), false);
  assert.equal(bridge.patchMediaSession({}), false);
});

test("live player bridge init patches the media session", () => {
  const win = createMediaWindow(["yas-extension-enabled"]);
  win.document.addEventListener = () => {};

  bridge.initLivePlayerBridge(win);
  win.navigator.mediaSession.setPositionState(POSITION);

  assert.deepEqual(win.positionCalls, [[]]);
});

test("media session follows settings switched mid-video without a new call from YouTube", () => {
  const win = createMediaWindow([]);
  bridge.patchMediaSession(win);

  // Protection off: YouTube hands over the real title, artwork and position.
  win.navigator.mediaSession.metadata = createYouTubeMetadata(win);
  win.navigator.mediaSession.setPositionState(POSITION);

  win.setRootClass("yas-extension-enabled", true);
  win.setRootClass("yas-hide-video-titles", true);
  win.setRootClass("yas-hide-video-previews", true);

  assert.equal(win.navigator.mediaSession.metadata.title, bridge.HIDDEN_MEDIA_TITLE);
  assert.deepEqual(win.navigator.mediaSession.metadata.artwork, []);
  // The earlier position is cleared.
  assert.deepEqual(win.positionCalls[win.positionCalls.length - 1], []);

  // Switched off again: YouTube's own metadata comes back.
  win.setRootClass("yas-hide-video-titles", false);
  win.setRootClass("yas-hide-video-previews", false);
  win.setRootClass("yas-extension-enabled", false);

  assert.equal(win.navigator.mediaSession.metadata.title, "Team A 3-0 Team B | Highlights");
  assert.equal(win.navigator.mediaSession.metadata.artwork.length, 1);
});

test("media session shows the hidden title content.js wrote in the user's language", () => {
  const win = createMediaWindow(["yas-extension-enabled", "yas-hide-video-titles"]);
  win.setRootAttribute(bridge.MEDIA_TITLE_ATTRIBUTE, "Vidéo YouTube");

  bridge.patchMediaSession(win);
  win.navigator.mediaSession.metadata = createYouTubeMetadata(win);

  assert.equal(win.navigator.mediaSession.metadata.title, "Vidéo YouTube");
});

test("media session follows a language change with no new metadata from YouTube", () => {
  const win = createMediaWindow(["yas-extension-enabled", "yas-hide-video-titles"]);

  bridge.patchMediaSession(win);
  win.navigator.mediaSession.metadata = createYouTubeMetadata(win);
  // Before content.js has written the attribute.
  assert.equal(win.navigator.mediaSession.metadata.title, "YouTube video");

  // Only the attribute changes: same classes, no new assignment by YouTube.
  win.setRootAttribute(bridge.MEDIA_TITLE_ATTRIBUTE, "Видео YouTube");

  assert.equal(bridge.MEDIA_TITLE_ATTRIBUTE, "data-yas-media-title");
  assert.equal(win.navigator.mediaSession.metadata.title, "Видео YouTube");
  assert.equal(win.navigator.mediaSession.metadata.artist, "Sports Channel");
});
