(function initI18n(root, factory) {
  const api = factory(root);

  root.YouTubeAntiSpoiler = Object.assign(root.YouTubeAntiSpoiler || {}, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createI18n(root) {
  // The languages the popup offers, in this order. `code` is the folder name
  // under _locales; `nativeName` is how speakers of the language call it.
  const SUPPORTED_LANGUAGES = Object.freeze([
    { code: "en", nativeName: "English" },
  ]);

  // Texts of the language picked in the popup, { key: text }. Null means
  // no language was picked and Chrome's own lookup (the browser language)
  // is used.
  let overrideMessages = null;

  function setMessages(messages) {
    overrideMessages = messages || null;
  }

  // A missing text shows its key, so it is easy to spot and never blank.
  function getText(key) {
    if (overrideMessages && overrideMessages[key]) {
      return overrideMessages[key];
    }

    return root.chrome.i18n.getMessage(key) || key;
  }

  // The key is kept on the element, so applyTranslations can switch the
  // text to another language later.
  function setText(element, key) {
    element.textContent = getText(key);
    element.dataset.yasI18n = key;
  }

  function setLabel(element, key) {
    const text = getText(key);

    element.setAttribute("aria-label", text);
    element.setAttribute("title", text);
    element.dataset.yasI18nLabel = key;
  }

  // Re-reads the texts of everything set through setText and setLabel.
  // Run after setMessages when the language changes.
  function applyTranslations(doc) {
    doc.querySelectorAll("[data-yas-i18n]").forEach((element) => {
      element.textContent = getText(element.dataset.yasI18n);
    });

    doc.querySelectorAll("[data-yas-i18n-label]").forEach((element) => {
      setLabel(element, element.dataset.yasI18nLabel);
    });
  }

  // Which of our languages Chrome shows for this UI language: the exact
  // locale, then the base language (pt-PT -> pt), then the default, English.
  function findShownLanguage(uiLanguage) {
    const locale = uiLanguage.replace("-", "_");
    const baseLanguage = locale.split("_")[0];
    const exactMatch = SUPPORTED_LANGUAGES.find((language) => language.code === locale);
    const baseMatch = SUPPORTED_LANGUAGES.find((language) => language.code === baseLanguage);

    if (exactMatch) {
      return exactMatch.code;
    }

    return baseMatch ? baseMatch.code : "en";
  }

  // The `lang` tag of the language actually shown: "auto" or a code from
  // SUPPORTED_LANGUAGES. Folder names use "_", language tags use "-".
  function getHtmlLang(languageCode) {
    const shownCode = languageCode === "auto"
      ? findShownLanguage(root.chrome.i18n.getUILanguage())
      : languageCode;

    return shownCode.replace("_", "-");
  }

  // Popup and service worker only: they may read packaged files, content
  // scripts may not. Returns { key: text }.
  async function fetchMessages(code) {
    const response = await root.fetch(
      root.chrome.runtime.getURL("_locales/" + code + "/messages.json"),
    );

    if (!response.ok) {
      throw new Error("Could not load the " + code + " texts: HTTP " + response.status);
    }

    const file = await response.json();
    const messages = {};

    Object.keys(file).forEach((key) => {
      messages[key] = file[key].message;
    });

    return messages;
  }

  return {
    SUPPORTED_LANGUAGES,
    setMessages,
    getText,
    setText,
    setLabel,
    applyTranslations,
    getHtmlLang,
    fetchMessages,
  };
});
