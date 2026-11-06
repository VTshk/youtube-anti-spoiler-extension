const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { EN_MESSAGES_FILE } = require("./helpers/english-messages.js");

const rootPath = path.join(__dirname, "..");
const I18N_SOURCE = fs.readFileSync(path.join(rootPath, "src", "shared", "i18n.js"), "utf8");

// A fresh i18n.js with its own chrome.i18n, as in an extension page.
function loadI18n({ messages = {}, uiLanguage = "en-US" } = {}) {
  const context = {
    chrome: {
      i18n: {
        getMessage: (key) => messages[key] || "",
        getUILanguage: () => uiLanguage,
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(I18N_SOURCE, context);
  return context.YouTubeAntiSpoiler;
}

function createElement() {
  return {
    attributes: {},
    dataset: {},
    textContent: "",
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function createDocument(elements) {
  return {
    querySelectorAll(selector) {
      const datasetName = { "[data-yas-i18n]": "yasI18n", "[data-yas-i18n-label]": "yasI18nLabel" }[selector];
      assert.ok(datasetName, `unexpected selector ${selector}`);
      return elements.filter((element) => element.dataset[datasetName]);
    },
  };
}

function readLocaleFiles() {
  const localesPath = path.join(rootPath, "_locales");

  return fs.readdirSync(localesPath).map((code) => ({
    code,
    messages: JSON.parse(fs.readFileSync(path.join(localesPath, code, "messages.json"), "utf8")),
  }));
}

function listSourceFiles() {
  return [
    "popup/popup.html",
    "popup/popup.js",
    "src/shared/i18n.js",
    "src/content/content.js",
    "src/content/live-start-controller.js",
    "src/content/skip-buttons.js",
    "src/background/background.js",
  ];
}

// Message keys are quoted strings with one of the agreed prefixes.
const KEY_PATTERN = /"((?:popup|liveGuard|comments|skip|manifest|media)[A-Z][A-Za-z0-9]*)"/g;

test("every locale has exactly the English keys, with texts and no placeholders", () => {
  const englishKeys = Object.keys(EN_MESSAGES_FILE).sort();
  const locales = readLocaleFiles();

  assert.ok(locales.some((locale) => locale.code === "en"));
  locales.forEach(({ code, messages }) => {
    assert.deepEqual(Object.keys(messages).sort(), englishKeys, code);

    Object.entries(messages).forEach(([key, entry]) => {
      assert.equal(typeof entry.message, "string", `${code} ${key}`);
      assert.notEqual(entry.message.trim(), "", `${code} ${key}`);
      assert.doesNotMatch(entry.message, /\$/, `${code} ${key} has a placeholder`);
      assert.equal(entry.placeholders, undefined, `${code} ${key}`);
    });
  });
});

test("every language offered in the popup has a locale folder", () => {
  const i18n = loadI18n();
  const codes = readLocaleFiles().map((locale) => locale.code);

  assert.equal(i18n.SUPPORTED_LANGUAGES[0].code, "en");
  i18n.SUPPORTED_LANGUAGES.forEach((language) => {
    assert.ok(codes.includes(language.code), language.code);
    assert.notEqual(language.nativeName, "");
  });
});

test("manifest texts come from the English messages", () => {
  const manifestText = fs.readFileSync(path.join(rootPath, "manifest.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  const keys = [...manifestText.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map((match) => match[1]);

  assert.equal(manifest.default_locale, "en");
  assert.deepEqual(keys.sort(), [
    "manifestDescription",
    "manifestName",
    "manifestName",
    "manifestToggleCommand",
  ]);
  keys.forEach((key) => assert.ok(EN_MESSAGES_FILE[key], key));
  assert.ok(EN_MESSAGES_FILE.manifestDescription.message.length <= 132);
});

// The Web Store limits: a name of 75 characters, a description of 132.
test("every locale keeps the store name and description within the store limits", () => {
  readLocaleFiles().forEach(({ code, messages }) => {
    assert.ok(messages.manifestName.message.length <= 75, code);
    assert.ok(messages.manifestDescription.message.length <= 132, code);
  });
});

test("every message key used in the code exists, and every English key is used", () => {
  const usedKeys = new Set();

  listSourceFiles().forEach((relativePath) => {
    const source = fs.readFileSync(path.join(rootPath, relativePath), "utf8");

    for (const match of source.matchAll(KEY_PATTERN)) {
      assert.ok(EN_MESSAGES_FILE[match[1]], `${relativePath} uses a missing key ${match[1]}`);
      usedKeys.add(match[1]);
    }
  });

  const manifestText = fs.readFileSync(path.join(rootPath, "manifest.json"), "utf8");

  for (const match of manifestText.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) {
    usedKeys.add(match[1]);
  }

  Object.keys(EN_MESSAGES_FILE).forEach((key) => {
    assert.ok(usedKeys.has(key), `${key} is not used anywhere`);
  });
});

test("getText prefers the chosen language, then Chrome's lookup, then shows the key", () => {
  const i18n = loadI18n({ messages: { popupName: "Anti-Spoiler", popupProtectLive: "Protect live streams" } });

  assert.equal(i18n.getText("popupProtectLive"), "Protect live streams");
  assert.equal(i18n.getText("popupMissingKey"), "popupMissingKey");

  i18n.setMessages({ popupProtectLive: "Защищать трансляции" });

  assert.equal(i18n.getText("popupProtectLive"), "Защищать трансляции");
  // A key the chosen language lacks falls back to Chrome's text.
  assert.equal(i18n.getText("popupName"), "Anti-Spoiler");

  i18n.setMessages(null);

  assert.equal(i18n.getText("popupProtectLive"), "Protect live streams");
});

test("getHtmlLang turns a folder name into a language tag", () => {
  assert.equal(loadI18n().getHtmlLang("pt_BR"), "pt-BR");
  assert.equal(loadI18n().getHtmlLang("en"), "en");
});

test("getHtmlLang for the browser language names the language Chrome shows", () => {
  assert.equal(loadI18n({ uiLanguage: "en-US" }).getHtmlLang("auto"), "en");
  assert.equal(loadI18n({ uiLanguage: "en" }).getHtmlLang("auto"), "en");
  assert.equal(loadI18n({ uiLanguage: "ru" }).getHtmlLang("auto"), "ru");
  assert.equal(loadI18n({ uiLanguage: "pt-BR" }).getHtmlLang("auto"), "pt-BR");
  // The base language when the exact locale is missing, as Chrome does.
  assert.equal(loadI18n({ uiLanguage: "es-419" }).getHtmlLang("auto"), "es");
  assert.equal(loadI18n({ uiLanguage: "de-AT" }).getHtmlLang("auto"), "de");
  // Chrome does not fall back from pt-PT to pt_BR, so English is shown.
  assert.equal(loadI18n({ uiLanguage: "pt-PT" }).getHtmlLang("auto"), "en");
  assert.equal(loadI18n({ uiLanguage: "zh-CN" }).getHtmlLang("auto"), "en");
});

test("getBrowserLanguage names the folder of the language Chrome shows", () => {
  assert.equal(loadI18n({ uiLanguage: "de-DE" }).getBrowserLanguage(), "de");
  assert.equal(loadI18n({ uiLanguage: "pt-BR" }).getBrowserLanguage(), "pt_BR");
  assert.equal(loadI18n({ uiLanguage: "en-GB" }).getBrowserLanguage(), "en");
  assert.equal(loadI18n({ uiLanguage: "zh-CN" }).getBrowserLanguage(), "en");
});

test("setText and setLabel keep the key, and applyTranslations re-reads it", () => {
  const i18n = loadI18n({ messages: { commentsShowButton: "Show comments", skipBack1Minute: "Back 1 minute" } });
  const button = createElement();
  const skipButton = createElement();
  const plainElement = createElement();

  i18n.setText(button, "commentsShowButton");
  i18n.setLabel(skipButton, "skipBack1Minute");
  plainElement.textContent = "−1m";

  assert.equal(button.textContent, "Show comments");
  assert.equal(button.dataset.yasI18n, "commentsShowButton");
  assert.equal(skipButton.attributes["aria-label"], "Back 1 minute");
  assert.equal(skipButton.attributes.title, "Back 1 minute");
  assert.equal(skipButton.dataset.yasI18nLabel, "skipBack1Minute");

  i18n.setMessages({ commentsShowButton: "Показать комментарии", skipBack1Minute: "Назад на 1 минуту" });
  i18n.applyTranslations(createDocument([button, skipButton, plainElement]));

  assert.equal(button.textContent, "Показать комментарии");
  assert.equal(skipButton.attributes["aria-label"], "Назад на 1 минуту");
  assert.equal(skipButton.attributes.title, "Назад на 1 минуту");
  assert.equal(plainElement.textContent, "−1m");
});

test("fetchMessages reads a packaged locale file into { key: text }", async () => {
  const requested = [];
  // fetch lives on the same global as chrome, as in the popup.
  const sandbox = {
    chrome: {
      i18n: { getMessage: () => "", getUILanguage: () => "en" },
      runtime: { getURL: (relativePath) => `chrome-extension://id/${relativePath}` },
    },
    fetch(url) {
      requested.push(url);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(EN_MESSAGES_FILE) });
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(I18N_SOURCE, sandbox);

  const messages = await sandbox.YouTubeAntiSpoiler.fetchMessages("en");

  assert.deepEqual(requested, ["chrome-extension://id/_locales/en/messages.json"]);
  assert.equal(messages.popupName, "Anti-Spoiler");
  assert.equal(messages.liveGuardTitle, "Spoiler protection is active");

  sandbox.fetch = () => Promise.resolve({ ok: false, status: 404 });
  await assert.rejects(sandbox.YouTubeAntiSpoiler.fetchMessages("xx"), /HTTP 404/);
});
