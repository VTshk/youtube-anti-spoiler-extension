const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { getEnglishMessages } = require("./helpers/english-messages.js");

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

// Serves the packaged locale files, like fetch(chrome.runtime.getURL(...)).
function fetchPackagedFile(url) {
  const filePath = path.join(__dirname, "..", url.replace("chrome-extension://test-id/", ""));

  if (!fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404 });
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(fs.readFileSync(filePath, "utf8"))),
  });
}

// answerTabMessage plays chrome.tabs.sendMessage: it gets the tab id and the
// message and returns the promise Chrome would.
function loadBackground(storedSettings = {}, localItems = {}, answerTabMessage = () => Promise.resolve()) {
  const setIconCalls = [];
  const storageListeners = [];
  const commandListeners = [];
  const installedListeners = [];
  const localWrites = [];
  const tabMessages = [];
  const context = {
    console,
    fetch: fetchPackagedFile,
    chrome: {
      tabs: {
        sendMessage(tabId, message) {
          tabMessages.push({ tabId, message });
          return answerTabMessage(tabId, message);
        },
      },
      commands: {
        onCommand: {
          addListener(listener) {
            commandListeners.push(listener);
          },
        },
      },
      action: {
        setIcon(details) {
          assert.equal(arguments.length, 1);
          setIconCalls.push(JSON.parse(JSON.stringify(details)));
          return Promise.resolve();
        },
      },
      runtime: {
        lastError: null,
        getURL(relativePath) {
          return `chrome-extension://test-id/${relativePath}`;
        },
        onInstalled: {
          addListener(listener) {
            installedListeners.push(listener);
          },
        },
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
        local: {
          get(key, callback) {
            assert.equal(key, "uiLanguage");
            callback(Object.assign({}, localItems));
          },
          set(items, callback) {
            localWrites.push(JSON.parse(JSON.stringify(items)));
            Object.assign(localItems, items);
            callback();
          },
          remove(key, callback) {
            localWrites.push({ removed: key });
            delete localItems[key];
            callback();
          },
        },
        onChanged: {
          addListener(listener) {
            storageListeners.push(listener);
          },
        },
      },
    },
    importScripts(...scriptPaths) {
      scriptPaths.forEach((scriptPath) => {
        const relativePath = scriptPath.replace(/^\//, "");
        const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
        vm.runInContext(source, context);
      });
    },
  };

  context.globalThis = context;
  vm.createContext(context);

  const backgroundSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "background", "background.js"),
    "utf8",
  );

  vm.runInContext(backgroundSource, context);

  return {
    commandListeners,
    installedListeners,
    localItems,
    localWrites,
    setIconCalls,
    storageListeners,
    tabMessages,
  };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

test("background sets the toolbar action icon from stored enabled state", async () => {
  const { setIconCalls } = loadBackground({ extensionEnabled: true });
  await Promise.resolve();

  assert.deepEqual(setIconCalls.at(-1), {
    path: getEnabledIconPaths(),
  });
});

test("background sets the toolbar action icon from stored disabled state", async () => {
  const { setIconCalls } = loadBackground({ extensionEnabled: false });
  await Promise.resolve();

  assert.deepEqual(setIconCalls.at(-1), {
    path: getDisabledIconPaths(),
  });
});

test("background updates the toolbar action icon when extensionEnabled changes", async () => {
  const { setIconCalls, storageListeners } = loadBackground({ extensionEnabled: true });
  await Promise.resolve();

  storageListeners[0](
    {
      extensionEnabled: {
        oldValue: true,
        newValue: false,
      },
    },
    "sync",
  );
  await Promise.resolve();

  assert.deepEqual(setIconCalls.at(-1), {
    path: getDisabledIconPaths(),
  });
});

test("background keyboard shortcut turns protection off and back on", async () => {
  const storedSettings = { extensionEnabled: true, hideVideoTitles: true };
  const { commandListeners } = loadBackground(storedSettings);

  assert.equal(commandListeners.length, 1);

  await commandListeners[0]("toggle-protection");
  assert.equal(storedSettings.extensionEnabled, false);
  // Other settings survive the toggle.
  assert.equal(storedSettings.hideVideoTitles, true);

  await commandListeners[0]("toggle-protection");
  assert.equal(storedSettings.extensionEnabled, true);
});

test("background ignores unknown commands", async () => {
  const storedSettings = { extensionEnabled: true };
  const { commandListeners } = loadBackground(storedSettings);

  await commandListeners[0]("something-else");

  assert.equal(storedSettings.extensionEnabled, true);
});

test("background reveal shortcut asks the tab it was pressed in to uncover its video", async () => {
  const storedSettings = { extensionEnabled: true };
  const { commandListeners, tabMessages } = loadBackground(storedSettings);

  await commandListeners[0]("reveal-video", { id: 42 });

  assert.equal(tabMessages.length, 1);
  assert.equal(tabMessages[0].tabId, 42);
  assert.equal(tabMessages[0].message.type, "yas-toggle-reveal");
  // Protection itself stays as it was.
  assert.equal(storedSettings.extensionEnabled, true);
});

test("background reveal shortcut ignores a press without a tab", async () => {
  const { commandListeners, tabMessages } = loadBackground({ extensionEnabled: true });

  await commandListeners[0]("reveal-video", undefined);
  await commandListeners[0]("reveal-video", {});

  assert.equal(tabMessages.length, 0);
});

test("background reveal shortcut survives a tab without the content script", async () => {
  // Chrome rejects sendMessage when nothing in the tab listens (a page that
  // is not YouTube, or a YouTube tab opened before the extension loaded).
  const { commandListeners, tabMessages } = loadBackground(
    { extensionEnabled: true },
    {},
    () => Promise.reject(new Error("Could not establish connection. Receiving end does not exist.")),
  );

  await commandListeners[0]("reveal-video", { id: 7 });

  assert.equal(tabMessages.length, 1);
});

test("background keyboard shortcut pressed twice quickly ends where it started", async () => {
  const storedSettings = { extensionEnabled: true };
  const { commandListeners } = loadBackground(storedSettings);

  // The second press arrives before the first one has written.
  await Promise.all([
    commandListeners[0]("toggle-protection"),
    commandListeners[0]("toggle-protection"),
  ]);

  assert.equal(storedSettings.extensionEnabled, true);
});

// --- Language texts after an update ---

test("background reloads the stored language texts after an update", async () => {
  const oldTexts = Object.assign(getEnglishMessages(), { popupGroupPlayer: "OLD PLAYER" });
  delete oldTexts.popupStatusOn;
  const { installedListeners, localItems } = loadBackground({}, {
    uiLanguage: { code: "en", messages: oldTexts },
  });

  assert.equal(installedListeners.length, 1);
  await installedListeners[0]({ reason: "update", previousVersion: "0.3.0" });

  // Stored from inside the worker's own realm, so compared as plain data.
  assert.deepEqual(JSON.parse(JSON.stringify(localItems.uiLanguage)), {
    code: "en",
    messages: getEnglishMessages(),
  });
});

test("background leaves the language alone after an update when none is stored", async () => {
  const { installedListeners, localItems, localWrites } = loadBackground({}, {});

  await installedListeners[0]({ reason: "update", previousVersion: "0.3.0" });
  await flushPromises();

  assert.deepEqual(localWrites, []);
  assert.equal(Object.prototype.hasOwnProperty.call(localItems, "uiLanguage"), false);
});

test("background leaves the stored language alone on a fresh install", async () => {
  const stored = { code: "en", messages: { popupGroupPlayer: "OLD PLAYER" } };
  const { installedListeners, localItems, localWrites } = loadBackground({}, {
    uiLanguage: stored,
  });

  await installedListeners[0]({ reason: "install" });
  await flushPromises();

  assert.deepEqual(localWrites, []);
  assert.equal(localItems.uiLanguage, stored);
});

test("background drops a stored language the new version no longer has", async () => {
  const { installedListeners, localItems, localWrites } = loadBackground({}, {
    uiLanguage: { code: "xx", messages: { popupGroupPlayer: "OLD PLAYER" } },
  });

  await installedListeners[0]({ reason: "update", previousVersion: "0.3.0" });

  assert.deepEqual(localWrites, [{ removed: "uiLanguage" }]);
  assert.equal(Object.prototype.hasOwnProperty.call(localItems, "uiLanguage"), false);
});
