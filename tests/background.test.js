const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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

function loadBackground(storedSettings = {}) {
  const setIconCalls = [];
  const storageListeners = [];
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
        },
        onChanged: {
          addListener(listener) {
            storageListeners.push(listener);
          },
        },
      },
    },
    importScripts(scriptPath) {
      const relativePath = scriptPath.replace(/^\//, "");
      const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
      vm.runInContext(source, context);
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
    setIconCalls,
    storageListeners,
  };
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
