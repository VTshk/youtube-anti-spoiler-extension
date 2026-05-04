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

async function loadPopup(storedSettings = {}) {
  const powerToggle = createPopupElement();
  const powerStatus = createPopupElement();
  const powerNote = createPopupElement();
  const settingsPanel = createPopupElement();
  const pausedPanel = createPopupElement();
  const status = createPopupElement();
  const settingToggles = [
    createPopupElement({ setting: "hidePlayerProgressBar" }),
    createPopupElement({ setting: "hideVideoPreviews" }),
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
      runtime: {
        lastError: null,
      },
      storage: {
        sync: {
          get(keys, callback) {
            callback(storedSettings);
          },
          set(nextSettings, callback) {
            Object.assign(storedSettings, nextSettings);
            callback();
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
          "[data-paused-panel]": pausedPanel,
          "[data-status]": status,
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
    setIconCalls,
    storedSettings,
  };
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
  assert.match(js, /pausedPanel\.hidden = enabled/);
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
  });

  powerToggle.checked = true;
  await powerToggle.listeners.change();

  assert.equal(storedSettings.extensionEnabled, true);
  assert.deepEqual(setIconCalls.at(-1), {
    path: getEnabledIconPaths(),
  });
});
