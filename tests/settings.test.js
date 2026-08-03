const assert = require("node:assert/strict");
const test = require("node:test");

const settings = require("../src/shared/settings.js");

test("settings defaults hide spoiler-prone time by default", () => {
  assert.deepEqual(settings.DEFAULT_SETTINGS, {
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
    hideVideoTitles: false,
    startLiveFromBeginning: true,
  });
});

test("normalizeSettings keeps known boolean settings and fills missing defaults", () => {
  assert.deepEqual(
    settings.normalizeSettings({
      extensionEnabled: false,
      hideTime: false,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      hideVideoTitles: true,
      startLiveFromBeginning: false,
      unrelated: true,
    }),
    {
      extensionEnabled: false,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      hideVideoTitles: true,
      startLiveFromBeginning: false,
    },
  );
});

test("normalizeSettings ignores legacy time settings and keeps hideTime enabled", () => {
  assert.deepEqual(
    settings.normalizeSettings({
      hideThumbnailDuration: true,
      hidePlayerTime: false,
    }),
    {
      extensionEnabled: true,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: false,
      hideVideoTitles: false,
      startLiveFromBeginning: true,
    },
  );
});

test("writeSettings removes legacy setting keys after a successful save", async () => {
  const removedKeys = [];
  const storageArea = {
    set(values, callback) {
      callback();
    },
    remove(keys, callback) {
      removedKeys.push(...keys);
      callback();
    },
  };

  await settings.writeSettings({ hideVideoPreviews: true }, storageArea);

  assert.deepEqual(removedKeys, [...settings.LEGACY_SETTING_KEYS]);
});

test("writeSettings resolves without a remove-capable storage area", async () => {
  const storageArea = {
    set(values, callback) {
      callback();
    },
  };

  const saved = await settings.writeSettings({ hideVideoPreviews: true }, storageArea);

  assert.equal(saved.hideVideoPreviews, true);
});

test("readSettings asks storage for current and legacy setting keys", async () => {
  let requestedKeys = [];
  const fakeStorage = {
    get(keys, callback) {
      requestedKeys = keys;
      callback({
        hideThumbnailDuration: true,
        hidePlayerTime: false,
        hidePlayerProgressBar: false,
      });
    },
  };

  const normalizedSettings = await settings.readSettings(fakeStorage);

  assert.deepEqual(requestedKeys, [
    "extensionEnabled",
    "hideTime",
    "hidePlayerProgressBar",
    "hideVideoPreviews",
    "hideVideoTitles",
    "startLiveFromBeginning",
    "hideThumbnailDuration",
    "hidePlayerTime",
  ]);
  assert.deepEqual(normalizedSettings, {
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: false,
    hideVideoPreviews: false,
    hideVideoTitles: false,
    startLiveFromBeginning: true,
  });
});
