(function initPopup(root) {
  const namespace = root.YouTubeAntiSpoiler;

  if (!namespace) {
    return;
  }

  let currentSettings = namespace.DEFAULT_SETTINGS;
  // Set when the settings could not be read: every control stays disabled.
  let readOnly = false;

  function getToggleElements() {
    return Array.from(root.document.querySelectorAll("[data-setting]"));
  }

  function getPowerToggle() {
    return root.document.querySelector("[data-power-toggle]");
  }

  function getPowerStatus() {
    return root.document.querySelector("[data-power-status]");
  }

  function getPowerNote() {
    return root.document.querySelector("[data-power-note]");
  }

  function getSettingsPanel() {
    return root.document.querySelector("[data-settings-panel]");
  }

  function getLanguageSelect() {
    return root.document.querySelector("[data-language-select]");
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

    renderSkipButtonsDependency(settings, toggles);
  }

  // Skip buttons stand in for the hidden progress bar, so they only work
  // while it is hidden. Their saved value is left alone: hiding the bar
  // again brings the user's choice back.
  function renderSkipButtonsDependency(settings, toggles) {
    const skipToggle = toggles.find((toggle) => toggle.dataset.setting === "showSkipButtons");
    const skipNote = root.document.querySelector("[data-skip-note]");
    const progressBarHidden = Boolean(settings.hidePlayerProgressBar);

    skipToggle.disabled = readOnly || !progressBarHidden;
    namespace.setText(
      skipNote,
      progressBarHidden ? "popupSkipButtonsNote" : "popupSkipButtonsRequires",
    );
  }

  function renderPower(settings, powerToggle, powerStatus, powerNote, settingsPanel) {
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

    if (settingsPanel) {
      settingsPanel.hidden = !enabled;
    }
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

  function bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanel) {
    if (!powerToggle) {
      return;
    }

    powerToggle.addEventListener("change", async () => {
      await saveSettings({ extensionEnabled: powerToggle.checked });
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
    });
  }

  // Another popup or Chrome sync may change settings while this popup is
  // open; keep the form current so the next save does not undo that change.
  function bindExternalChanges(toggles, powerToggle, powerStatus, powerNote, settingsPanel) {
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
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
    });
  }

  // Shows the shortcut the user actually has (it can be changed or cleared
  // in chrome://extensions/shortcuts).
  async function renderShortcut() {
    if (!root.chrome || !root.chrome.commands || !root.chrome.commands.getAll) {
      return;
    }

    const commands = await root.chrome.commands.getAll();
    const toggle = commands.find((command) => command.name === "toggle-protection");
    const shortcutIsSet = Boolean(toggle && toggle.shortcut);

    root.document.querySelector("[data-shortcut-key]").textContent = shortcutIsSet
      ? toggle.shortcut
      : "";
    root.document.querySelector("[data-shortcut-line]").hidden = !shortcutIsSet;
    root.document.querySelector("[data-shortcut-missing]").hidden = shortcutIsSet;
  }

  function disableControls(toggles, powerToggle, languageSelect) {
    toggles.forEach((toggle) => {
      toggle.disabled = true;
    });

    if (powerToggle) {
      powerToggle.disabled = true;
    }

    languageSelect.disabled = true;
  }

  // The language is kept apart from the settings, in storage.local under
  // `uiLanguage: { code, messages }`: it belongs to this device, like the
  // browser language. No key means "Browser language". Only the popup writes
  // it, texts included, so content scripts never have to load extension
  // files.
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

  // uiLanguage is { code, messages }, or null for the browser language.
  function showLanguage(uiLanguage) {
    shownLanguage = uiLanguage ? uiLanguage.code : "auto";
    namespace.setMessages(uiLanguage ? uiLanguage.messages : null);
    root.document.documentElement.lang = namespace.getHtmlLang(shownLanguage);
    namespace.applyTranslations(root.document);
    getLanguageSelect().value = shownLanguage;
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

      if (code !== "auto") {
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
      languageSelect.value = shownLanguage;
      setStatus("popupLanguageError");
    }
  }

  // Another popup window may pick a language while this one is open.
  function bindExternalLanguageChanges() {
    root.chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.uiLanguage) {
        // The stored language is now the newest choice: a choice of ours
        // still loading must not write over it when it finishes.
        languageRequest += 1;
        showLanguage(changes.uiLanguage.newValue || null);
      }
    });
  }

  async function start() {
    const toggles = getToggleElements();
    const powerToggle = getPowerToggle();
    const powerStatus = getPowerStatus();
    const powerNote = getPowerNote();
    const settingsPanel = getSettingsPanel();
    const languageSelect = getLanguageSelect();

    fillLanguageOptions(languageSelect);
    renderShortcut().catch((error) => {
      console.error("[Anti-Spoiler for YouTube] Could not read the shortcut.", error);
    });

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
      readOnly = true;
      currentSettings = namespace.DEFAULT_SETTINGS;
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
      await setActionIcon(currentSettings);
      disableControls(toggles, powerToggle, languageSelect);
      setStatus("popupLoadError");
      return;
    }

    renderSettings(currentSettings, toggles);
    renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
    await setActionIcon(currentSettings);
    setStatus("");

    bindToggleSaving(toggles);
    bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanel);
    bindExternalChanges(toggles, powerToggle, powerStatus, powerNote, settingsPanel);
    languageSelect.addEventListener("change", () => changeLanguage(languageSelect));
  }

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(globalThis);
