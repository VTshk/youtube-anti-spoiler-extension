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

  function getPowerStatus() {
    return root.document.querySelector("[data-power-status]");
  }

  function getPowerNote() {
    return root.document.querySelector("[data-power-note]");
  }

  function getSettingsPanel() {
    return root.document.querySelector("[data-settings-panel]");
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

  function setStatus(message) {
    const status = root.document.querySelector("[data-status]");

    if (status) {
      status.textContent = message || "";
    }
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

  function renderPower(settings, powerToggle, powerStatus, powerNote, settingsPanel) {
    const enabled = Boolean(settings.extensionEnabled);

    if (powerToggle) {
      powerToggle.checked = enabled;
      powerToggle.setAttribute("aria-label", enabled ? "Disable protection" : "Enable protection");
    }

    if (powerStatus) {
      powerStatus.textContent = enabled ? "Protection is on" : "Protection is off";
    }

    if (powerNote) {
      powerNote.textContent = enabled
        ? "Spoilers are hidden on YouTube"
        : "YouTube is shown normally";
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
      setStatus("Could not save settings");
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
    const note = root.document.querySelector("[data-shortcut-note]");

    if (!note || !root.chrome || !root.chrome.commands || !root.chrome.commands.getAll) {
      return;
    }

    const commands = await root.chrome.commands.getAll();
    const toggle = commands.find((command) => command.name === "toggle-protection");

    note.textContent = toggle && toggle.shortcut
      ? `Shortcut: ${toggle.shortcut}`
      : "Set a shortcut in chrome://extensions/shortcuts";
    note.hidden = false;
  }

  function disableControls(toggles, powerToggle) {
    toggles.forEach((toggle) => {
      toggle.disabled = true;
    });

    if (powerToggle) {
      powerToggle.disabled = true;
    }
  }

  async function start() {
    const toggles = getToggleElements();
    const powerToggle = getPowerToggle();
    const powerStatus = getPowerStatus();
    const powerNote = getPowerNote();
    const settingsPanel = getSettingsPanel();

    renderShortcut().catch((error) => {
      console.error("[Anti-Spoiler for YouTube] Could not read the shortcut.", error);
    });

    try {
      currentSettings = await namespace.readSettings();
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
      await setActionIcon(currentSettings);
      setStatus("");
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not read settings.", error);
      // The displayed defaults may differ from what is actually stored, so a
      // save from this state would silently overwrite the user's real settings
      // with defaults. Keep the popup read-only until a reopen reads them.
      currentSettings = namespace.DEFAULT_SETTINGS;
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
      await setActionIcon(currentSettings);
      disableControls(toggles, powerToggle);
      setStatus("Could not load settings — close and reopen the popup");
      return;
    }

    bindToggleSaving(toggles);
    bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanel);
    bindExternalChanges(toggles, powerToggle, powerStatus, powerNote, settingsPanel);
  }

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(globalThis);
