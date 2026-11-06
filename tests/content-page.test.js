const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { createChromeI18n } = require("./helpers/english-messages.js");

// The content scripts loaded into a fresh page, as Chrome loads them: for
// what happens at script start ("Show spoilers for this video" after a
// reload, the settings cached for the next load) and for the messages from
// the popup and the keyboard shortcut.

const rootPath = path.join(__dirname, "..");
const CONTENT_SCRIPTS = JSON.parse(
  fs.readFileSync(path.join(rootPath, "manifest.json"), "utf8"),
).content_scripts[1].js;

const REVEALED_VIDEO_KEY = "yas-revealed-video";
const LAST_SETTINGS_KEY = "yas-last-settings";

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    hidden: false,
    id: "",
    listeners: {},
    parentNode: null,
    style: {},
    textContent: "",
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    remove() {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    },
    getAttribute(name) {
      return name in this.attributes ? this.attributes[name] : null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    // Only ".class" lookups among the direct children: what the player
    // buttons ask of the controls bar.
    querySelector(selector) {
      return this.children.find((child) => `.${child.className}` === selector) || null;
    },
  };
}

function collectElements(element) {
  return element.children.flatMap((child) => [child, ...collectElements(child)]);
}

// A YouTube page. `controls` is the player's left controls bar, or null for
// a page without a player. `watchFlexyVideoId` is the id a channel's /live
// page names its stream by once it has loaded.
function createPage({ controls }) {
  const classes = new Set();
  const head = createElement("head");
  const body = createElement("body");

  return {
    head,
    body,
    classes,
    controls,
    watchFlexyVideoId: null,
    title: "YouTube",
    readyState: "loading",
    documentElement: {
      dataset: {},
      classList: {
        add: (className) => classes.add(className),
        remove: (className) => classes.delete(className),
        contains: (className) => classes.has(className),
      },
      appendChild: (child) => head.appendChild(child),
    },
    createElement,
    createElementNS: (namespace, tagName) => createElement(tagName),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
    getElementById(id) {
      return collectElements(head).find((element) => element.id === id) || null;
    },
    querySelector(selector) {
      if (selector === "#movie_player .ytp-left-controls") {
        return this.controls;
      }

      if (selector === "ytd-watch-flexy:not([hidden])" && this.watchFlexyVideoId) {
        const videoId = this.watchFlexyVideoId;
        return { getAttribute: (name) => (name === "video-id" ? videoId : null) };
      }

      return null;
    },
    querySelectorAll(selector) {
      const datasetName = { "[data-yas-i18n]": "yasI18n", "[data-yas-i18n-label]": "yasI18nLabel" }[selector];
      return datasetName
        ? collectElements(body).filter((element) => element.dataset[datasetName])
        : [];
    },
  };
}

// A page's sessionStorage or localStorage, over a plain object.
function createStorage(items) {
  return {
    getItem: (key) => (key in items ? items[key] : null),
    setItem: (key, value) => {
      items[key] = String(value);
    },
    removeItem: (key) => {
      delete items[key];
    },
  };
}

// Loads the content scripts into a new page. The settings read waits until
// the test answers it; the language read answers at once with "none chosen".
function startContentScripts({
  href = "https://www.youtube.com/watch?v=match-1",
  navigationType = "navigate",
  sessionItems = {},
  localItems = {},
  localStorageBlocked = false,
  controls = null,
} = {}) {
  const doc = createPage({ controls });
  const windowListeners = {};
  const messageListeners = [];
  const storageChangeListeners = [];
  let settingsReads = 0;
  const intervals = [];
  let pendingSettingsRead = null;
  const context = {
    console,
    URL,
    document: doc,
    location: { href },
    sessionStorage: createStorage(sessionItems),
    performance: {
      getEntriesByType: (type) => (type === "navigation" ? [{ type: navigationType }] : []),
    },
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    addEventListener(eventName, listener) {
      windowListeners[eventName] = listener;
    },
    setInterval(callback) {
      intervals.push(callback);
    },
    setTimeout() {},
    clearTimeout() {},
    chrome: {
      i18n: createChromeI18n(),
      runtime: {
        lastError: null,
        onMessage: {
          addListener(listener) {
            messageListeners.push(listener);
          },
        },
      },
      storage: {
        sync: {
          get(keys, callback) {
            settingsReads += 1;
            pendingSettingsRead = callback;
          },
        },
        local: {
          get(key, callback) {
            callback({});
          },
        },
        onChanged: {
          addListener(listener) {
            storageChangeListeners.push(listener);
          },
        },
      },
    },
  };

  // Site data blocked: Chrome throws on any use of localStorage.
  Object.defineProperty(context, "localStorage", {
    get() {
      if (localStorageBlocked) {
        throw new Error("Access is denied for this document.");
      }

      return createStorage(localItems);
    },
  });

  context.globalThis = context;
  vm.createContext(context);
  CONTENT_SCRIPTS.forEach((relativePath) => {
    vm.runInContext(fs.readFileSync(path.join(rootPath, relativePath), "utf8"), context);
  });

  return {
    doc,
    classes: doc.classes,
    sessionItems,
    localItems,
    // Answers the latest chrome.storage.sync read and lets it apply.
    async answerSettings(settings) {
      pendingSettingsRead(settings);
      await new Promise((resolve) => setImmediate(resolve));
    },
    // YouTube's router moves to another address.
    navigate(nextHref) {
      context.location.href = nextHref;
      windowListeners["yt-navigate-finish"]();
    },
    get settingsReads() {
      return settingsReads;
    },
    // Another part of the extension (the popup) saved settings.
    changeStoredSettings(changes) {
      storageChangeListeners.forEach((listener) => listener(changes, "sync"));
    },
    runInterval() {
      intervals.forEach((callback) => callback());
    },
    // The browser shows the page again; persisted = from the back/forward cache.
    showPage(persisted) {
      windowListeners.pageshow({ persisted });
    },
    // What the popup or the background sends; returns the answer.
    send(message) {
      let answer;
      messageListeners.forEach((listener) => listener(message, {}, (response) => {
        answer = response;
      }));
      return answer;
    },
  };
}

function isRevealed(page) {
  return page.classes.has("yas-reveal-video");
}

// --- "Show spoilers for this video": how long it lasts ---

test("a reload of the uncovered video keeps it uncovered", () => {
  const page = startContentScripts({
    navigationType: "reload",
    sessionItems: { [REVEALED_VIDEO_KEY]: "match-1" },
  });

  assert.equal(isRevealed(page), true);
});

test("any load other than a reload forgets the uncovered video", () => {
  // A typed address, a link from another site, coming back from another site.
  ["navigate", "back_forward", "prerender"].forEach((navigationType) => {
    const page = startContentScripts({
      navigationType,
      sessionItems: { [REVEALED_VIDEO_KEY]: "match-1" },
    });

    assert.equal(isRevealed(page), false, navigationType);
    assert.equal(REVEALED_VIDEO_KEY in page.sessionItems, false, navigationType);
  });
});

test("coming back from another site through the back/forward cache forgets the uncovered video", () => {
  const page = startContentScripts({
    navigationType: "reload",
    sessionItems: { [REVEALED_VIDEO_KEY]: "match-1" },
  });

  // An ordinary first show of the page changes nothing.
  page.showPage(false);
  assert.equal(isRevealed(page), true);

  page.showPage(true);
  assert.equal(isRevealed(page), false);
  assert.equal(REVEALED_VIDEO_KEY in page.sessionItems, false);
});

test("opening another video forgets the uncovered one", () => {
  const page = startContentScripts({
    navigationType: "reload",
    sessionItems: { [REVEALED_VIDEO_KEY]: "match-1" },
  });

  page.navigate("https://www.youtube.com/watch?v=match-2");

  assert.equal(isRevealed(page), false);
  assert.equal(REVEALED_VIDEO_KEY in page.sessionItems, false);

  // Coming back to the first video in the same tab: covered again.
  page.navigate("https://www.youtube.com/watch?v=match-1");
  assert.equal(isRevealed(page), false);
});

test("a page without a video forgets the uncovered one", () => {
  const page = startContentScripts({
    navigationType: "reload",
    sessionItems: { [REVEALED_VIDEO_KEY]: "match-1" },
  });

  page.navigate("https://www.youtube.com/results?search_query=final");

  assert.equal(isRevealed(page), false);
  assert.equal(REVEALED_VIDEO_KEY in page.sessionItems, false);
});

test("a channel's /live page keeps the uncovered stream until it names it, then uncovers it", () => {
  const page = startContentScripts({
    href: "https://www.youtube.com/@sportschannel/live",
    navigationType: "reload",
    sessionItems: { [REVEALED_VIDEO_KEY]: "stream-1" },
  });

  // The page has not named its stream yet: kept, nothing uncovered.
  assert.equal(isRevealed(page), false);
  assert.equal(page.sessionItems[REVEALED_VIDEO_KEY], "stream-1");

  page.doc.watchFlexyVideoId = "stream-1";
  page.navigate("https://www.youtube.com/@sportschannel/live");

  assert.equal(isRevealed(page), true);
});

// --- "Show spoilers for this video": the toggle and the messages ---

test("the toggle message uncovers the open video and the same message covers it again", () => {
  const page = startContentScripts();

  assert.equal(isRevealed(page), false);

  assert.deepEqual({ ...page.send({ type: "yas-toggle-reveal" }) }, { available: true, revealed: true });
  assert.equal(isRevealed(page), true);
  assert.equal(page.sessionItems[REVEALED_VIDEO_KEY], "match-1");

  assert.deepEqual({ ...page.send({ type: "yas-toggle-reveal" }) }, { available: true, revealed: false });
  assert.equal(isRevealed(page), false);
  assert.equal(REVEALED_VIDEO_KEY in page.sessionItems, false);
});

test("the toggle does nothing without a video or with protection off", async () => {
  const homePage = startContentScripts({ href: "https://www.youtube.com/" });

  assert.deepEqual({ ...homePage.send({ type: "yas-toggle-reveal" }) }, { available: false, revealed: false });
  assert.equal(REVEALED_VIDEO_KEY in homePage.sessionItems, false);

  const page = startContentScripts();
  await page.answerSettings({ extensionEnabled: false });

  // "available" only says a video is open; the toggle does nothing while
  // protection is off.
  assert.deepEqual({ ...page.send({ type: "yas-toggle-reveal" }) }, { available: true, revealed: false });
  assert.equal(REVEALED_VIDEO_KEY in page.sessionItems, false);
  assert.equal(isRevealed(page), false);
});

test("an uncovered video is covered while protection is off and uncovered when it comes back", async () => {
  const page = startContentScripts();

  page.send({ type: "yas-toggle-reveal" });
  await page.answerSettings({ extensionEnabled: false });
  assert.equal(isRevealed(page), false);

  page.navigate("https://www.youtube.com/watch?v=match-1");
  await page.answerSettings({ extensionEnabled: true });
  assert.equal(isRevealed(page), true);
});

test("the content script answers only its own messages", () => {
  const page = startContentScripts();

  assert.equal(page.send({ type: "something-else" }), undefined);
});

// --- "Show spoilers for this video": the player button ---

function createControls() {
  const controls = createElement("div");
  controls.className = "ytp-left-controls";
  return controls;
}

function findRevealButton(controls) {
  return controls.children.find((child) => child.className === "yas-reveal-button") || null;
}

test("the player gets one eye button after the skip buttons, labelled for what a click does", () => {
  const controls = createControls();
  startContentScripts({ controls });

  const button = findRevealButton(controls);
  assert.notEqual(button, null);
  assert.equal(controls.children.indexOf(button), controls.children.length - 1);
  assert.equal(controls.children[0].className, "yas-skip-buttons");
  assert.equal(button.type, "button");
  assert.equal(button.hidden, false);
  assert.equal(button.attributes["aria-pressed"], "false");
  assert.equal(button.attributes["aria-label"], "Show spoilers for this video");
  assert.equal(button.attributes.title, "Show spoilers for this video");
  // The eye is drawn with DOM calls and hidden from screen readers.
  assert.equal(button.children[0].tagName, "SVG");
  assert.equal(button.children[0].attributes["aria-hidden"], "true");
});

test("the eye button toggles the video and keeps the player's own click handlers out", () => {
  const controls = createControls();
  const page = startContentScripts({ controls });
  const button = findRevealButton(controls);
  const calls = [];
  const click = () => button.listeners.click({
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
  });

  click();

  assert.deepEqual(calls, ["preventDefault", "stopPropagation"]);
  assert.equal(isRevealed(page), true);
  assert.equal(button.attributes["aria-pressed"], "true");
  assert.equal(button.attributes["aria-label"], "Hide spoilers again");

  click();

  assert.equal(isRevealed(page), false);
  assert.equal(button.attributes["aria-pressed"], "false");
  assert.equal(button.attributes["aria-label"], "Show spoilers for this video");
});

test("the eye button follows the popup and the shortcut within a second", () => {
  const controls = createControls();
  const page = startContentScripts({ controls });

  page.send({ type: "yas-toggle-reveal" });
  page.runInterval();

  assert.equal(findRevealButton(controls).attributes["aria-pressed"], "true");
});

test("the eye button hides while protection is off and comes back after YouTube rebuilds the player", async () => {
  const controls = createControls();
  const page = startContentScripts({ controls });

  await page.answerSettings({ extensionEnabled: false });
  page.runInterval();
  // Hidden by the CSS gate on html.yas-extension-enabled (tested with the CSS).
  assert.equal(page.classes.has("yas-extension-enabled"), false);

  // The next navigation reads the settings again.
  page.navigate("https://www.youtube.com/watch?v=match-1");
  await page.answerSettings({ extensionEnabled: true });
  findRevealButton(controls).remove();
  page.runInterval();

  const buttons = controls.children.filter((child) => child.className === "yas-reveal-button");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].hidden, false);
});

test("the eye button hides on a page that has a player but no video of its own", () => {
  // A channel's /live page before it names its stream.
  const controls = createControls();
  startContentScripts({ controls, href: "https://www.youtube.com/@sportschannel/live" });

  assert.equal(findRevealButton(controls).hidden, true);
});

// --- F4: the optional blurs at page start ---

test("titles and previews saved as hidden are blurred before chrome.storage answers", () => {
  const page = startContentScripts({
    localItems: {
      [LAST_SETTINGS_KEY]: JSON.stringify({ hideVideoPreviews: true, hideVideoTitles: true }),
    },
  });

  assert.equal(page.classes.has("yas-hide-video-titles"), true);
  assert.equal(page.classes.has("yas-hide-video-previews"), true);
});

test("a saved copy with previews blurred and titles not keeps titles readable before the real read", () => {
  // Titles set separately and off: the copy says so, and the default link
  // to previews must not blur them anyway.
  const page = startContentScripts({
    localItems: {
      [LAST_SETTINGS_KEY]: JSON.stringify({ hideVideoPreviews: true, hideVideoTitles: false }),
    },
  });

  assert.equal(page.classes.has("yas-hide-video-previews"), true);
  assert.equal(page.classes.has("yas-hide-video-titles"), false);
});

test("the real settings read corrects the saved copy", async () => {
  const page = startContentScripts({
    localItems: { [LAST_SETTINGS_KEY]: JSON.stringify({ hideVideoPreviews: false, hideVideoTitles: true }) },
  });

  await page.answerSettings({ hideVideoTitles: false });

  assert.equal(page.classes.has("yas-hide-video-titles"), false);
});

test("a saved copy can never turn protection off or weaken it before the real read", () => {
  const withoutCopy = startContentScripts();
  const withWeakCopy = startContentScripts({
    localItems: {
      [LAST_SETTINGS_KEY]: JSON.stringify({
        extensionEnabled: false,
        hideTime: false,
        hidePlayerProgressBar: false,
        startLiveFromBeginning: false,
        hideComments: false,
        hideVideoPreviews: false,
        hideVideoTitles: false,
      }),
    },
  });

  assert.equal(withWeakCopy.classes.has("yas-extension-enabled"), true);
  assert.deepEqual([...withWeakCopy.classes].sort(), [...withoutCopy.classes].sort());
});

test("a damaged copy or blocked site data leaves the defaults", () => {
  const defaults = [...startContentScripts().classes].sort();
  const damaged = startContentScripts({ localItems: { [LAST_SETTINGS_KEY]: "{not json" } });
  const notAnObject = startContentScripts({ localItems: { [LAST_SETTINGS_KEY]: "true" } });
  const blocked = startContentScripts({ localStorageBlocked: true });

  assert.deepEqual([...damaged.classes].sort(), defaults);
  assert.deepEqual([...notAnObject.classes].sort(), defaults);
  assert.deepEqual([...blocked.classes].sort(), defaults);
});

test("every settings read saves only the two optional blurs for the next load", async () => {
  const page = startContentScripts();

  await page.answerSettings({ extensionEnabled: false, hideVideoTitles: true });

  assert.deepEqual(JSON.parse(page.localItems[LAST_SETTINGS_KEY]), {
    hideVideoPreviews: false,
    hideVideoTitles: true,
  });

  // Titles linked to previews: the copy keeps the title blur the page used.
  const linkedOn = startContentScripts();
  await linkedOn.answerSettings({ blurTitlesLinked: true, hideVideoPreviews: true, hideVideoTitles: false });
  assert.deepEqual(JSON.parse(linkedOn.localItems[LAST_SETTINGS_KEY]), {
    hideVideoPreviews: true,
    hideVideoTitles: true,
  });

  const linkedOff = startContentScripts();
  await linkedOff.answerSettings({ blurTitlesLinked: true, hideVideoPreviews: false, hideVideoTitles: true });
  assert.deepEqual(JSON.parse(linkedOff.localItems[LAST_SETTINGS_KEY]), {
    hideVideoPreviews: false,
    hideVideoTitles: false,
  });

  // Blocked site data: the read still applies.
  const blocked = startContentScripts({ localStorageBlocked: true });
  await blocked.answerSettings({ hideVideoTitles: true });
  assert.equal(blocked.classes.has("yas-hide-video-titles"), true);
});

test("a change of only the title link reaches the page", async () => {
  const page = startContentScripts();
  await page.answerSettings({ hideVideoPreviews: true, blurTitlesLinked: false, hideVideoTitles: false });
  assert.equal(page.classes.has("yas-hide-video-titles"), false);

  // The popup links titles to previews again: only blurTitlesLinked changes.
  const readsBefore = page.settingsReads;
  page.changeStoredSettings({ blurTitlesLinked: { oldValue: false, newValue: true } });
  assert.equal(page.settingsReads, readsBefore + 1, "the page reads the settings again");
  await page.answerSettings({ hideVideoPreviews: true, blurTitlesLinked: true, hideVideoTitles: false });

  assert.equal(page.classes.has("yas-hide-video-titles"), true);
});
