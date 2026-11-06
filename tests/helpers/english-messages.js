// The English texts from _locales/en/messages.json, and a chrome.i18n that
// answers from them the way Chrome does in an English browser.
const fs = require("node:fs");
const path = require("node:path");

const EN_MESSAGES_FILE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "_locales", "en", "messages.json"), "utf8"),
);

// The English text of a key, or "" like chrome.i18n.getMessage for an
// unknown key.
function en(key) {
  return EN_MESSAGES_FILE[key] ? EN_MESSAGES_FILE[key].message : "";
}

// { key: text } for every English key, the shape the popup stores.
function getEnglishMessages() {
  const messages = {};

  Object.keys(EN_MESSAGES_FILE).forEach((key) => {
    messages[key] = EN_MESSAGES_FILE[key].message;
  });

  return messages;
}

function createChromeI18n(uiLanguage = "en-US") {
  return {
    getMessage: en,
    getUILanguage: () => uiLanguage,
  };
}

// Content scripts run as plain Node modules in the tests; their
// chrome.i18n is the global one.
function installEnglishI18n() {
  globalThis.chrome = Object.assign(globalThis.chrome || {}, { i18n: createChromeI18n() });
}

module.exports = {
  EN_MESSAGES_FILE,
  en,
  getEnglishMessages,
  createChromeI18n,
  installEnglishI18n,
};
