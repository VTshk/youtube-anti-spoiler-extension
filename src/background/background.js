(function initBackground(root) {
  if (!root.YouTubeAntiSpoiler && typeof root.importScripts === "function") {
    root.importScripts("/src/shared/settings.js");
  }

  const namespace = root.YouTubeAntiSpoiler;

  if (!namespace || !root.chrome || !root.chrome.action) {
    return;
  }

  const ENABLED_ICON_PATHS = Object.freeze({
    16: "/icons/icon16.png",
    32: "/icons/icon32.png",
    48: "/icons/icon48.png",
    128: "/icons/icon128.png",
  });

  const DISABLED_ICON_PATHS = Object.freeze({
    16: "/icons/icon-disabled16.png",
    32: "/icons/icon-disabled32.png",
    48: "/icons/icon-disabled48.png",
    128: "/icons/icon-disabled128.png",
  });

  async function setActionIcon(settings) {
    if (!root.chrome.action.setIcon) {
      return;
    }

    const normalizedSettings = namespace.normalizeSettings(settings);

    try {
      await root.chrome.action.setIcon({
        path: normalizedSettings.extensionEnabled
          ? ENABLED_ICON_PATHS
          : DISABLED_ICON_PATHS,
      });
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not update toolbar icon.", error);
    }
  }

  async function refreshActionIcon() {
    try {
      const settings = await namespace.readSettings();
      await setActionIcon(settings);
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not read settings for toolbar icon.", error);
      await setActionIcon(namespace.DEFAULT_SETTINGS);
    }
  }

  function bindStorageChanges() {
    if (!root.chrome.storage || !root.chrome.storage.onChanged) {
      return;
    }

    root.chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes.extensionEnabled) {
        return;
      }

      setActionIcon({
        extensionEnabled: changes.extensionEnabled.newValue,
      });
    });
  }

  // Keyboard shortcut (manifest "commands"): flip protection on or off. The
  // toolbar icon and open YouTube tabs follow through storage.onChanged.
  // Presses are handled one after another, so a second press reads what the
  // first one wrote instead of flipping the same old value.
  let toggleQueue = Promise.resolve();

  function toggleProtection() {
    toggleQueue = toggleQueue.then(flipProtection);
    return toggleQueue;
  }

  async function flipProtection() {
    try {
      const settings = await namespace.readSettings();
      await namespace.writeSettings(
        Object.assign({}, settings, { extensionEnabled: !settings.extensionEnabled }),
      );
    } catch (error) {
      console.error("[Anti-Spoiler for YouTube] Could not toggle protection.", error);
    }
  }

  function bindCommands() {
    if (!root.chrome.commands || !root.chrome.commands.onCommand) {
      return;
    }

    root.chrome.commands.onCommand.addListener((command) => {
      if (command === "toggle-protection") {
        return toggleProtection();
      }

      return undefined;
    });
  }

  refreshActionIcon();
  bindStorageChanges();
  bindCommands();
})(globalThis);
