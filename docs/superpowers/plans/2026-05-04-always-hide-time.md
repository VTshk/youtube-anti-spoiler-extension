# Always Hide Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make time hiding mandatory whenever Anti-Spoiler protection is enabled.

**Architecture:** Keep `hideTime` in the internal settings shape for compatibility, but make shared normalization always return `hideTime: true`. Remove the popup control so users can only toggle protection, progress bar hiding, and preview blur.

**Tech Stack:** Chrome MV3 extension, plain JavaScript, Node `node:test`.

---

### Task 1: Settings Normalization

**Files:**
- Modify: `tests/settings.test.js`
- Modify: `src/shared/settings.js`

- [ ] **Step 1: Write the failing settings tests**

In `tests/settings.test.js`, update the existing `normalizeSettings keeps known boolean settings and fills missing defaults` expected object so `hideTime` is `true` even when the input has `hideTime: false`:

```js
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
    hideTime: true,
    hidePlayerProgressBar: true,
    hideVideoPreviews: true,
  },
);
```

Update the legacy migration test expected object so `hideTime` is `true` when legacy keys disagree:

```js
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
  },
);
```

Update the `readSettings asks storage for current and legacy setting keys` expected object so `hideTime` is `true` even when legacy storage would previously disable it:

```js
assert.deepEqual(normalizedSettings, {
  extensionEnabled: true,
  hideTime: true,
  hidePlayerProgressBar: false,
  hideVideoPreviews: false,
});
```

- [ ] **Step 2: Run settings tests and verify red**

Run: `node --test tests/settings.test.js`

Expected: FAIL because `normalizeSettings()` still returns `hideTime: false` for stored and legacy disabled values.

- [ ] **Step 3: Implement mandatory `hideTime` normalization**

In `src/shared/settings.js`, remove the legacy migration helper from the normalized value path and make `hideTime` always true:

```js
function normalizeSettings(rawSettings) {
  const raw = rawSettings || {};

  return {
    extensionEnabled: getBoolean(raw, "extensionEnabled"),
    hideTime: true,
    hidePlayerProgressBar: getBoolean(raw, "hidePlayerProgressBar"),
    hideVideoPreviews: getBoolean(raw, "hideVideoPreviews"),
  };
}
```

Keep `LEGACY_SETTING_KEYS` and `STORAGE_READ_KEYS` so old stored keys are harmless and future cleanup can remove them separately.

- [ ] **Step 4: Run settings tests and verify green**

Run: `node --test tests/settings.test.js`

Expected: PASS.

### Task 2: Popup Control Removal

**Files:**
- Modify: `tests/popup.test.js`
- Modify: `popup/popup.html`

- [ ] **Step 1: Write the failing popup tests**

In `tests/popup.test.js`, update `settingToggles` in `loadPopup()` to model only visible popup controls:

```js
const settingToggles = [
  createPopupElement({ setting: "hidePlayerProgressBar" }),
  createPopupElement({ setting: "hideVideoPreviews" }),
];
```

Rename the popup HTML test to `popup contains the English power control and configurable checkbox settings`, and change its assertions:

```js
assert.doesNotMatch(html, /data-setting="hideTime"/);
assert.doesNotMatch(html, /Hide time/);
assert.match(html, /data-setting="hidePlayerProgressBar"/);
assert.match(html, /Hide progress bar/);
assert.match(html, /data-setting="hideVideoPreviews"/);
assert.match(html, /Blur previews/);
```

- [ ] **Step 2: Run popup tests and verify red**

Run: `node --test tests/popup.test.js`

Expected: FAIL because `popup/popup.html` still contains the `Hide time` checkbox.

- [ ] **Step 3: Remove the popup checkbox**

In `popup/popup.html`, delete the complete `label.setting-row` block containing:

```html
<span class="setting-title">Hide time</span>
<span class="setting-note">Hide video duration in the player and previews</span>
<input class="checkbox-input" type="checkbox" data-setting="hideTime">
```

- [ ] **Step 4: Run popup tests and verify green**

Run: `node --test tests/popup.test.js`

Expected: PASS.

### Task 3: Full Verification

**Files:**
- Verify: `tests/*.test.js`
- Verify: `README.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS for settings, popup, content, background, manifest, and release tests.

- [ ] **Step 2: Check whether README needs wording updates**

Read `README.md`. If it still lists `Hide time` as a user-configurable setting, change that sentence to explain that time is always hidden while protection is on.

- [ ] **Step 3: Run the full test suite again if README changed**

Run: `npm test`

Expected: PASS.
