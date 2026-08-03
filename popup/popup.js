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

  function getFormSettings(toggles, baseSettings) {
    return toggles.reduce((settings, toggle) => {
      settings[toggle.dataset.setting] = toggle.checked;
      return settings;
    }, Object.assign({}, baseSettings));
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

  async function saveSettings(nextSettings) {
    currentSettings = namespace.normalizeSettings(nextSettings);

    try {
      currentSettings = await namespace.writeSettings(currentSettings);
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
        await saveSettings(getFormSettings(toggles, currentSettings));
      });
    });
  }

  function bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanel, toggles) {
    if (!powerToggle) {
      return;
    }

    powerToggle.addEventListener("change", async () => {
      const nextSettings = getFormSettings(toggles, currentSettings);
      nextSettings.extensionEnabled = powerToggle.checked;

      // currentSettings reflects the attempted state whether or not the write
      // succeeds, so the power UI is rendered the same way either way.
      await saveSettings(nextSettings);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
    });
  }

  async function start() {
    const toggles = getToggleElements();
    const powerToggle = getPowerToggle();
    const powerStatus = getPowerStatus();
    const powerNote = getPowerNote();
    const settingsPanel = getSettingsPanel();

    try {
      currentSettings = await namespace.readSettings();
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
      await setActionIcon(currentSettings);
      setStatus("");
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not read settings.", error);
      currentSettings = namespace.DEFAULT_SETTINGS;
      renderSettings(currentSettings, toggles);
      renderPower(currentSettings, powerToggle, powerStatus, powerNote, settingsPanel);
      await setActionIcon(currentSettings);
      setStatus("Using default settings");
    }

    bindToggleSaving(toggles);
    bindPowerSaving(powerToggle, powerStatus, powerNote, settingsPanel, toggles);
  }

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(globalThis);
