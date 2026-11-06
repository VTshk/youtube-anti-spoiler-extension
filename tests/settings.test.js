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
    blurTitlesLinked: true,
    startLiveFromBeginning: true,
    hideComments: true,
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
      showSkipButtons: false,
      hideComments: false,
      unrelated: true,
    }),
    {
      extensionEnabled: false,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
      hideVideoTitles: true,
      blurTitlesLinked: false,
      startLiveFromBeginning: false,
      hideComments: false,
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
      blurTitlesLinked: true,
      startLiveFromBeginning: true,
      hideComments: true,
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

test("the old skip buttons setting is ignored and removed on the next save", async () => {
  let storedSettings = { showSkipButtons: false, hideVideoPreviews: false };
  const storageArea = {
    get(keys, callback) {
      callback(storedSettings);
    },
    set(values, callback) {
      storedSettings = Object.assign({}, storedSettings, values);
      callback();
    },
    remove(keys, callback) {
      keys.forEach((key) => delete storedSettings[key]);
      callback();
    },
  };

  const readSettings = await settings.readSettings(storageArea);

  assert.equal(Object.prototype.hasOwnProperty.call(readSettings, "showSkipButtons"), false);

  await settings.writeSettings(Object.assign({}, readSettings, { hideVideoPreviews: true }), storageArea);

  assert.equal(Object.prototype.hasOwnProperty.call(storedSettings, "showSkipButtons"), false);
  assert.equal(storedSettings.hideVideoPreviews, true);
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
    "blurTitlesLinked",
    "startLiveFromBeginning",
    "hideComments",
    "hideThumbnailDuration",
    "hidePlayerTime",
    "showSkipButtons",
  ]);
  assert.deepEqual(normalizedSettings, {
    extensionEnabled: true,
    hideTime: true,
    hidePlayerProgressBar: false,
    hideVideoPreviews: false,
    hideVideoTitles: false,
    blurTitlesLinked: true,
    startLiveFromBeginning: true,
    hideComments: true,
  });
});

// --- Title blur linked to preview blur ---

test("title blur is linked to preview blur by default", () => {
  assert.equal(settings.DEFAULT_SETTINGS.blurTitlesLinked, true);
  assert.equal(settings.normalizeSettings({}).blurTitlesLinked, true);
});

test("settings saved before the chain button keep title blur on only where it was on", () => {
  // Title blur on: stays on, set separately.
  assert.deepEqual(
    pickTitleSettings(settings.normalizeSettings({ hideVideoTitles: true })),
    { hideVideoTitles: true, blurTitlesLinked: false },
  );
  // Off (the popup saved false for everyone) or never saved: linked.
  assert.deepEqual(
    pickTitleSettings(settings.normalizeSettings({ hideVideoTitles: false })),
    { hideVideoTitles: false, blurTitlesLinked: true },
  );
  assert.deepEqual(
    pickTitleSettings(settings.normalizeSettings({ hideVideoPreviews: true })),
    { hideVideoTitles: false, blurTitlesLinked: true },
  );
  // A damaged value counts as missing.
  assert.equal(settings.normalizeSettings({ blurTitlesLinked: "yes" }).blurTitlesLinked, true);
});

test("a stored link value always wins over the migration", () => {
  assert.deepEqual(
    pickTitleSettings(settings.normalizeSettings({ hideVideoTitles: true, blurTitlesLinked: true })),
    { hideVideoTitles: true, blurTitlesLinked: true },
  );
  assert.deepEqual(
    pickTitleSettings(settings.normalizeSettings({ hideVideoTitles: false, blurTitlesLinked: false })),
    { hideVideoTitles: false, blurTitlesLinked: false },
  );
});

test("getEffectiveSettings blurs titles with previews while linked and keeps the own value otherwise", () => {
  const cases = [
    // [linked, previews, own titles value, effective titles]
    [true, true, false, true],
    [true, false, true, false],
    [false, true, false, false],
    [false, false, true, true],
  ];

  cases.forEach(([linked, previews, titles, expected]) => {
    const stored = settings.normalizeSettings({
      blurTitlesLinked: linked,
      hideVideoPreviews: previews,
      hideVideoTitles: titles,
    });
    const effective = settings.getEffectiveSettings(stored);

    assert.equal(effective.hideVideoTitles, expected, JSON.stringify({ linked, previews, titles }));
    // Everything else is passed through, and the stored copy is not changed.
    assert.equal(effective.hideVideoPreviews, previews);
    assert.equal(effective.blurTitlesLinked, linked);
    assert.equal(stored.hideVideoTitles, titles);
  });
});

function pickTitleSettings(normalized) {
  return {
    hideVideoTitles: normalized.hideVideoTitles,
    blurTitlesLinked: normalized.blurTitlesLinked,
  };
}
