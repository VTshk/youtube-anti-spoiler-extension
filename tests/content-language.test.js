const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { createChromeI18n, getEnglishMessages } = require("./helpers/english-messages.js");

const rootPath = path.join(__dirname, "..");
// The isolated content scripts, in manifest order.
const CONTENT_SCRIPTS = JSON.parse(
  fs.readFileSync(path.join(rootPath, "manifest.json"), "utf8"),
).content_scripts[1].js;

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    id: "",
    listeners: {},
    style: {},
    textContent: "",
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function collectElements(element) {
  return element.children.flatMap((child) => [child, ...collectElements(child)]);
}

// A YouTube home page: no player, no comments. Elements that carry a message
// key can be added to the body to see them translated.
function createHomePage() {
  const classes = new Set();
  const head = createElement("head");
  const body = createElement("body");

  return {
    head,
    body,
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
    addEventListener() {},
    getElementById(id) {
      return collectElements(head).find((element) => element.id === id) || null;
    },
    querySelector() {
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

// Loads the content scripts into a fresh page the way Chrome does: they
// run, and content.js starts itself. Both storage reads wait until the test
// answers them.
function startContentScripts() {
  const doc = createHomePage();
  const pendingReads = {};
  const storageListeners = [];
  const context = {
    console,
    URL,
    document: doc,
    location: { href: "https://www.youtube.com/" },
    addEventListener() {},
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
    // A fresh page load, not a reload.
    performance: {
      getEntriesByType: () => [{ type: "navigate" }],
    },
    chrome: {
      i18n: createChromeI18n(),
      runtime: {
        lastError: null,
        onMessage: { addListener() {} },
      },
      storage: {
        sync: {
          get(keys, callback) {
            pendingReads.sync = callback;
          },
        },
        local: {
          get(key, callback) {
            assert.equal(key, "uiLanguage");
            pendingReads.local = callback;
          },
        },
        onChanged: {
          addListener(listener) {
            storageListeners.push(listener);
          },
        },
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  CONTENT_SCRIPTS.forEach((relativePath) => {
    vm.runInContext(fs.readFileSync(path.join(rootPath, relativePath), "utf8"), context);
  });

  return {
    doc,
    pendingReads,
    shared: context.YouTubeAntiSpoiler,
    emitStorageChange(changes, areaName) {
      storageListeners.forEach((listener) => listener(changes, areaName));
    },
  };
}

function addKeyedElement(page, key) {
  const element = createElement("p");
  page.shared.setText(element, key);
  page.doc.body.appendChild(element);
  return element;
}

test("protection is in place before the stored language is read, and texts switch after it", () => {
  const page = startContentScripts();
  const classes = page.doc.documentElement.classList;

  // Neither storage read has answered, yet protection is on.
  assert.equal(typeof page.pendingReads.sync, "function");
  assert.equal(typeof page.pendingReads.local, "function");
  assert.equal(classes.contains("yas-extension-enabled"), true);
  assert.equal(classes.contains("yas-hide-time"), true);
  assert.equal(classes.contains("yas-hide-player-progress-bar"), true);
  // The browser language meanwhile.
  assert.equal(page.doc.documentElement.dataset.yasMediaTitle, "YouTube video");
  const cover = addKeyedElement(page, "commentsHiddenTitle");
  assert.equal(cover.textContent, "Comments hidden");

  page.pendingReads.local({
    uiLanguage: {
      code: "en",
      messages: Object.assign(getEnglishMessages(), {
        commentsHiddenTitle: "TEST COMMENTS",
        mediaHiddenTitle: "TEST VIDEO",
      }),
    },
  });

  assert.equal(cover.textContent, "TEST COMMENTS");
  assert.equal(page.doc.documentElement.dataset.yasMediaTitle, "TEST VIDEO");
  // Only the texts changed: protection stays as it was.
  assert.equal(classes.contains("yas-extension-enabled"), true);
  assert.equal(classes.contains("yas-hide-time"), true);
});

test("a language picked in the popup reaches an open page without a reload", () => {
  const page = startContentScripts();
  const cover = addKeyedElement(page, "commentsShowButton");

  page.pendingReads.local({});
  assert.equal(cover.textContent, "Show comments");

  page.emitStorageChange(
    {
      uiLanguage: {
        newValue: {
          code: "en",
          messages: Object.assign(getEnglishMessages(), {
            commentsShowButton: "TEST SHOW",
            mediaHiddenTitle: "TEST VIDEO",
          }),
        },
      },
    },
    "local",
  );

  assert.equal(cover.textContent, "TEST SHOW");
  assert.equal(page.doc.documentElement.dataset.yasMediaTitle, "TEST VIDEO");

  // "Browser language" removes the key.
  page.emitStorageChange({ uiLanguage: { oldValue: {} } }, "local");

  assert.equal(cover.textContent, "Show comments");
  assert.equal(page.doc.documentElement.dataset.yasMediaTitle, "YouTube video");
});

test("skip button labels follow a language change", () => {
  const page = startContentScripts();
  const controls = createElement("div");
  controls.querySelector = () => null;
  page.doc.body.appendChild(controls);
  const playerDoc = {
    createElement,
    querySelector: (selector) => (selector === "#movie_player .ytp-left-controls" ? controls : null),
  };

  page.pendingReads.local({});
  page.shared.ensureSkipButtons(playerDoc);
  const backButton = controls.children[0].children[0];

  assert.equal(backButton.textContent, "−10m");
  assert.equal(backButton.attributes["aria-label"], "Back 10 minutes");
  assert.equal(backButton.attributes.title, "Back 10 minutes");

  page.emitStorageChange(
    {
      uiLanguage: {
        newValue: {
          code: "en",
          messages: Object.assign(getEnglishMessages(), { skipBack10Minutes: "TEST BACK" }),
        },
      },
    },
    "local",
  );

  assert.equal(backButton.attributes["aria-label"], "TEST BACK");
  assert.equal(backButton.attributes.title, "TEST BACK");
  // The short label is the same in every language.
  assert.equal(backButton.textContent, "−10m");
});
