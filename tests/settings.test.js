const assert = require("node:assert/strict");
const test = require("node:test");

const settings = require("../src/shared/settings.js");

test("settings defaults hide spoiler-prone time by default", () => {
  assert.deepEqual(settings.DEFAULT_SETTINGS, {
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
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
      startLiveFromBeginning: false,
      unrelated: true,
    }),
    {
      extensionEnabled: false,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
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
      startLiveFromBeginning: true,
    },
  );
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
    "startLiveFromBeginning",
    "hideThumbnailDuration",
    "hidePlayerTime",
  ]);
  assert.deepEqual(normalizedSettings, {
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: false,
    hideVideoPreviews: false,
    startLiveFromBeginning: true,
  });
});
