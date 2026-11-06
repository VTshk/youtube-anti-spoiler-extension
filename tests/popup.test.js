const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { en, createChromeI18n, getEnglishMessages } = require("./helpers/english-messages.js");

const rootPath = path.join(__dirname, "..");
const POPUP_HTML = fs.readFileSync(path.join(rootPath, "popup", "popup.html"), "utf8");
const POPUP_CSS = fs.readFileSync(path.join(rootPath, "popup", "popup.css"), "utf8");
const POPUP_JS = fs.readFileSync(path.join(rootPath, "popup", "popup.js"), "utf8");

function createPopupElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    dataset: {},
    checked: false,
    disabled: false,
    hidden: false,
    textContent: "",
    value: "",
    listeners: {},
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
}

// "data-yas-i18n-label" -> "yasI18nLabel", like element.dataset.
function toDatasetName(attributeName) {
  return attributeName
    .slice("data-".length)
    .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// One fake element for every tag in popup.html that carries a data-
// attribute: those are all the elements popup.js and i18n.js look up.
function createElementsFromPopupHtml() {
  const elements = [];

  for (const [, tagName, attributeText] of POPUP_HTML.matchAll(/<([a-z0-9]+)\s([^>]*)>/g)) {
    if (!attributeText.includes("data-")) {
      continue;
    }

    const element = createPopupElement(tagName);

    for (const [, name, value] of attributeText.matchAll(/([a-z0-9-]+)(?:="([^"]*)")?/g)) {
      if (name.startsWith("data-")) {
        element.dataset[toDatasetName(name)] = value || "";
      } else if (name === "hidden") {
        element.hidden = true;
      } else if (name === "value") {
        element.value = value;
      } else if (value !== undefined) {
        element.attributes[name] = value;
      }
    }

    elements.push(element);
  }

  return elements;
}

function matchesDataSelector(element, selector) {
  const match = selector.match(/^\[(data-[a-z0-9-]+)\]$/);
  assert.ok(match, `popup fake supports [data-*] selectors only, got ${selector}`);
  return Object.prototype.hasOwnProperty.call(element.dataset, toDatasetName(match[1]));
}

function getEnabledIconPaths() {
  return {
    16: "/icons/icon16.png",
    32: "/icons/icon32.png",
    48: "/icons/icon48.png",
    128: "/icons/icon128.png",
  };
}

function getDisabledIconPaths() {
  return {
    16: "/icons/icon-disabled16.png",
    32: "/icons/icon-disabled32.png",
    48: "/icons/icon-disabled48.png",
    128: "/icons/icon-disabled128.png",
  };
}

// Serves the packaged locale files, like fetch(chrome.runtime.getURL(...)).
function fetchPackagedFile(url) {
  const filePath = path.join(rootPath, url.replace("chrome-extension://test-id/", ""));

  if (!fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404 });
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(fs.readFileSync(filePath, "utf8"))),
  });
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

async function loadPopup(
  storedSettings = {},
  {
    failRead = false,
    failWrite = false,
    shortcut = "Alt+Shift+S",
    storedLanguage = undefined,
    failLanguageRead = false,
    delayLanguageRead = false,
    failLanguageWrite = false,
    fetch = fetchPackagedFile,
    uiLanguage = "en-US",
  } = {},
) {
  const storageChangeListeners = [];
  const localItems = storedLanguage ? { uiLanguage: storedLanguage } : {};
  const elements = createElementsFromPopupHtml();
  const setIconCalls = [];
  const fetchedUrls = [];
  // With delayLanguageRead, the language read answers only when the test
  // calls finishLanguageRead().
  let pendingLanguageRead = null;

  function failWith(message, callback) {
    context.chrome.runtime.lastError = { message };
    callback({});
    context.chrome.runtime.lastError = null;
  }

  const document = {
    readyState: "complete",
    documentElement: { lang: "en" },
    createElement: createPopupElement,
    querySelector(selector) {
      return elements.find((element) => matchesDataSelector(element, selector)) || null;
    },
    querySelectorAll(selector) {
      return elements.filter((element) => matchesDataSelector(element, selector));
    },
  };
  const context = {
    console,
    fetch(url) {
      fetchedUrls.push(url);
      return fetch(url);
    },
    chrome: {
      action: {
        setIcon(details) {
          assert.equal(arguments.length, 1);
          setIconCalls.push(JSON.parse(JSON.stringify(details)));
          return Promise.resolve();
        },
      },
      commands: {
        getAll() {
          return Promise.resolve([{ name: "toggle-protection", shortcut }]);
        },
      },
      i18n: createChromeI18n(uiLanguage),
      runtime: {
        lastError: null,
        getURL(relativePath) {
          return `chrome-extension://test-id/${relativePath}`;
        },
      },
      storage: {
        sync: {
          get(keys, callback) {
            if (failRead) {
              failWith("storage unavailable", callback);
              return;
            }

            callback(storedSettings);
          },
          set(nextSettings, callback) {
            if (failWrite) {
              failWith("quota exceeded", callback);
              return;
            }

            Object.assign(storedSettings, nextSettings);
            callback();
          },
        },
        local: {
          get(key, callback) {
            assert.equal(key, "uiLanguage");

            if (failLanguageRead) {
              failWith("local storage unavailable", callback);
              return;
            }

            if (delayLanguageRead) {
              pendingLanguageRead = () => callback(Object.assign({}, localItems));
              return;
            }

            callback(Object.assign({}, localItems));
          },
          set(items, callback) {
            if (failLanguageWrite) {
              failWith("quota exceeded", callback);
              return;
            }

            Object.assign(localItems, items);
            callback();
          },
          remove(key, callback) {
            if (failLanguageWrite) {
              failWith("quota exceeded", callback);
              return;
            }

            delete localItems[key];
            callback();
          },
        },
        onChanged: {
          addListener(listener) {
            storageChangeListeners.push(listener);
          },
        },
      },
    },
    document,
  };

  context.globalThis = context;
  vm.createContext(context);

  vm.runInContext(
    fs.readFileSync(path.join(rootPath, "src", "shared", "settings.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(path.join(rootPath, "src", "shared", "i18n.js"), "utf8"),
    context,
  );
  vm.runInContext(POPUP_JS, context);

  await flushPromises();

  const getElement = (selector) => document.querySelector(selector);

  return {
    document,
    elements,
    fetchedUrls,
    localItems,
    powerToggle: getElement("[data-power-toggle]"),
    powerStatus: getElement("[data-power-status]"),
    powerNote: getElement("[data-power-note]"),
    settingsPanel: getElement("[data-settings-panel]"),
    settingToggles: document.querySelectorAll("[data-setting]"),
    skipNote: getElement("[data-skip-note]"),
    languageSelect: getElement("[data-language-select]"),
    shortcutLine: getElement("[data-shortcut-line]"),
    shortcutKey: getElement("[data-shortcut-key]"),
    shortcutMissing: getElement("[data-shortcut-missing]"),
    setIconCalls,
    status: getElement("[data-status]"),
    storedSettings,
    findText(key) {
      return elements.find((element) => element.dataset.yasI18n === key);
    },
    emitStorageChange(changes, areaName = "sync") {
      storageChangeListeners.forEach((listener) => listener(changes, areaName));
    },
    async finishLanguageRead() {
      pendingLanguageRead();
      await flushPromises();
    },
  };
}

function findToggle(settingToggles, setting) {
  return settingToggles.find((toggle) => toggle.dataset.setting === setting);
}

async function chooseLanguage(languageSelect, code) {
  languageSelect.value = code;
  await languageSelect.listeners.change();
}

// English texts with a few replaced, standing in for another language.
function createTestLanguage(code, replacements) {
  return { code, messages: Object.assign(getEnglishMessages(), replacements) };
}

function createDeferredFetch() {
  const pending = {};

  return {
    pending,
    fetch(url) {
      const code = url.match(/_locales\/([^/]+)\/messages\.json$/)[1];

      return new Promise((resolve) => {
        pending[code] = (messages) => resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(messages),
        });
      });
    },
  };
}

// Chrome's file format: { key: { message } }.
function toMessagesFile(messages) {
  const file = {};

  Object.keys(messages).forEach((key) => {
    file[key] = { message: messages[key] };
  });

  return file;
}

test("popup markup follows design B: the logo capsule, grouped settings and a footer", () => {
  assert.match(POPUP_HTML, /<html lang="en">/);
  assert.match(POPUP_HTML, /<section class="hero">/);
  assert.match(POPUP_HTML, /class="hero-top"[\s\S]*class="hero-band"[\s\S]*class="hero-bottom"/);
  assert.match(POPUP_HTML, /<input\s+type="checkbox"\s+role="switch"\s+data-power-toggle/);
  assert.match(POPUP_HTML, /data-yas-i18n="popupName">Anti-Spoiler</);
  // White on the logo red is large-text-only contrast: no small subtitle.
  assert.doesNotMatch(POPUP_HTML, /for YouTube<\/small>/);
  // The status line sits right under the capsule and is empty until needed.
  assert.match(POPUP_HTML, /<\/section>\s*<p class="status" data-status aria-live="polite"><\/p>/);

  const groupOrder = [
    "popupGroupPlayer",
    'data-setting="hidePlayerProgressBar"',
    'class="row nested"',
    'data-setting="showSkipButtons"',
    "popupGroupAroundVideos",
    'data-setting="hideVideoPreviews"',
    'data-setting="hideVideoTitles"',
    'data-setting="hideComments"',
    "popupGroupLive",
    'data-setting="startLiveFromBeginning"',
    "data-shortcut-line",
    "data-language-select",
  ];
  const positions = groupOrder.map((needle) => POPUP_HTML.indexOf(needle));
  positions.forEach((position, index) => {
    assert.notEqual(position, -1, `${groupOrder[index]} is in the popup`);
  });
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);

  // The settings panel holds the settings only; the footer stays visible
  // while protection is off.
  assert.ok(POPUP_HTML.indexOf("</footer>") > POPUP_HTML.lastIndexOf("data-setting="));
  assert.ok(POPUP_HTML.indexOf("<footer") > POPUP_HTML.lastIndexOf("data-setting="));
  assert.match(POPUP_HTML, /<option value="auto" data-yas-i18n="popupLanguageBrowser">/);
  assert.match(
    POPUP_HTML,
    /<script src="\.\.\/src\/shared\/settings\.js"><\/script>\s*<script src="\.\.\/src\/shared\/i18n\.js"><\/script>\s*<script src="popup\.js"><\/script>/,
  );
  assert.doesNotMatch(POPUP_HTML, /data-setting="hideTime"/);
  assert.doesNotMatch(POPUP_HTML, /data-setting="hideThumbnailDuration"/);
  assert.doesNotMatch(POPUP_HTML, /data-setting="hidePlayerTime"/);
});

test("popup HTML English texts match the English messages", () => {
  const keyedTexts = [...POPUP_HTML.matchAll(/data-yas-i18n="([A-Za-z0-9]+)"[^>]*>([^<]+)</g)];

  assert.ok(keyedTexts.length >= 17);
  keyedTexts.forEach(([, key, text]) => {
    assert.equal(text, en(key), key);
  });
});

test("popup CSS uses the design B tokens with a dark theme", () => {
  assert.match(POPUP_CSS, /color-scheme:\s*light dark/);
  assert.match(POPUP_CSS, /font-family:\s*system-ui, -apple-system, "Segoe UI", sans-serif/);
  assert.match(POPUP_CSS, /body\s*\{[^}]*width:\s*352px/);

  const lightTokens = {
    "--bg": "#f4f2f0",
    "--surface": "#ffffff",
    "--text": "#18181b",
    "--muted": "#57534e",
    "--line": "#e8e4e0",
    "--control-border": "#757067",
    "--focus": "#18181b",
    "--accent": "#c85252",
    "--error": "#b33939",
  };
  const darkTokens = {
    "--bg": "#141416",
    "--surface": "#1e1e22",
    "--text": "#f4f4f5",
    "--muted": "#a8a29e",
    "--line": "#2e2e34",
    "--control-border": "#8a8a94",
    "--focus": "#ffffff",
    "--error": "#e06c6c",
  };
  const [lightPart, darkPart] = POPUP_CSS.split("@media (prefers-color-scheme: dark)");

  Object.entries(lightTokens).forEach(([name, value]) => {
    assert.match(lightPart, new RegExp(`${name}:\\s*${value};`), `light ${name}`);
  });
  Object.entries(darkTokens).forEach(([name, value]) => {
    assert.match(darkPart, new RegExp(`${name}:\\s*${value};`), `dark ${name}`);
  });

  assert.match(POPUP_CSS, /\.hero\s*\{[^}]*border-radius:\s*18px;[^}]*overflow:\s*hidden;/);
  assert.match(POPUP_CSS, /\.hero-name\s*\{[^}]*font-size:\s*19px;[^}]*font-weight:\s*800;/);
  assert.match(POPUP_CSS, /\.hero-band\s*\{[^}]*background:\s*#222222;/);
  assert.match(POPUP_CSS, /\.hero:has\(\[data-power-toggle\]:not\(:checked\)\)\s*\{[^}]*background:\s*#6e6e6e;/);
  assert.match(POPUP_CSS, /\.switch\s*\{[^}]*width:\s*46px;[^}]*height:\s*26px;/);
  assert.match(POPUP_CSS, /\.toggle\s*\{[^}]*width:\s*36px;[^}]*height:\s*20px;/);
  assert.match(POPUP_CSS, /\[data-status\]:empty\s*\{\s*display:\s*none;/);
  // The inputs are invisible, so the focus ring goes on the picture next to them.
  assert.match(POPUP_CSS, /\.switch input:focus-visible \+ span\s*\{[^}]*outline:\s*2px solid #ffffff;/);
  assert.match(POPUP_CSS, /\.toggle input:focus-visible \+ span\s*\{[^}]*outline:\s*2px solid var\(--focus\);/);
  assert.match(POPUP_CSS, /\.language select:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--focus\);/);
  assert.match(POPUP_CSS, /:lang\(ja\), :lang\(ko\), :lang\(zh\)\)\s*\{\s*line-height:\s*1\.5;/);

  // Old design rules are gone.
  ["\\.lead", "\\.paused-panel", "\\.power-track", "\\.eyebrow", "\\.brand-logo", "#cc0000"].forEach((pattern) => {
    assert.doesNotMatch(POPUP_CSS, new RegExp(pattern), pattern);
  });
});

test("popup script takes every text from the messages", () => {
  assert.match(POPUP_JS, /settingsPanel\.hidden = !enabled/);
  ["Protection on", "Protection off", "\"Could not save settings\"", "Shortcut:", "Requires \"Hide"].forEach((text) => {
    assert.doesNotMatch(POPUP_JS, new RegExp(text), text);
  });
});

test("popup shows the protection status and notes in English", async () => {
  const { powerToggle, powerStatus, powerNote, settingsPanel } = await loadPopup({});

  assert.equal(powerToggle.checked, true);
  assert.equal(powerStatus.textContent, "Protection on");
  assert.equal(powerNote.textContent, "Video time and duration are hidden");
  assert.equal(powerToggle.attributes["aria-label"], "Spoiler protection");
  assert.equal(settingsPanel.hidden, false);
});

test("popup hides the settings but keeps the footer while protection is off", async () => {
  const { powerStatus, powerNote, settingsPanel, languageSelect } = await loadPopup({
    extensionEnabled: false,
  });

  assert.equal(powerStatus.textContent, "Protection off");
  assert.equal(powerNote.textContent, "YouTube is shown normally");
  assert.equal(settingsPanel.hidden, true);
  assert.equal(languageSelect.disabled, false);
});

test("popup sets the toolbar action icon to gray after disabling protection", async () => {
  const { powerToggle, setIconCalls, storedSettings } = await loadPopup({
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
  });

  powerToggle.checked = false;
  await powerToggle.listeners.change();

  assert.equal(storedSettings.extensionEnabled, false);
  assert.deepEqual(setIconCalls.at(-1), {
    path: getDisabledIconPaths(),
  });
});

test("popup sets the toolbar action icon to normal after enabling protection", async () => {
  const { powerToggle, setIconCalls, storedSettings } = await loadPopup({
    extensionEnabled: false,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
    startLiveFromBeginning: true,
  });

  powerToggle.checked = true;
  await powerToggle.listeners.change();

  assert.equal(storedSettings.extensionEnabled, true);
  assert.deepEqual(setIconCalls.at(-1), {
    path: getEnabledIconPaths(),
  });
});

test("popup goes read-only when settings cannot be loaded", async () => {
  const { powerToggle, settingToggles, status, languageSelect } = await loadPopup(
    {},
    { failRead: true },
  );

  // Saving from this state would overwrite the user's stored settings with
  // the displayed defaults, so every control must be disabled.
  assert.equal(powerToggle.disabled, true);
  assert.equal(settingToggles.length, 6);
  settingToggles.forEach((toggle) => {
    assert.equal(toggle.disabled, true);
  });
  assert.equal(languageSelect.disabled, true);
  assert.equal(status.textContent, "Could not load settings — close and reopen the popup");
  assert.equal(languageSelect.listeners.change, undefined);
});

test("popup in read-only mode still shows the stored language", async () => {
  const stored = createTestLanguage("en", {
    popupGroupPlayer: "TEST PLAYER",
    popupLoadError: "TEST LOAD ERROR",
  });
  const { findText, status, languageSelect } = await loadPopup(
    {},
    { failRead: true, storedLanguage: stored },
  );

  assert.equal(findText("popupGroupPlayer").textContent, "TEST PLAYER");
  assert.equal(status.textContent, "TEST LOAD ERROR");
  assert.equal(languageSelect.value, "en");
  assert.equal(languageSelect.disabled, true);
});

test("popup saves the video title setting when changed", async () => {
  const { settingToggles, storedSettings } = await loadPopup({
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
    hideVideoTitles: false,
    startLiveFromBeginning: true,
  });
  const titleToggle = findToggle(settingToggles, "hideVideoTitles");

  assert.equal(titleToggle.checked, false);

  titleToggle.checked = true;
  await titleToggle.listeners.change();

  assert.equal(storedSettings.hideVideoTitles, true);
});

test("popup saves the live start setting when changed", async () => {
  const { settingToggles, storedSettings } = await loadPopup({
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
    startLiveFromBeginning: true,
  });
  const liveStartToggle = findToggle(settingToggles, "startLiveFromBeginning");

  assert.equal(liveStartToggle.checked, true);

  liveStartToggle.checked = false;
  await liveStartToggle.listeners.change();

  assert.equal(storedSettings.startLiveFromBeginning, false);
});

test("popup shows skip buttons and comment hiding on by default and saves them when changed", async () => {
  const { settingToggles, storedSettings } = await loadPopup({});
  const skipToggle = findToggle(settingToggles, "showSkipButtons");
  const commentsToggle = findToggle(settingToggles, "hideComments");

  assert.equal(skipToggle.checked, true);
  assert.equal(skipToggle.disabled, false);
  assert.equal(commentsToggle.checked, true);

  skipToggle.checked = false;
  await skipToggle.listeners.change();
  commentsToggle.checked = false;
  await commentsToggle.listeners.change();

  assert.equal(storedSettings.showSkipButtons, false);
  assert.equal(storedSettings.hideComments, false);
});

test("popup disables skip buttons while the progress bar is shown, keeping their saved value", async () => {
  const { settingToggles, skipNote, storedSettings } = await loadPopup({
    hidePlayerProgressBar: false,
    showSkipButtons: true,
  });
  const progressToggle = findToggle(settingToggles, "hidePlayerProgressBar");
  const skipToggle = findToggle(settingToggles, "showSkipButtons");

  assert.equal(skipToggle.disabled, true);
  assert.equal(skipToggle.checked, true);
  assert.equal(skipNote.textContent, 'Requires "Hide progress bar"');

  progressToggle.checked = true;
  await progressToggle.listeners.change();

  assert.equal(skipToggle.disabled, false);
  assert.equal(skipToggle.checked, true);
  assert.equal(skipNote.textContent, "Jump 10 s, 1 min or 10 min");

  progressToggle.checked = false;
  await progressToggle.listeners.change();

  assert.equal(skipToggle.disabled, true);
  assert.equal(skipNote.textContent, 'Requires "Hide progress bar"');
  assert.equal(storedSettings.showSkipButtons, true);
});

test("popup keeps showing protection off when enabling it fails to save", async () => {
  const { powerToggle, powerStatus, status, storedSettings } = await loadPopup(
    { extensionEnabled: false },
    { failWrite: true },
  );

  powerToggle.checked = true;
  await powerToggle.listeners.change();
  await flushPromises();

  assert.equal(storedSettings.extensionEnabled, false);
  assert.equal(powerToggle.checked, false);
  assert.equal(powerStatus.textContent, "Protection off");
  assert.equal(status.textContent, "Could not save settings");
});

test("popup reverts a checkbox whose change failed to save", async () => {
  const { settingToggles } = await loadPopup(
    { hideVideoPreviews: false },
    { failWrite: true },
  );
  const previewToggle = findToggle(settingToggles, "hideVideoPreviews");

  previewToggle.checked = true;
  await previewToggle.listeners.change();
  await flushPromises();

  assert.equal(previewToggle.checked, false);
});

test("popup does not undo a setting changed elsewhere while it is open", async () => {
  const { settingToggles, storedSettings, emitStorageChange } = await loadPopup({
    hideVideoTitles: false,
    hideVideoPreviews: false,
  });
  const titleToggle = findToggle(settingToggles, "hideVideoTitles");
  const previewToggle = findToggle(settingToggles, "hideVideoPreviews");

  // Another popup turns title hiding on.
  storedSettings.hideVideoTitles = true;
  emitStorageChange({ hideVideoTitles: { oldValue: false, newValue: true } });

  assert.equal(titleToggle.checked, true);

  previewToggle.checked = true;
  await previewToggle.listeners.change();
  await flushPromises();

  assert.equal(storedSettings.hideVideoPreviews, true);
  assert.equal(storedSettings.hideVideoTitles, true);
});

test("popup clears the save error after the next successful save", async () => {
  const { settingToggles, status } = await loadPopup({ hideVideoTitles: false });
  const titleToggle = findToggle(settingToggles, "hideVideoTitles");

  status.textContent = "Could not save settings";
  status.dataset.yasI18n = "popupSaveError";
  titleToggle.checked = true;
  await titleToggle.listeners.change();
  await flushPromises();

  assert.equal(status.textContent, "");
  // Without its key, a language change does not bring the message back.
  assert.equal(status.dataset.yasI18n, undefined);
});

test("popup shows the protection shortcut the user has set", async () => {
  const { shortcutLine, shortcutKey, shortcutMissing, findText } = await loadPopup({});
  await flushPromises();

  assert.equal(findText("popupShortcutLabel").textContent, "Shortcut:");
  assert.equal(shortcutKey.tagName, "KBD");
  assert.equal(shortcutKey.textContent, "Alt+Shift+S");
  assert.equal(shortcutLine.hidden, false);
  assert.equal(shortcutMissing.hidden, true);
});

test("popup explains where to set a shortcut when none is assigned", async () => {
  const { shortcutLine, shortcutMissing } = await loadPopup({}, { shortcut: "" });
  await flushPromises();

  assert.equal(shortcutLine.hidden, true);
  assert.equal(shortcutMissing.hidden, false);
  assert.equal(shortcutMissing.textContent, "Set a shortcut in chrome://extensions/shortcuts");
});

test("popup keeps both changes when two checkboxes change before the first save finishes", async () => {
  const { settingToggles, storedSettings } = await loadPopup({
    extensionEnabled: true,
    hideVideoPreviews: false,
    hideVideoTitles: false,
  });
  const toggle = (setting) => findToggle(settingToggles, setting);

  toggle("hideVideoTitles").checked = true;
  const firstSave = toggle("hideVideoTitles").listeners.change();
  toggle("hideVideoPreviews").checked = true;
  const secondSave = toggle("hideVideoPreviews").listeners.change();
  await Promise.all([firstSave, secondSave]);

  assert.equal(storedSettings.hideVideoTitles, true);
  assert.equal(storedSettings.hideVideoPreviews, true);
  assert.equal(toggle("hideVideoTitles").checked, true);
  assert.equal(toggle("hideVideoPreviews").checked, true);
});

// --- Language ---

test("popup lists Browser language first, then every language under its own name", async () => {
  const { languageSelect, findText, document } = await loadPopup({});

  assert.equal(findText("popupLanguageBrowser").textContent, "Browser language");
  assert.equal(findText("popupLanguageLabel").textContent, "Language");
  assert.deepEqual(
    languageSelect.children.map((option) => [option.value, option.textContent]),
    [["en", "English"]],
  );
  assert.equal(languageSelect.value, "auto");
  assert.equal(document.documentElement.lang, "en");
});

test("popup follows the browser language when no language is stored", async () => {
  const { document, findText } = await loadPopup({}, { uiLanguage: "ru" });

  // Only English exists so far, and that is what Chrome shows.
  assert.equal(document.documentElement.lang, "en");
  assert.equal(findText("popupGroupPlayer").textContent, "Player");
});

test("popup shows the stored language at startup", async () => {
  const stored = createTestLanguage("en", {
    popupGroupPlayer: "TEST PLAYER",
    popupStatusOn: "TEST ON",
    popupMasterSwitchLabel: "TEST SWITCH",
    popupSkipButtonsNote: "TEST SKIP NOTE",
  });
  const { findText, powerStatus, powerToggle, skipNote, languageSelect, document, fetchedUrls } =
    await loadPopup({}, { storedLanguage: stored });

  assert.equal(findText("popupGroupPlayer").textContent, "TEST PLAYER");
  assert.equal(powerStatus.textContent, "TEST ON");
  assert.equal(powerToggle.attributes["aria-label"], "TEST SWITCH");
  assert.equal(skipNote.textContent, "TEST SKIP NOTE");
  assert.equal(languageSelect.value, "en");
  assert.equal(document.documentElement.lang, "en");
  // The stored texts are used as they are; nothing is fetched at startup.
  assert.deepEqual(fetchedUrls, []);
});

test("popup uses the browser language when the stored language cannot be read", async () => {
  const { findText, powerStatus, languageSelect, status } = await loadPopup(
    {},
    { failLanguageRead: true },
  );

  assert.equal(findText("popupGroupPlayer").textContent, "Player");
  assert.equal(powerStatus.textContent, "Protection on");
  assert.equal(languageSelect.value, "auto");
  assert.equal(status.textContent, "");
});

test("popup stores a chosen language with its texts and removes it for Browser language", async () => {
  const { languageSelect, localItems, fetchedUrls, document } = await loadPopup({});

  await chooseLanguage(languageSelect, "en");

  assert.deepEqual(fetchedUrls, ["chrome-extension://test-id/_locales/en/messages.json"]);
  // Stored from inside the popup's own realm, so compared as plain data.
  assert.deepEqual(JSON.parse(JSON.stringify(localItems.uiLanguage)), {
    code: "en",
    messages: getEnglishMessages(),
  });
  assert.equal(languageSelect.value, "en");
  assert.equal(document.documentElement.lang, "en");

  await chooseLanguage(languageSelect, "auto");

  assert.equal(Object.prototype.hasOwnProperty.call(localItems, "uiLanguage"), false);
  assert.equal(languageSelect.value, "auto");
});

test("popup keeps the latest language choice when two loads finish in reverse order", async () => {
  const deferred = createDeferredFetch();
  const { languageSelect, localItems, findText, document } = await loadPopup(
    {},
    { fetch: deferred.fetch },
  );

  languageSelect.value = "en";
  const firstChoice = languageSelect.listeners.change();
  languageSelect.value = "pt_BR";
  const secondChoice = languageSelect.listeners.change();

  deferred.pending.pt_BR(toMessagesFile(Object.assign(getEnglishMessages(), {
    popupGroupPlayer: "Reprodutor",
  })));
  await secondChoice;
  deferred.pending.en(toMessagesFile(getEnglishMessages()));
  await firstChoice;
  await flushPromises();

  assert.equal(localItems.uiLanguage.code, "pt_BR");
  assert.equal(findText("popupGroupPlayer").textContent, "Reprodutor");
  assert.equal(languageSelect.value, "pt_BR");
  assert.equal(document.documentElement.lang, "pt-BR");
});

test("popup restores the language list and shows an error when loading the language fails", async () => {
  const { languageSelect, localItems, status, findText } = await loadPopup(
    {},
    { fetch: () => Promise.resolve({ ok: false, status: 404 }) },
  );

  await chooseLanguage(languageSelect, "en");

  assert.equal(languageSelect.value, "auto");
  assert.equal(status.textContent, "Could not change the language");
  assert.equal(Object.prototype.hasOwnProperty.call(localItems, "uiLanguage"), false);
  assert.equal(findText("popupGroupPlayer").textContent, "Player");
});

test("popup restores the language list and shows an error when saving the language fails", async () => {
  const stored = createTestLanguage("en", { popupGroupPlayer: "TEST PLAYER" });
  const { languageSelect, localItems, status, findText } = await loadPopup(
    {},
    { storedLanguage: stored, failLanguageWrite: true },
  );

  await chooseLanguage(languageSelect, "auto");

  assert.equal(languageSelect.value, "en");
  assert.equal(status.textContent, "Could not change the language");
  assert.deepEqual(localItems.uiLanguage, stored);
  // The shown language stays as it was.
  assert.equal(findText("popupGroupPlayer").textContent, "TEST PLAYER");
});

test("popup follows a language picked in another popup window", async () => {
  const { emitStorageChange, findText, powerStatus, languageSelect } = await loadPopup({});

  emitStorageChange(
    {
      uiLanguage: {
        newValue: createTestLanguage("en", {
          popupGroupPlayer: "TEST PLAYER",
          popupStatusOn: "TEST ON",
        }),
      },
    },
    "local",
  );

  assert.equal(findText("popupGroupPlayer").textContent, "TEST PLAYER");
  assert.equal(powerStatus.textContent, "TEST ON");
  assert.equal(languageSelect.value, "en");

  // Removed elsewhere: back to the browser language.
  emitStorageChange({ uiLanguage: { oldValue: {} } }, "local");

  assert.equal(findText("popupGroupPlayer").textContent, "Player");
  assert.equal(powerStatus.textContent, "Protection on");
  assert.equal(languageSelect.value, "auto");
});

test("popup shows the settings and follows changes made elsewhere before the language is read", async () => {
  const stored = createTestLanguage("en", { popupStatusOn: "TEST ON" });
  const {
    settingToggles,
    storedSettings,
    emitStorageChange,
    finishLanguageRead,
    powerStatus,
    languageSelect,
  } = await loadPopup(
    { hideVideoTitles: false, hideVideoPreviews: false },
    { storedLanguage: stored, delayLanguageRead: true },
  );
  const titleToggle = findToggle(settingToggles, "hideVideoTitles");
  const previewToggle = findToggle(settingToggles, "hideVideoPreviews");

  // The language read has not answered yet, but the settings are shown.
  assert.equal(previewToggle.checked, false);
  assert.equal(powerStatus.textContent, "Protection on");

  // Another popup turns title hiding on.
  storedSettings.hideVideoTitles = true;
  emitStorageChange({ hideVideoTitles: { oldValue: false, newValue: true } });
  assert.equal(titleToggle.checked, true);

  // The texts set before the language arrived switch to it.
  await finishLanguageRead();
  assert.equal(powerStatus.textContent, "TEST ON");
  assert.equal(languageSelect.value, "en");

  previewToggle.checked = true;
  await previewToggle.listeners.change();
  await flushPromises();

  assert.equal(storedSettings.hideVideoPreviews, true);
  assert.equal(storedSettings.hideVideoTitles, true);
});

test("popup does not write its own language choice over a removal made elsewhere while loading", async () => {
  const deferred = createDeferredFetch();
  const stored = createTestLanguage("en", { popupGroupPlayer: "TEST PLAYER" });
  const { languageSelect, localItems, emitStorageChange, findText } = await loadPopup(
    {},
    { storedLanguage: stored, fetch: deferred.fetch },
  );

  // Only English exists, so the choice uses a made-up second language.
  languageSelect.value = "pt_BR";
  const choice = languageSelect.listeners.change();

  // Another popup window switches back to the browser language.
  delete localItems.uiLanguage;
  emitStorageChange({ uiLanguage: { oldValue: stored } }, "local");

  deferred.pending.pt_BR(toMessagesFile(Object.assign(getEnglishMessages(), {
    popupGroupPlayer: "Reprodutor",
  })));
  await choice;
  await flushPromises();

  assert.equal(Object.prototype.hasOwnProperty.call(localItems, "uiLanguage"), false);
  assert.equal(languageSelect.value, "auto");
  assert.equal(findText("popupGroupPlayer").textContent, "Player");
});
