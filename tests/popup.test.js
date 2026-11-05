const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createPopupElement(dataset = {}) {
  return {
    dataset,
    checked: false,
    hidden: false,
    textContent: "",
    attributes: {},
    listeners: {},
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
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

async function loadPopup(
  storedSettings = {},
  { failRead = false, failWrite = false, shortcut = "Alt+Shift+S" } = {},
) {
  const storageChangeListeners = [];
  const shortcutNote = createPopupElement();
  const powerToggle = createPopupElement();
  const powerStatus = createPopupElement();
  const powerNote = createPopupElement();
  const settingsPanel = createPopupElement();
  const status = createPopupElement();
  const settingToggles = [
    createPopupElement({ setting: "hidePlayerProgressBar" }),
    createPopupElement({ setting: "hideVideoPreviews" }),
    createPopupElement({ setting: "hideVideoTitles" }),
    createPopupElement({ setting: "startLiveFromBeginning" }),
  ];
  const setIconCalls = [];
  const context = {
    console,
    chrome: {
      action: {
        setIcon(details) {
          assert.equal(arguments.length, 1);
          setIconCalls.push(JSON.parse(JSON.stringify(details)));
          return Promise.resolve();
        },
      },
      commands: {
        getAll() {
          return Promise.resolve([{ name: "toggle-protection", shortcut }]);
        },
      },
      runtime: {
        lastError: null,
      },
      storage: {
        sync: {
          get(keys, callback) {
            if (failRead) {
              context.chrome.runtime.lastError = { message: "storage unavailable" };
              callback({});
              context.chrome.runtime.lastError = null;
              return;
            }

            callback(storedSettings);
          },
          set(nextSettings, callback) {
            if (failWrite) {
              context.chrome.runtime.lastError = { message: "quota exceeded" };
              callback();
              context.chrome.runtime.lastError = null;
              return;
            }

            Object.assign(storedSettings, nextSettings);
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
    document: {
      readyState: "complete",
      querySelector(selector) {
        return {
          "[data-power-toggle]": powerToggle,
          "[data-power-status]": powerStatus,
          "[data-power-note]": powerNote,
          "[data-settings-panel]": settingsPanel,
          "[data-status]": status,
          "[data-shortcut-note]": shortcutNote,
        }[selector] || null;
      },
      querySelectorAll(selector) {
        return selector === "[data-setting]" ? settingToggles : [];
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);

  const settingsSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "shared", "settings.js"),
    "utf8",
  );
  const popupSource = fs.readFileSync(
    path.join(__dirname, "..", "popup", "popup.js"),
    "utf8",
  );

  vm.runInContext(settingsSource, context);
  vm.runInContext(popupSource, context);

  for (let index = 0; index < 4; index++) {
    await Promise.resolve();
  }

  return {
    powerToggle,
    powerStatus,
    settingToggles,
    setIconCalls,
    shortcutNote,
    status,
    storedSettings,
    emitStorageChange(changes) {
      storageChangeListeners.forEach((listener) => listener(changes, "sync"));
    },
  };
}

async function flushPromises() {
  for (let index = 0; index < 6; index++) {
    await Promise.resolve();
  }
}

function findToggle(settingToggles, setting) {
  return settingToggles.find((toggle) => toggle.dataset.setting === setting);
}

test("popup contains the English power control and configurable checkbox settings", () => {
  const popupPath = path.join(__dirname, "..", "popup", "popup.html");
  const html = fs.readFileSync(popupPath, "utf8");

  assert.match(html, /lang="en"/);
  assert.match(html, /data-power-toggle/);
  assert.match(html, /class="brand-logo"/);
  assert.match(html, /\.\.\/icons\/icon\.svg/);
  assert.match(html, /class="power-toggle"/);
  assert.match(html, /Anti-Spoiler for YouTube/);
  assert.match(html, /Protection is on/);
  assert.match(html, /data-settings-panel/);
  assert.doesNotMatch(html, /data-setting="hideTime"/);
  assert.doesNotMatch(html, /Hide time/);
  assert.match(html, /data-setting="hidePlayerProgressBar"/);
  assert.match(html, /Hide progress bar/);
  assert.match(html, /data-setting="hideVideoPreviews"/);
  assert.match(html, /Blur previews/);
  assert.match(html, /data-setting="hideVideoTitles"/);
  assert.match(html, /Hide video titles/);
  assert.match(html, /data-setting="startLiveFromBeginning"/);
  assert.match(html, /Protect live streams/);
  assert.match(html, /Pause live streams and hide live chat behind a spoiler guard/);
  assert.match(html, /class="checkbox-input"/);
  assert.doesNotMatch(html, /switch-large/);
  assert.doesNotMatch(html, /data-setting="hideThumbnailDuration"/);
  assert.doesNotMatch(html, /data-setting="hidePlayerTime"/);
});

test("popup CSS uses a rounded compact power switch and checkbox styling", () => {
  const cssPath = path.join(__dirname, "..", "popup", "popup.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /font-family:\s*system-ui/);
  assert.match(css, /font-size:\s*15px/);
  assert.match(css, /\.power-toggle/);
  assert.match(css, /\.power-track/);
  assert.match(css, /border-radius:\s*999px/);
  assert.match(css, /\.power-input:checked \+ \.power-track/);
  assert.match(css, /\.power-input:checked \+ \.power-track\s*\{[^}]*border-color:\s*#c85252;[^}]*background:\s*#c85252;/s);
  assert.match(css, /\.checkbox-input/);
  assert.match(css, /\.checkbox-input:checked\s*\{[^}]*border-color:\s*#c85252;[^}]*background:\s*#c85252;/s);
  assert.match(css, /\.settings-list\[hidden\]/);
  assert.doesNotMatch(css, /\.switch-track/);
  assert.doesNotMatch(css, /\.power-button/);
  assert.doesNotMatch(css, /\.brand-logo\.is-disabled/);
});

test("popup script updates English power status text and hides settings when paused", () => {
  const jsPath = path.join(__dirname, "..", "popup", "popup.js");
  const js = fs.readFileSync(jsPath, "utf8");

  assert.match(js, /Protection is on/);
  assert.match(js, /Protection is off/);
  assert.match(js, /settingsPanel\.hidden = !enabled/);
  assert.doesNotMatch(js, /Saved/);
  assert.match(js, /Could not save settings/);
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
  const { powerToggle, settingToggles, status } = await loadPopup(
    {},
    { failRead: true },
  );

  // Saving from this state would overwrite the user's stored settings with
  // the displayed defaults, so every control must be disabled.
  assert.equal(powerToggle.disabled, true);
  settingToggles.forEach((toggle) => {
    assert.equal(toggle.disabled, true);
  });
  assert.match(status.textContent, /Could not load settings/);
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
  const titleToggle = settingToggles.find(
    (toggle) => toggle.dataset.setting === "hideVideoTitles",
  );

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
  const liveStartToggle = settingToggles.find(
    (toggle) => toggle.dataset.setting === "startLiveFromBeginning",
  );

  assert.equal(liveStartToggle.checked, true);

  liveStartToggle.checked = false;
  await liveStartToggle.listeners.change();

  assert.equal(storedSettings.startLiveFromBeginning, false);
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
  assert.equal(powerStatus.textContent, "Protection is off");
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
  titleToggle.checked = true;
  await titleToggle.listeners.change();
  await flushPromises();

  assert.equal(status.textContent, "");
});

test("popup shows the protection shortcut the user has set", async () => {
  const { shortcutNote } = await loadPopup({});
  await flushPromises();

  assert.equal(shortcutNote.textContent, "Shortcut: Alt+Shift+S");
  assert.equal(shortcutNote.hidden, false);
});

test("popup explains where to set a shortcut when none is assigned", async () => {
  const { shortcutNote } = await loadPopup({}, { shortcut: "" });
  await flushPromises();

  assert.equal(shortcutNote.textContent, "Set a shortcut in chrome://extensions/shortcuts");
});
