(function initPopup(root) {
  const namespace = root.YouTubeAntiSpoiler;

  if (!namespace) {
    return;
  }

  let currentSettings = namespace.DEFAULT_SETTINGS;

  function getToggleElements() {
    return Array.from(root.document.querySelectorAll("[data-setting]"));
  }

  function getPowerToggle() {
    return root.document.querySelector("[data-power-toggle]");
  }

  function getHero() {
    return root.document.querySelector("[data-hero]");
  }

  function getPowerStatus() {
    return root.document.querySelector("[data-power-status]");
  }

  function getPowerNote() {
    return root.document.querySelector("[data-power-note]");
  }

  // The main card and the "Advanced settings" card: both hide while
  // protection is off.
  function getSettingsPanels() {
    return Array.from(root.document.querySelectorAll("[data-settings-panel]"));
  }

  function getLanguageSelect() {
    return root.document.querySelector("[data-language-select]");
  }

  function getThemeButton() {
    return root.document.querySelector("[data-theme-toggle]");
  }

  function getRevealButton() {
    return root.document.querySelector("[data-reveal-toggle]");
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

  // Shows the message with this key under the capsule; no key clears it.
  function setStatus(messageKey) {
    const status = root.document.querySelector("[data-status]");

    if (!status) {
      return;
    }

    if (messageKey) {
      namespace.setText(status, messageKey);
      return;
    }

    // Empty, so CSS hides the line, and without a key, so a language change
    // does not bring an old message back.
    status.textContent = "";
    delete status.dataset.yasI18n;
  }

  async function setActionIcon(settings) {
    if (!root.chrome || !root.chrome.action || !root.chrome.action.setIcon) {
      return;
    }

    try {
      await root.chrome.action.setIcon({
        path: settings.extensionEnabled ? getEnabledIconPaths() : getDisabledIconPaths(),
      });
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not update toolbar icon.", error);
    }
  }

  function renderSettings(settings, toggles) {
    toggles.forEach((toggle) => {
      toggle.checked = Boolean(settings[toggle.dataset.setting]);
    });
  }

  function renderPower(settings, powerToggle, powerStatus, powerNote, settingsPanels) {
    const enabled = Boolean(settings.extensionEnabled);

    if (powerToggle) {
      powerToggle.checked = enabled;
    }

    if (powerStatus) {
      namespace.setText(powerStatus, enabled ? "popupStatusOn" : "popupStatusOff");
    }

    if (powerNote) {
      namespace.setText(powerNote, enabled ? "popupNoteOn" : "popupNoteOff");
    }

    settingsPanels.forEach((panel) => {
      panel.hidden = !enabled;
    });
  }

  // "Show spoilers for this video" works in the active tab: its content
  // script answers { available, revealed }. Answers null when there is no
  // one to ask (no tab, not YouTube, a tab opened before the extension was
  // installed); the button then stays hidden.
  async function askActiveTab(message) {
    try {
      const [tab] = await root.chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        return null;
      }

      return (await root.chrome.tabs.sendMessage(tab.id, message)) || null;
    } catch (error) {
      return null;
    }
  }

  function renderReveal(revealButton, revealState) {
    const shown = Boolean(
      revealState && revealState.available && currentSettings.extensionEnabled,
    );

    revealButton.hidden = !shown;

    if (shown) {
      namespace.setText(revealButton, revealState.revealed ? "popupHideVideo" : "popupRevealVideo");
    }
  }

  async function refreshReveal(revealButton) {
    renderReveal(revealButton, await askActiveTab({ type: "yas-get-reveal" }));
  }

  function bindReveal(revealButton) {
    revealButton.addEventListener("click", async () => {
      renderReveal(revealButton, await askActiveTab({ type: "yas-toggle-reveal" }));
    });
  }

  // Saves run one after another: each one applies its changes on top of
  // what the previous one stored, so two quick clicks cannot undo each other.
  let saveQueue = Promise.resolve(true);

  function saveSettings(changes) {
    saveQueue = saveQueue.then(() => writeChanges(changes));
    return saveQueue;
  }

  // Applies the changed keys on top of the last confirmed settings.
  // currentSettings changes only after a successful write, so after a failure
  // the UI is re-rendered from what is really stored.
  async function writeChanges(changes) {
    const nextSettings = namespace.normalizeSettings(
      Object.assign({}, currentSettings, changes),
    );

    try {
      currentSettings = await namespace.writeSettings(nextSettings);
      setStatus("");
      await setActionIcon(currentSettings);
      return true;
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not save settings.", error);
      setStatus("popupSaveError");
      return false;
    }
  }

  function bindToggleSaving(toggles) {
    toggles.forEach((toggle) => {
      toggle.addEventListener("change", async () => {
        await saveSettings({ [toggle.dataset.setting]: toggle.checked });
        renderSettings(currentSettings, toggles);
      });
    });
  }

  function bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanels, revealButton) {
    if (!powerToggle) {
      return;
    }

    powerToggle.addEventListener("change", async () => {
      await saveSettings({ extensionEnabled: powerToggle.checked });
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanels);
      refreshReveal(revealButton);
    });
  }

  // The capsule is the label of the master switch, so clicks toggle it
  // without any code here. This only tells CSS where the pointer is, for the
  // red circle drawn over the gray capsule while protection is off.
  function bindHeroPointer(hero) {
    if (!hero) {
      return;
    }

    hero.addEventListener("pointermove", (event) => {
      const box = hero.getBoundingClientRect();
      hero.style.setProperty("--x", `${event.clientX - box.left}px`);
      hero.style.setProperty("--y", `${event.clientY - box.top}px`);
    });
  }

  // Another popup or Chrome sync may change settings while this popup is
  // open; keep the form current so the next save does not undo that change.
  function bindExternalChanges(toggles, powerToggle, powerStatus, powerNote, settingsPanels, revealButton) {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.onChanged) {
      return;
    }

    root.chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }

      const changedValues = {};
      namespace.SETTING_KEYS.forEach((key) => {
        if (changes[key]) {
          changedValues[key] = changes[key].newValue;
        }
      });

      if (Object.keys(changedValues).length === 0) {
        return;
      }

      currentSettings = namespace.normalizeSettings(
        Object.assign({}, currentSettings, changedValues),
      );
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanels);

      if (changes.extensionEnabled) {
        refreshReveal(revealButton);
      }
    });
  }

  function disableControls(toggles, powerToggle, languageSelect, themeButton) {
    toggles.forEach((toggle) => {
      toggle.disabled = true;
    });

    if (powerToggle) {
      powerToggle.disabled = true;
    }

    languageSelect.disabled = true;
    themeButton.disabled = true;
  }

  // The theme is kept in storage.local under `uiTheme`: "light" or "dark".
  // No key ("auto") follows the system theme. Only the popup reads and
  // writes it.
  // Each click moves to the next mode.
  const NEXT_THEME = { auto: "light", light: "dark", dark: "auto" };
  const THEME_LABELS = {
    auto: "popupThemeAuto",
    light: "popupThemeLight",
    dark: "popupThemeDark",
  };
  let shownTheme = "auto";

  function readStoredTheme() {
    return new Promise((resolve) => {
      root.chrome.storage.local.get("uiTheme", (items) => {
        const error = root.chrome.runtime.lastError;

        if (error) {
          console.error("[Anti-Spoiler for YouTube] Could not read the theme.", error.message);
          resolve("auto");
          return;
        }

        resolve(items.uiTheme || "auto");
      });
    });
  }

  // "auto" removes the choice: back to the system theme.
  function writeStoredTheme(theme) {
    return new Promise((resolve, reject) => {
      const done = () => {
        const error = root.chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve();
      };

      if (theme === "auto") {
        root.chrome.storage.local.remove("uiTheme", done);
      } else {
        root.chrome.storage.local.set({ uiTheme: theme }, done);
      }
    });
  }

  function showTheme(theme) {
    shownTheme = theme;

    if (theme === "auto") {
      root.document.documentElement.removeAttribute("data-theme");
    } else {
      root.document.documentElement.setAttribute("data-theme", theme);
    }

    // SVG elements have no `hidden` property, so the attribute itself is set.
    root.document.querySelectorAll("[data-theme-icon]").forEach((icon) => {
      icon.toggleAttribute("hidden", icon.dataset.themeIcon !== theme);
    });

    // setLabel keeps the key, so a language change re-translates the label.
    namespace.setLabel(getThemeButton(), THEME_LABELS[theme]);
  }

  async function changeTheme() {
    const previousTheme = shownTheme;
    const nextTheme = NEXT_THEME[previousTheme];

    showTheme(nextTheme);

    try {
      await writeStoredTheme(nextTheme);
      setStatus("");
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not save the theme.", error);
      showTheme(previousTheme);
      setStatus("popupThemeError");
    }
  }

  // The language is kept apart from the settings, in storage.local under
  // `uiLanguage: { code, messages }`: it belongs to this device, like the
  // browser language. No key ("auto") means the extension follows the
  // browser language. Only the popup writes it, texts included, so content
  // scripts never have to load extension files.
  let shownLanguage = "auto";
  // Counts the choices made in the language list. A choice whose loading or
  // saving ends after a newer choice was made does nothing.
  let languageRequest = 0;

  function fillLanguageOptions(languageSelect) {
    namespace.SUPPORTED_LANGUAGES.forEach((language) => {
      const option = root.document.createElement("option");
      option.value = language.code;
      // Every language under its own name, so people can find theirs.
      option.textContent = language.nativeName;
      languageSelect.appendChild(option);
    });
  }

  function readStoredLanguage() {
    return new Promise((resolve) => {
      root.chrome.storage.local.get("uiLanguage", (items) => {
        const error = root.chrome.runtime.lastError;

        if (error) {
          console.error("[Anti-Spoiler for YouTube] Could not read the language.", error.message);
          resolve(null);
          return;
        }

        resolve(items.uiLanguage || null);
      });
    });
  }

  // null removes the choice: back to the browser language.
  function writeStoredLanguage(uiLanguage) {
    return new Promise((resolve, reject) => {
      const done = () => {
        const error = root.chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve();
      };

      if (uiLanguage) {
        root.chrome.storage.local.set({ uiLanguage }, done);
      } else {
        root.chrome.storage.local.remove("uiLanguage", done);
      }
    });
  }

  // The list has no "browser language" entry: without a stored choice it
  // shows the language Chrome picked from the browser language.
  function getListedLanguage() {
    return shownLanguage === "auto" ? namespace.getBrowserLanguage() : shownLanguage;
  }

  // uiLanguage is { code, messages }, or null for the browser language.
  function showLanguage(uiLanguage) {
    shownLanguage = uiLanguage ? uiLanguage.code : "auto";
    namespace.setMessages(uiLanguage ? uiLanguage.messages : null);
    root.document.documentElement.lang = namespace.getHtmlLang(shownLanguage);
    namespace.applyTranslations(root.document);
    getLanguageSelect().value = getListedLanguage();
    // The chip shows the listed language as two capitals: pt_BR -> PT.
    root.document.querySelector("[data-language-code]").textContent =
      getListedLanguage().slice(0, 2).toUpperCase();
  }

  async function changeLanguage(languageSelect) {
    languageRequest += 1;
    const request = languageRequest;
    const code = languageSelect.value;

    // Cleared up front: when our own write succeeds, the storage listener
    // shows the new language and this function stops early.
    setStatus("");

    try {
      let uiLanguage = null;

      // Picking the browser's own language removes the stored choice, so
      // the extension follows the browser again.
      if (code !== namespace.getBrowserLanguage()) {
        const messages = await namespace.fetchMessages(code);

        if (request !== languageRequest) {
          return;
        }

        uiLanguage = { code, messages };
      }

      await writeStoredLanguage(uiLanguage);

      if (request !== languageRequest) {
        return;
      }

      showLanguage(uiLanguage);
      setStatus("");
    } catch (error) {
      if (request !== languageRequest) {
        return;
      }

      console.error("[Anti-Spoiler for YouTube] Could not change the language.", error);
      languageSelect.value = getListedLanguage();
      setStatus("popupLanguageError");
    }
  }

  // Another popup window may pick a language or a theme while this one is
  // open.
  function bindExternalLanguageChanges() {
    root.chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes.uiLanguage) {
        // The stored language is now the newest choice: a choice of ours
        // still loading must not write over it when it finishes.
        languageRequest += 1;
        showLanguage(changes.uiLanguage.newValue || null);
      }

      if (changes.uiTheme) {
        showTheme(changes.uiTheme.newValue || "auto");
      }
    });
  }

  async function start() {
    // First, so the colours are right as early as possible.
    readStoredTheme().then(showTheme);

    const toggles = getToggleElements();
    const powerToggle = getPowerToggle();
    const powerStatus = getPowerStatus();
    const powerNote = getPowerNote();
    const settingsPanels = getSettingsPanels();
    const languageSelect = getLanguageSelect();
    const themeButton = getThemeButton();
    const revealButton = getRevealButton();

    fillLanguageOptions(languageSelect);

    // The two reads are independent. The texts are shown in the right
    // language whatever happens to the settings read.
    // The settings code below does not wait for the language: waiting would
    // widen the gap before the storage listeners start, and a change made
    // elsewhere in that gap would be missed. Texts set before the language
    // arrives are set through setText, so showLanguage switches them too.
    readStoredLanguage().then((uiLanguage) => {
      showLanguage(uiLanguage);
      bindExternalLanguageChanges();
    });
    let settingsReadError = null;

    try {
      currentSettings = await namespace.readSettings();
    } catch (error) {
      settingsReadError = error;
    }

    if (settingsReadError) {
      console.error("[Anti-Spoiler for YouTube] Could not read settings.", settingsReadError);
      // The displayed defaults may differ from what is actually stored, so a
      // save from this state would silently overwrite the user's real settings
      // with defaults. Keep the popup read-only until a reopen reads them.
      currentSettings = namespace.DEFAULT_SETTINGS;
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanels);
      await setActionIcon(currentSettings);
      disableControls(toggles, powerToggle, languageSelect, themeButton);
      setStatus("popupLoadError");
      return;
    }

    renderSettings(currentSettings, toggles);
    renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanels);
    await setActionIcon(currentSettings);
    setStatus("");

    bindToggleSaving(toggles);
    bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanels, revealButton);
    bindHeroPointer(getHero());
    bindExternalChanges(toggles, powerToggle, powerStatus, powerNote, settingsPanels, revealButton);
    languageSelect.addEventListener("change", () => changeLanguage(languageSelect));
    themeButton.addEventListener("click", changeTheme);
    bindReveal(revealButton);
    refreshReveal(revealButton);
  }

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(globalThis);
