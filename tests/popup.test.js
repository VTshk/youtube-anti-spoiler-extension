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
    settingsPanels: document.querySelectorAll("[data-settings-panel]"),
    settingToggles: document.querySelectorAll("[data-setting]"),
    languageSelect: getElement("[data-language-select]"),
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

test("popup markup follows design B: the logo capsule, the main settings and Advanced settings", () => {
  assert.match(POPUP_HTML, /<html lang="en">/);
  assert.match(POPUP_HTML, /<section class="hero">/);
  assert.match(POPUP_HTML, /class="hero-top"[\s\S]*class="hero-band"[\s\S]*class="hero-bottom"/);
  assert.match(POPUP_HTML, /<input\s+type="checkbox"\s+role="switch"\s+data-power-toggle/);
  assert.match(POPUP_HTML, /data-yas-i18n="popupName">Anti-Spoiler</);
  // White on the logo red is large-text-only contrast: no small subtitle.
  assert.doesNotMatch(POPUP_HTML, /for YouTube<\/small>/);
  // The status line sits right under the capsule and is empty until needed.
  assert.match(POPUP_HTML, /<\/section>\s*<p class="status" data-status aria-live="polite"><\/p>/);

  // The main card first, then "Advanced settings" with the rest and the
  // language.
  const order = [
    '<div class="card" data-settings-panel>',
    'data-setting="hidePlayerProgressBar"',
    'data-setting="hideVideoPreviews"',
    'data-setting="startLiveFromBeginning"',
    '<details class="card advanced">',
    '<summary class="advanced-summary">',
    'data-yas-i18n="popupAdvancedSettings"',
    "<div data-settings-panel>",
    'data-setting="hideVideoTitles"',
    'data-setting="hideComments"',
    'data-yas-i18n="popupLanguageLabel"',
    "data-language-select",
  ];
  const positions = order.map((needle) => POPUP_HTML.indexOf(needle));
  positions.forEach((position, index) => {
    assert.notEqual(position, -1, `${order[index]} is in the popup`);
  });
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.equal(POPUP_HTML.match(/data-setting="/g).length, 5);
  assert.equal(POPUP_HTML.match(/data-settings-panel/g).length, 2);

  // Closed by default. The language row sits outside the settings that hide
  // while protection is off, so it stays reachable.
  assert.doesNotMatch(POPUP_HTML, /<details[^>]*\sopen/);
  assert.match(
    POPUP_HTML,
    /<div data-settings-panel>(?:(?!<\/div>)[\s\S])*<\/div>\s*<label class="row language">/,
  );
  // The list has no "browser language" entry; the options come from the script.
  assert.match(POPUP_HTML, /<select data-language-select><\/select>/);

  // Gone: group headings, the skip buttons row and the shortcut hint.
  ["popupGroup", "showSkipButtons", "class=\"row nested\"", "data-shortcut", "<kbd", "<footer", "popupLanguageBrowser"].forEach((text) => {
    assert.doesNotMatch(POPUP_HTML, new RegExp(text), text);
  });
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

  assert.ok(keyedTexts.length >= 14);
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

  // "Advanced settings": a full-width row, 14 px 600, with a chevron that
  // turns when open and a focus ring drawn inside the card.
  assert.match(POPUP_CSS, /\.advanced-summary\s*\{[^}]*min-height:\s*48px;[^}]*font-size:\s*14px;[^}]*font-weight:\s*600;[^}]*list-style:\s*none;/);
  assert.match(POPUP_CSS, /\.advanced-summary::after\s*\{[^}]*transform:\s*rotate\(45deg\);/);
  assert.match(POPUP_CSS, /\.advanced\[open\] > \.advanced-summary::after\s*\{[^}]*transform:\s*rotate\(225deg\);/);
  assert.match(POPUP_CSS, /\.advanced-summary:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--focus\);[^}]*outline-offset:\s*-2px;/);

  // Old design rules are gone.
  ["\\.lead", "\\.paused-panel", "\\.power-track", "\\.eyebrow", "\\.brand-logo", "#cc0000", "\\.footer", "kbd", "\\.group-title", "\\.nested", "h2"].forEach((pattern) => {
    assert.doesNotMatch(POPUP_CSS, new RegExp(pattern), pattern);
  });
});

test("popup script takes every text from the messages", () => {
  assert.match(POPUP_JS, /panel\.hidden = !enabled/);
  ["Protection on", "Protection off", "\"Could not save settings\"", "Browser language"].forEach((text) => {
    assert.doesNotMatch(POPUP_JS, new RegExp(text), text);
  });
  // No shortcut hint and no skip buttons setting any more.
  ["chrome\\.commands", "commands\\.getAll", "shortcut", "showSkipButtons"].forEach((text) => {
    assert.doesNotMatch(POPUP_JS, new RegExp(text), text);
  });
});

test("popup shows the protection status and notes in English", async () => {
  const { powerToggle, powerStatus, powerNote, settingsPanels } = await loadPopup({});

  assert.equal(powerToggle.checked, true);
  assert.equal(powerStatus.textContent, "Protection on");
  assert.equal(powerNote.textContent, "Video time and duration are hidden");
  assert.equal(powerToggle.attributes["aria-label"], "Spoiler protection");
  assert.equal(settingsPanels.length, 2);
  settingsPanels.forEach((panel) => {
    assert.equal(panel.hidden, false);
  });
});

test("popup hides the settings but keeps the language while protection is off", async () => {
  const { powerToggle, powerStatus, powerNote, settingsPanels, languageSelect } = await loadPopup({
    extensionEnabled: false,
  });

  assert.equal(powerStatus.textContent, "Protection off");
  assert.equal(powerNote.textContent, "YouTube is shown normally");
  settingsPanels.forEach((panel) => {
    assert.equal(panel.hidden, true);
  });
  assert.equal(languageSelect.disabled, false);

  powerToggle.checked = true;
  await powerToggle.listeners.change();

  settingsPanels.forEach((panel) => {
    assert.equal(panel.hidden, false);
  });
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
  assert.equal(settingToggles.length, 5);
  settingToggles.forEach((toggle) => {
    assert.equal(toggle.disabled, true);
  });
  assert.equal(languageSelect.disabled, true);
  assert.equal(status.textContent, "Could not load settings — close and reopen the popup");
  assert.equal(languageSelect.listeners.change, undefined);
});

test("popup in read-only mode still shows the stored language", async () => {
  const stored = createTestLanguage("de", {
    popupHideProgressBar: "TEST BAR",
    popupLoadError: "TEST LOAD ERROR",
  });
  const { findText, status, languageSelect } = await loadPopup(
    {},
    { failRead: true, storedLanguage: stored },
  );

  assert.equal(findText("popupHideProgressBar").textContent, "TEST BAR");
  assert.equal(status.textContent, "TEST LOAD ERROR");
  assert.equal(languageSelect.value, "de");
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

test("popup shows comment hiding on by default and saves it when changed", async () => {
  const { settingToggles, storedSettings } = await loadPopup({});
  const commentsToggle = findToggle(settingToggles, "hideComments");

  assert.equal(commentsToggle.checked, true);

  commentsToggle.checked = false;
  await commentsToggle.listeners.change();

  assert.equal(storedSettings.hideComments, false);
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

// { key: text } of a packaged locale, the shape the popup stores.
function readPackagedMessages(code) {
  const file = JSON.parse(
    fs.readFileSync(path.join(rootPath, "_locales", code, "messages.json"), "utf8"),
  );
  const messages = {};

  Object.keys(file).forEach((key) => {
    messages[key] = file[key].message;
  });

  return messages;
}

function hasStoredLanguage(localItems) {
  return Object.prototype.hasOwnProperty.call(localItems, "uiLanguage");
}

test("popup lists every language under its own name, with no browser language entry", async () => {
  const { languageSelect, findText, document } = await loadPopup({});

  assert.equal(findText("popupLanguageLabel").textContent, "Language");
  assert.equal(findText("popupAdvancedSettings").textContent, "Advanced settings");
  assert.deepEqual(
    languageSelect.children.map((option) => [option.value, option.textContent]),
    [
      ["en", "English"],
      ["ru", "Русский"],
      ["es", "Español"],
      ["pt_BR", "Português (Brasil)"],
      ["de", "Deutsch"],
      ["fr", "Français"],
      ["ja", "日本語"],
      ["ko", "한국어"],
      ["id", "Bahasa Indonesia"],
      ["tr", "Türkçe"],
    ],
  );
  // The test browser is in English.
  assert.equal(languageSelect.value, "en");
  assert.equal(document.documentElement.lang, "en");
});

test("popup selects the browser language when no language is stored", async () => {
  const german = await loadPopup({}, { uiLanguage: "de-DE" });

  assert.equal(german.languageSelect.value, "de");
  assert.equal(german.document.documentElement.lang, "de");
  assert.deepEqual(german.fetchedUrls, []);
  assert.equal(hasStoredLanguage(german.localItems), false);

  // A browser language the extension does not have: Chrome shows English.
  const chinese = await loadPopup({}, { uiLanguage: "zh-CN" });

  assert.equal(chinese.languageSelect.value, "en");
  assert.equal(chinese.document.documentElement.lang, "en");
});

test("popup follows the browser language when no language is stored", async () => {
  const { document, findText, fetchedUrls, languageSelect } = await loadPopup(
    {},
    { uiLanguage: "ru" },
  );

  // Chrome itself picks the Russian texts, so the popup loads no file.
  // The test chrome.i18n always answers in English.
  assert.equal(document.documentElement.lang, "ru");
  assert.equal(languageSelect.value, "ru");
  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
  assert.deepEqual(fetchedUrls, []);
});

test("popup shows the stored language at startup", async () => {
  const stored = createTestLanguage("de", {
    popupHideProgressBar: "TEST BAR",
    popupStatusOn: "TEST ON",
    popupMasterSwitchLabel: "TEST SWITCH",
    popupAdvancedSettings: "TEST ADVANCED",
  });
  const { findText, powerStatus, powerToggle, languageSelect, document, fetchedUrls } =
    await loadPopup({}, { storedLanguage: stored });

  assert.equal(findText("popupHideProgressBar").textContent, "TEST BAR");
  assert.equal(findText("popupAdvancedSettings").textContent, "TEST ADVANCED");
  assert.equal(powerStatus.textContent, "TEST ON");
  assert.equal(powerToggle.attributes["aria-label"], "TEST SWITCH");
  assert.equal(languageSelect.value, "de");
  assert.equal(document.documentElement.lang, "de");
  // The stored texts are used as they are; nothing is fetched at startup.
  assert.deepEqual(fetchedUrls, []);
});

test("popup uses the browser language when the stored language cannot be read", async () => {
  const { findText, powerStatus, languageSelect, status } = await loadPopup(
    {},
    { failLanguageRead: true },
  );

  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
  assert.equal(powerStatus.textContent, "Protection on");
  assert.equal(languageSelect.value, "en");
  assert.equal(status.textContent, "");
});

test("popup stores a language other than the browser's and removes the choice for the browser's own", async () => {
  const { languageSelect, localItems, fetchedUrls, document, findText } = await loadPopup({});
  const german = readPackagedMessages("de");

  await chooseLanguage(languageSelect, "de");

  assert.deepEqual(fetchedUrls, ["chrome-extension://test-id/_locales/de/messages.json"]);
  // Stored from inside the popup's own realm, so compared as plain data.
  assert.deepEqual(JSON.parse(JSON.stringify(localItems.uiLanguage)), {
    code: "de",
    messages: german,
  });
  assert.equal(languageSelect.value, "de");
  assert.equal(document.documentElement.lang, "de");
  assert.equal(findText("popupHideProgressBar").textContent, german.popupHideProgressBar);

  // English is the browser language: picking it removes the choice, so the
  // extension follows the browser again.
  await chooseLanguage(languageSelect, "en");

  assert.equal(hasStoredLanguage(localItems), false);
  assert.equal(fetchedUrls.length, 1);
  assert.equal(languageSelect.value, "en");
  assert.equal(document.documentElement.lang, "en");
  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
});

test("popup stores English when the browser language is another one", async () => {
  const { languageSelect, localItems } = await loadPopup({}, { uiLanguage: "de-DE" });

  await chooseLanguage(languageSelect, "en");

  assert.equal(localItems.uiLanguage.code, "en");
  assert.equal(languageSelect.value, "en");

  await chooseLanguage(languageSelect, "de");

  assert.equal(hasStoredLanguage(localItems), false);
  assert.equal(languageSelect.value, "de");
});

test("popup keeps the latest language choice when two loads finish in reverse order", async () => {
  const deferred = createDeferredFetch();
  const { languageSelect, localItems, findText, document } = await loadPopup(
    {},
    { fetch: deferred.fetch },
  );

  languageSelect.value = "de";
  const firstChoice = languageSelect.listeners.change();
  languageSelect.value = "pt_BR";
  const secondChoice = languageSelect.listeners.change();

  deferred.pending.pt_BR(toMessagesFile(Object.assign(getEnglishMessages(), {
    popupHideProgressBar: "Ocultar barra",
  })));
  await secondChoice;
  deferred.pending.de(toMessagesFile(getEnglishMessages()));
  await firstChoice;
  await flushPromises();

  assert.equal(localItems.uiLanguage.code, "pt_BR");
  assert.equal(findText("popupHideProgressBar").textContent, "Ocultar barra");
  assert.equal(languageSelect.value, "pt_BR");
  assert.equal(document.documentElement.lang, "pt-BR");
});

test("popup keeps the browser language when it is picked while another language is still loading", async () => {
  const deferred = createDeferredFetch();
  const { languageSelect, localItems, findText } = await loadPopup({}, { fetch: deferred.fetch });

  languageSelect.value = "de";
  const firstChoice = languageSelect.listeners.change();
  await chooseLanguage(languageSelect, "en");

  deferred.pending.de(toMessagesFile(Object.assign(getEnglishMessages(), {
    popupHideProgressBar: "Fortschrittsbalken ausblenden",
  })));
  await firstChoice;
  await flushPromises();

  assert.equal(hasStoredLanguage(localItems), false);
  assert.equal(languageSelect.value, "en");
  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
});

test("popup restores the language list and shows an error when loading the language fails", async () => {
  const { languageSelect, localItems, status, findText } = await loadPopup(
    {},
    { fetch: () => Promise.resolve({ ok: false, status: 404 }) },
  );

  await chooseLanguage(languageSelect, "de");

  assert.equal(languageSelect.value, "en");
  assert.equal(status.textContent, "Could not change the language");
  assert.equal(hasStoredLanguage(localItems), false);
  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
});

test("popup restores the language list and shows an error when saving the language fails", async () => {
  const stored = createTestLanguage("de", { popupHideProgressBar: "TEST BAR" });
  const { languageSelect, localItems, status, findText } = await loadPopup(
    {},
    { storedLanguage: stored, failLanguageWrite: true },
  );

  // English is the browser language, so this is a removal, and it fails.
  await chooseLanguage(languageSelect, "en");

  assert.equal(languageSelect.value, "de");
  assert.equal(status.textContent, "Could not change the language");
  assert.deepEqual(localItems.uiLanguage, stored);
  // The shown language stays as it was.
  assert.equal(findText("popupHideProgressBar").textContent, "TEST BAR");
});

test("popup follows a language picked in another popup window", async () => {
  const { emitStorageChange, findText, powerStatus, languageSelect } = await loadPopup({});

  emitStorageChange(
    {
      uiLanguage: {
        newValue: createTestLanguage("de", {
          popupHideProgressBar: "TEST BAR",
          popupStatusOn: "TEST ON",
        }),
      },
    },
    "local",
  );

  assert.equal(findText("popupHideProgressBar").textContent, "TEST BAR");
  assert.equal(powerStatus.textContent, "TEST ON");
  assert.equal(languageSelect.value, "de");

  // Removed elsewhere: back to the browser language.
  emitStorageChange({ uiLanguage: { oldValue: {} } }, "local");

  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
  assert.equal(powerStatus.textContent, "Protection on");
  assert.equal(languageSelect.value, "en");
});

test("popup shows the settings and follows changes made elsewhere before the language is read", async () => {
  const stored = createTestLanguage("de", { popupStatusOn: "TEST ON" });
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
  assert.equal(languageSelect.value, "de");

  previewToggle.checked = true;
  await previewToggle.listeners.change();
  await flushPromises();

  assert.equal(storedSettings.hideVideoPreviews, true);
  assert.equal(storedSettings.hideVideoTitles, true);
});

test("popup does not write its own language choice over a removal made elsewhere while loading", async () => {
  const deferred = createDeferredFetch();
  const stored = createTestLanguage("de", { popupHideProgressBar: "TEST BAR" });
  const { languageSelect, localItems, emitStorageChange, findText } = await loadPopup(
    {},
    { storedLanguage: stored, fetch: deferred.fetch },
  );

  languageSelect.value = "pt_BR";
  const choice = languageSelect.listeners.change();

  // Another popup window switches back to the browser language.
  delete localItems.uiLanguage;
  emitStorageChange({ uiLanguage: { oldValue: stored } }, "local");

  deferred.pending.pt_BR(toMessagesFile(Object.assign(getEnglishMessages(), {
    popupHideProgressBar: "Ocultar barra",
  })));
  await choice;
  await flushPromises();

  assert.equal(hasStoredLanguage(localItems), false);
  assert.equal(languageSelect.value, "en");
  assert.equal(findText("popupHideProgressBar").textContent, "Hide progress bar");
});
