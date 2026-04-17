const assert = require("node:assert/strict");
const test = require("node:test");

const settings = require("../src/shared/settings.js");

test("settings defaults hide spoiler-prone time by default", () => {
  assert.deepEqual(settings.DEFAULT_SETTINGS, {
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: false,
  });
});

test("normalizeSettings keeps known boolean settings and fills missing defaults", () => {
  assert.deepEqual(
    settings.normalizeSettings({
      extensionEnabled: false,
      hideTime: false,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      unrelated: true,
    }),
    {
      extensionEnabled: false,
      hideTime: false,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
    },
  );
});

test("normalizeSettings migrates legacy time settings into the unified hideTime setting", () => {
  assert.deepEqual(
    settings.normalizeSettings({
      hideThumbnailDuration: true,
      hidePlayerTime: false,
    }),
    {
      extensionEnabled: true,
      hideTime: false,
      hidePlayerProgressBar: true,
      hideVideoPreviews: false,
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
    "hideThumbnailDuration",
    "hidePlayerTime",
  ]);
  assert.deepEqual(normalizedSettings, {
    extensionEnabled: true,
    hideTime: false,
    hidePlayerProgressBar: false,
    hideVideoPreviews: false,
  });
});
