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
    removeAttribute(name) {
      delete this.attributes[name];
    },
    toggleAttribute(name, force) {
      if (force) {
        this.attributes[name] = "";
      } else {
        delete this.attributes[name];
      }
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
        element.attributes.hidden = "";
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
    storedTheme = undefined,
    failThemeWrite = false,
    fetch = fetchPackagedFile,
    uiLanguage = "en-US",
  } = {},
) {
  const storageChangeListeners = [];
  const localItems = {};
  if (storedLanguage) {
    localItems.uiLanguage = storedLanguage;
  }
  if (storedTheme) {
    localItems.uiTheme = storedTheme;
  }
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
    documentElement: Object.assign(createPopupElement("html"), { lang: "en" }),
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
            assert.ok(key === "uiLanguage" || key === "uiTheme", key);

            if (key === "uiTheme") {
              callback({ uiTheme: localItems.uiTheme });
              return;
            }

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
            if (failThemeWrite && "uiTheme" in items) {
              failWith("quota exceeded", callback);
              return;
            }

            if (failLanguageWrite && "uiLanguage" in items) {
              failWith("quota exceeded", callback);
              return;
            }

            Object.assign(localItems, items);
            callback();
          },
          remove(key, callback) {
            if (failThemeWrite && key === "uiTheme") {
              failWith("quota exceeded", callback);
              return;
            }

            if (failLanguageWrite && key === "uiLanguage") {
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
    languageCode: getElement("[data-language-code]"),
    themeButton: getElement("[data-theme-toggle]"),
    themeIcons: document.querySelectorAll("[data-theme-icon]"),
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

test("popup markup follows design B: the logo capsule with its chips, the main settings and Advanced settings", () => {
  assert.match(POPUP_HTML, /<html lang="en">/);
  assert.match(POPUP_HTML, /class="hero-top"[\s\S]*class="hero-band"[\s\S]*class="hero-bottom"/);
  assert.match(POPUP_HTML, /<input\s+type="checkbox"\s+role="switch"\s+data-power-toggle/);
  assert.match(POPUP_HTML, /data-yas-i18n="popupName">Anti-Spoiler</);
  // White on the logo red is large-text-only contrast: no small subtitle.
  assert.doesNotMatch(POPUP_HTML, /for YouTube<\/small>/);
  // The status line sits right under the capsule and its chips and is
  // empty until needed.
  assert.match(POPUP_HTML, /<\/button>\s*<\/div>\s*<\/div>\s*<p class="status" data-status aria-live="polite"><\/p>/);

  // The capsule and its chips, then the main card, then "Advanced settings"
  // with the rest, then the contact line.
  const order = [
    '<div class="hero-wrap">',
    '<label class="hero" data-hero>',
    '<div class="hero-tools">',
    "data-language-select",
    "data-theme-toggle",
    '<div class="card" data-settings-panel>',
    'data-setting="hidePlayerProgressBar"',
    'data-setting="hideVideoPreviews"',
    'data-setting="startLiveFromBeginning"',
    '<details class="card advanced" data-settings-panel>',
    '<summary class="advanced-summary">',
    'data-yas-i18n="popupAdvancedSettings"',
    'data-setting="hideVideoTitles"',
    'data-setting="hideComments"',
    '<footer class="contact">',
  ];
  const positions = order.map((needle) => POPUP_HTML.indexOf(needle));
  positions.forEach((position, index) => {
    assert.notEqual(position, -1, `${order[index]} is in the popup`);
  });
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.equal(POPUP_HTML.match(/data-setting="/g).length, 5);
  assert.equal(POPUP_HTML.match(/data-settings-panel/g).length, 2);

  // Closed by default. Advanced holds only settings now: the language row is
  // gone from it, the language lives in the capsule.
  assert.doesNotMatch(POPUP_HTML, /<details[^>]*\sopen/);
  assert.doesNotMatch(POPUP_HTML, /class="row language"/);
  assert.doesNotMatch(POPUP_HTML, /<div data-settings-panel>/);
  // The list has no "browser language" entry; the options come from the script.
  assert.match(
    POPUP_HTML,
    /<select data-language-select data-yas-i18n-label="popupLanguageLabel" aria-label="Language"><\/select>/,
  );

  // Gone: group headings, the skip buttons row and the shortcut hint.
  ["popupGroup", "showSkipButtons", "class=\"row nested\"", "data-shortcut", "<kbd", "popupLanguageBrowser"].forEach((text) => {
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

test("the whole capsule is the label of the master switch, with the play triangle as decoration", () => {
  const hero = POPUP_HTML.match(/<label class="hero" data-hero>([\s\S]*?)\r?\n        <\/label>/);

  assert.ok(hero, "the capsule is a label");
  // The master switch is inside, so a click anywhere toggles it natively,
  // and it is the only control there: a label labels its first control.
  assert.match(hero[1], /<input\s+type="checkbox"\s+role="switch"\s+data-power-toggle/);
  assert.equal(hero[1].match(/<input/g).length, 1);
  // It keeps its own name: aria-label wins over the text of the label.
  assert.match(hero[1], /data-power-toggle\s+data-yas-i18n-label="popupMasterSwitchLabel"\s+aria-label="Spoiler protection"/);
  // No nested label and no block elements, which a label may not hold.
  assert.doesNotMatch(hero[1], /<(label|div|p|section)[\s>]/);

  // The triangle sits in the centre, not before the name, and is hidden
  // from screen readers.
  assert.match(hero[1], /class="hero-top">\s*<span class="hero-name"[^>]*>Anti-Spoiler<\/span>\s*<svg class="hero-play"[^>]*aria-hidden="true"/);
  assert.match(POPUP_CSS, /\.hero-play\s*\{[^}]*position:\s*absolute;[^}]*left:\s*50%;/);
  assert.match(POPUP_CSS, /\.hero-band\s*\{[^}]*position:\s*relative;/);

  // No click handler of its own: one would toggle a second time. The only
  // listener on the capsule follows the pointer for the hover circle, and
  // the only click listener is the theme button's, outside the capsule.
  assert.equal(POPUP_JS.match(/addEventListener\("click"/g).length, 1);
  assert.match(POPUP_JS, /themeButton\.addEventListener\("click", changeTheme\)/);
  assert.match(POPUP_JS, /hero\.addEventListener\("pointermove"/);
  assert.equal(POPUP_JS.match(/hero\.addEventListener\(/g).length, 1);
});

test("the capsule shows a pointer, a red hover circle while off, and nothing while read-only", () => {
  assert.match(POPUP_CSS, /\.hero\s*\{[^}]*position:\s*relative;[^}]*cursor:\s*pointer;/);
  assert.match(POPUP_CSS, /\.hero:has\(\[data-power-toggle\]:disabled\)\s*\{\s*cursor:\s*default;/);
  assert.match(
    POPUP_CSS,
    /\.hero::before\s*\{[^}]*background:\s*radial-gradient\(circle 80px at var\(--x\) var\(--y\), #ef6a6a, var\(--accent\) 45%\);[^}]*mask-image:\s*radial-gradient\(circle 80px at var\(--x\) var\(--y\), #000 35%, transparent\);[^}]*opacity:\s*0;[^}]*transition:\s*opacity 0\.15s;[^}]*pointer-events:\s*none;/,
  );
  // Only while off and not read-only.
  assert.match(POPUP_CSS, /\.hero:hover:has\(\[data-power-toggle\]:enabled:not\(:checked\)\)::before\s*\{\s*opacity:\s*1;/);
  assert.match(POPUP_CSS, /\.hero:hover:has\(\[data-power-toggle\]:enabled:checked\) \.hero-band\s*\{\s*background:\s*#2a2a2a;/);
  assert.match(POPUP_CSS, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.hero::before,\s*\.hero-band\s*\{\s*transition:\s*none;/);
});

test("popup sets the pointer position on the capsule, relative to it, in px", async () => {
  const popup = await loadPopup({ extensionEnabled: false });
  const hero = popup.document.querySelector("[data-hero]");
  const properties = {};

  hero.getBoundingClientRect = () => ({ left: 12, top: 12 });
  hero.style = {
    setProperty(name, value) {
      properties[name] = value;
    },
  };
  hero.listeners.pointermove({ clientX: 100, clientY: 40 });

  assert.deepEqual(properties, { "--x": "88px", "--y": "28px" });
});

test("popup does not follow the pointer while read-only", async () => {
  const popup = await loadPopup({}, { failRead: true });
  const hero = popup.document.querySelector("[data-hero]");

  assert.equal(hero.listeners.pointermove, undefined);
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
  assert.doesNotMatch(POPUP_CSS, /\.language select/);
  assert.match(POPUP_CSS, /:lang\(ja\), :lang\(ko\), :lang\(zh\)\)\s*\{\s*line-height:\s*1\.5;/);

  // "Advanced settings": a full-width row, 14 px 600, with a chevron that
  // turns when open and a focus ring drawn inside the card.
  assert.match(POPUP_CSS, /\.advanced-summary\s*\{[^}]*min-height:\s*44px;[^}]*font-size:\s*14px;[^}]*font-weight:\s*600;[^}]*list-style:\s*none;/);
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

test("popup hides the settings and Advanced but keeps the language and theme while protection is off", async () => {
  const { powerToggle, powerStatus, powerNote, settingsPanels, languageSelect, themeButton } = await loadPopup({
    extensionEnabled: false,
  });

  assert.equal(powerStatus.textContent, "Protection off");
  assert.equal(powerNote.textContent, "YouTube is shown normally");
  assert.deepEqual(settingsPanels.map((panel) => panel.tagName), ["DIV", "DETAILS"]);
  settingsPanels.forEach((panel) => {
    assert.equal(panel.hidden, true);
  });
  // The chips sit in the capsule, outside every panel (see the markup tests).
  assert.equal(languageSelect.disabled, false);
  assert.equal(languageSelect.hidden, false);
  assert.equal(themeButton.disabled, false);

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
  const { powerToggle, settingToggles, status, languageSelect, themeButton } = await loadPopup(
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
  assert.equal(themeButton.disabled, true);
  assert.equal(themeButton.listeners.click, undefined);
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

  assert.equal(languageSelect.attributes["aria-label"], "Language");
  assert.equal(languageSelect.attributes.title, "Language");
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

// --- Chips in the capsule: language and theme ---

test("the language chip and the theme button sit in the capsule, outside its label", () => {
  const tools = POPUP_HTML.match(/<\/label>\s*<!--[\s\S]*?-->\s*<div class="hero-tools">([\s\S]*?)\r?\n        <\/div>\r?\n      <\/div>/);

  assert.ok(tools, "the chips follow the capsule label inside .hero-wrap");
  // The language chip: globe, two-letter code, chevron, and the real list
  // laid over it.
  assert.match(
    tools[1],
    /<span class="chip chip-language">\s*<svg[^>]*aria-hidden="true"[\s\S]*?<span data-language-code>EN<\/span>\s*<svg class="chev"[^>]*aria-hidden="true"[\s\S]*?<select data-language-select/,
  );
  // The theme button: a real button, so a click never submits or toggles
  // anything else, with one icon per mode and only Auto shown at first.
  assert.match(tools[1], /<button type="button" class="chip chip-icon" data-theme-toggle data-yas-i18n-label="popupThemeAuto" aria-label="Theme: automatic">/);
  const icons = [...tools[1].matchAll(/<svg data-theme-icon="([a-z]+)"( hidden)?[^>]*aria-hidden="true"/g)];
  assert.deepEqual(icons.map(([, mode, hidden]) => [mode, Boolean(hidden)]), [
    ["auto", false],
    ["light", true],
    ["dark", true],
  ]);
  assert.match(tools[1], /d="M21 12\.8A9 9 0 1 1 11\.2 3a7 7 0 0 0 9\.8 9\.8z"/);

  // Neither control is inside the label of the master switch.
  const hero = POPUP_HTML.match(/<label class="hero" data-hero>([\s\S]*?)<\/label>/)[1];
  assert.doesNotMatch(hero, /data-language-select|data-theme-toggle|hero-tools/);
});

test("the labels written in the popup HTML match the English messages", () => {
  const labels = [...POPUP_HTML.matchAll(/data-yas-i18n-label="([A-Za-z0-9]+)"\s+aria-label="([^"]+)"/g)];

  assert.equal(labels.length, 4);
  labels.forEach(([, key, text]) => {
    assert.equal(text, en(key), key);
  });
});

test("popup CSS draws the chips over the capsule, with focus and read-only states", () => {
  assert.match(POPUP_CSS, /\.hero-wrap\s*\{\s*position:\s*relative;/);
  assert.match(POPUP_CSS, /\.hero-tools\s*\{[^}]*position:\s*absolute;[^}]*top:\s*16px;[^}]*right:\s*12px;[^}]*display:\s*flex;[^}]*gap:\s*6px;/);
  assert.match(
    POPUP_CSS,
    /\.chip\s*\{[^}]*height:\s*28px;[^}]*border:\s*1px solid rgba\(255, 255, 255, 0\.28\);[^}]*border-radius:\s*14px;[^}]*background:\s*rgba\(34, 34, 34, 0\.78\);[^}]*color:\s*#ffffff;[^}]*font-size:\s*12\.5px;[^}]*font-weight:\s*700;/,
  );
  assert.match(POPUP_CSS, /\.chip:hover\s*\{\s*background:\s*rgba\(34, 34, 34, 0\.92\);/);
  assert.match(POPUP_CSS, /\.chip-icon\s*\{[^}]*width:\s*28px;[^}]*padding:\s*0;/);
  assert.match(POPUP_CSS, /\.chip-language\s*\{\s*position:\s*relative;/);
  assert.match(
    POPUP_CSS,
    /\.chip-language select\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*margin:\s*0;[^}]*opacity:\s*0;[^}]*cursor:\s*pointer;/,
  );
  assert.match(
    POPUP_CSS,
    /\.chip-language:has\(select:focus-visible\),\s*\.chip-icon:focus-visible\s*\{[^}]*outline:\s*2px solid #ffffff;[^}]*outline-offset:\s*2px;/,
  );
  assert.match(POPUP_CSS, /\.chip:has\(:disabled\),\s*\.chip:disabled\s*\{[^}]*opacity:\s*0\.45;[^}]*cursor:\s*default;/);
});

test("popup CSS has the dark theme for Auto in a dark system and for the chosen dark theme", () => {
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
  const mediaBlock = POPUP_CSS.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/);
  const chosenBlock = POPUP_CSS.match(/:root\[data-theme="dark"\]\s*\{([^}]*--bg[^}]*)\}/);

  assert.ok(mediaBlock, "the system dark theme skips a chosen light theme");
  assert.ok(chosenBlock, "the chosen dark theme has its own block");
  Object.entries(darkTokens).forEach(([name, value]) => {
    assert.match(mediaBlock[1], new RegExp(`${name}:\\s*${value};`), `media ${name}`);
    assert.match(chosenBlock[1], new RegExp(`${name}:\\s*${value};`), `chosen ${name}`);
  });
  // The native list and the scrollbars follow the chosen theme.
  assert.match(POPUP_CSS, /:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;/);
  assert.match(POPUP_CSS, /:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;/);
});

function getShownThemeIcons(themeIcons) {
  return themeIcons
    .filter((icon) => !Object.prototype.hasOwnProperty.call(icon.attributes, "hidden"))
    .map((icon) => icon.dataset.themeIcon);
}

function hasStoredTheme(localItems) {
  return Object.prototype.hasOwnProperty.call(localItems, "uiTheme");
}

test("popup follows the system theme when no theme is stored", async () => {
  const { document, themeButton, themeIcons } = await loadPopup({});

  assert.equal(document.documentElement.attributes["data-theme"], undefined);
  assert.deepEqual(getShownThemeIcons(themeIcons), ["auto"]);
  assert.equal(themeButton.attributes["aria-label"], "Theme: automatic");
  assert.equal(themeButton.attributes.title, "Theme: automatic");
});

test("popup shows the stored dark theme at startup", async () => {
  const { document, themeButton, themeIcons } = await loadPopup({}, { storedTheme: "dark" });

  assert.equal(document.documentElement.attributes["data-theme"], "dark");
  assert.deepEqual(getShownThemeIcons(themeIcons), ["dark"]);
  assert.equal(themeButton.attributes["aria-label"], "Theme: dark");
});

test("popup theme button cycles auto, light, dark, auto and stores each choice", async () => {
  const { document, themeButton, themeIcons, localItems } = await loadPopup({});

  await themeButton.listeners.click();
  assert.equal(localItems.uiTheme, "light");
  assert.equal(document.documentElement.attributes["data-theme"], "light");
  assert.deepEqual(getShownThemeIcons(themeIcons), ["light"]);
  assert.equal(themeButton.attributes["aria-label"], "Theme: light");

  await themeButton.listeners.click();
  assert.equal(localItems.uiTheme, "dark");
  assert.equal(document.documentElement.attributes["data-theme"], "dark");
  assert.deepEqual(getShownThemeIcons(themeIcons), ["dark"]);

  // Back to Auto: the stored choice is removed.
  await themeButton.listeners.click();
  assert.equal(hasStoredTheme(localItems), false);
  assert.equal(document.documentElement.attributes["data-theme"], undefined);
  assert.deepEqual(getShownThemeIcons(themeIcons), ["auto"]);
  assert.equal(themeButton.attributes["aria-label"], "Theme: automatic");
});

test("popup shows the previous theme and an error when saving the theme fails", async () => {
  const { document, themeButton, themeIcons, localItems, status } = await loadPopup(
    {},
    { storedTheme: "light", failThemeWrite: true },
  );

  await themeButton.listeners.click();

  assert.equal(localItems.uiTheme, "light");
  assert.equal(document.documentElement.attributes["data-theme"], "light");
  assert.deepEqual(getShownThemeIcons(themeIcons), ["light"]);
  assert.equal(themeButton.attributes["aria-label"], "Theme: light");
  assert.equal(status.textContent, "Could not save the theme");
});

test("popup follows a theme picked in another popup window", async () => {
  const { document, themeIcons, emitStorageChange } = await loadPopup({});

  emitStorageChange({ uiTheme: { newValue: "dark" } }, "local");
  assert.equal(document.documentElement.attributes["data-theme"], "dark");
  assert.deepEqual(getShownThemeIcons(themeIcons), ["dark"]);

  // Removed elsewhere: back to Auto.
  emitStorageChange({ uiTheme: { oldValue: "dark" } }, "local");
  assert.equal(document.documentElement.attributes["data-theme"], undefined);
  assert.deepEqual(getShownThemeIcons(themeIcons), ["auto"]);
});

test("popup re-translates the theme button label after a language change", async () => {
  const { themeButton, emitStorageChange } = await loadPopup({}, { storedTheme: "dark" });

  emitStorageChange(
    { uiLanguage: { newValue: createTestLanguage("de", { popupThemeDark: "TEST DARK" }) } },
    "local",
  );

  assert.equal(themeButton.attributes["aria-label"], "TEST DARK");
  assert.equal(themeButton.attributes.title, "TEST DARK");
});

test("popup language chip shows the listed language as two capitals", async () => {
  const english = await loadPopup({});
  assert.equal(english.languageCode.textContent, "EN");

  const brazilian = await loadPopup({}, { uiLanguage: "pt-BR" });
  assert.equal(brazilian.languageSelect.value, "pt_BR");
  assert.equal(brazilian.languageCode.textContent, "PT");

  // A chosen language updates the chip too.
  await chooseLanguage(english.languageSelect, "de");
  assert.equal(english.languageCode.textContent, "DE");
});

// --- Contact line ---

test("popup ends with a contact line outside the capsule and every settings panel", () => {
  const footer = POPUP_HTML.match(/<footer class="contact">([\s\S]*?)<\/footer>\s*<\/main>/);

  assert.ok(footer, "the contact line is the last part of the popup");
  assert.match(
    footer[1],
    /<span data-yas-i18n="popupContactLabel">Questions or ideas\?<\/span>\s*<a href="mailto:vtshka8@gmail\.com">vtshka8@gmail\.com<\/a>/,
  );
  // After the Advanced card has closed, so it shows with protection off and
  // in read-only mode.
  assert.match(POPUP_HTML, /<\/details>\s*<!--[\s\S]*?-->\s*<footer class="contact">/);
  assert.equal(en("popupContactLabel"), "Questions or ideas?");

  assert.match(POPUP_CSS, /\.contact::before\s*\{[^}]*left:\s*24px;[^}]*right:\s*24px;[^}]*border-top:\s*1px solid var\(--line\);/);
  assert.match(POPUP_CSS, /\.contact\s*\{[^}]*margin-top:\s*14px;[^}]*padding-top:\s*10px;[^}]*color:\s*color-mix\(in srgb, var\(--muted\) 85%, var\(--bg\)\);[^}]*font-size:\s*9px;[^}]*text-align:\s*center;[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(POPUP_CSS, /\.contact span\s*\{[^}]*font-size:\s*8px;/);
  assert.match(POPUP_CSS, /\.contact a\s*\{[^}]*color:\s*inherit;[^}]*text-decoration:\s*underline;/);
  assert.match(POPUP_CSS, /\.contact a:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--focus\);/);
  // No script for the link.
  assert.doesNotMatch(POPUP_JS, /mailto|contact/i);
});

test("every locale has the theme and contact texts", () => {
  const keys = ["popupThemeAuto", "popupThemeLight", "popupThemeDark", "popupThemeError", "popupContactLabel"];

  fs.readdirSync(path.join(rootPath, "_locales")).forEach((code) => {
    const file = JSON.parse(
      fs.readFileSync(path.join(rootPath, "_locales", code, "messages.json"), "utf8"),
    );

    keys.forEach((key) => {
      assert.ok(file[key] && file[key].message.trim(), `${code} ${key}`);
      assert.ok(file[key].description, `${code} ${key} description`);
    });
  });
});

test("the live-stream setting carries an English Beta badge in the logo red", () => {
  assert.match(
    POPUP_HTML,
    /<span class="row-title"><span data-yas-i18n="popupProtectLive">Protect live streams<\/span> <span class="badge" data-yas-i18n-label="popupBetaNote" aria-label="Still being tested: it may not always work as expected" title="Still being tested: it may not always work as expected">Beta<\/span><\/span>/,
  );
  assert.match(POPUP_CSS, /\.badge\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--accent\) 16%, var\(--surface\)\);[^}]*color:\s*color-mix\(in srgb, var\(--accent\) 75%, var\(--text\)\);/);
});

// The badge text itself is checked in the markup test above: the test
// document does not read element text from the HTML.
test("the Beta badge's hover tooltip is translated", async () => {
  const { elements, emitStorageChange } = await loadPopup({});
  const badge = elements.find((element) => element.dataset.yasI18nLabel === "popupBetaNote");

  assert.equal(badge.attributes.title, "Still being tested: it may not always work as expected");

  emitStorageChange(
    { uiLanguage: { newValue: createTestLanguage("de", { popupBetaNote: "TEST BETA" }) } },
    "local",
  );

  assert.equal(badge.attributes.title, "TEST BETA");
  assert.equal(badge.attributes["aria-label"], "TEST BETA");
});
