# Disabled Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pinned Chrome toolbar action icon grayscale whenever `extensionEnabled` is false.

**Architecture:** Keep popup UI rendering unchanged and update the Chrome action icon from the popup save/read flow. Use explicit disabled PNG files because CSS cannot style Chrome toolbar icons.

**Tech Stack:** Chrome `chrome.action.setIcon()`, plain JavaScript popup code, PNG icon assets, Node `node:test`.

---

### Task 1: Toolbar Action Icon Tests

**Files:**
- Modify: `tests/popup.test.js`
- Test: `tests/popup.test.js`

- [ ] **Step 1: Write the failing tests**

```js
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
    path: {
      16: "/icons/icon-disabled16.png",
      32: "/icons/icon-disabled32.png",
      48: "/icons/icon-disabled48.png",
      128: "/icons/icon-disabled128.png",
    },
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/popup.test.js`

Expected: fail because `popup.js` does not call `chrome.action.setIcon()`.

### Task 2: Disabled Toolbar PNG Assets

**Files:**
- Create: `icons/icon-disabled16.png`
- Create: `icons/icon-disabled32.png`
- Create: `icons/icon-disabled48.png`
- Create: `icons/icon-disabled128.png`
- Modify: `tests/manifest.test.js`
- Test: `tests/manifest.test.js`

- [ ] **Step 1: Add assertions for disabled icon files**

```js
[
  "icon-disabled16.png",
  "icon-disabled32.png",
  "icon-disabled48.png",
  "icon-disabled128.png",
].forEach((fileName) => {
  const disabledIconPath = path.join(__dirname, "..", "icons", fileName);
  assert.equal(fs.existsSync(disabledIconPath), true, `${fileName} should exist`);
});
```

- [ ] **Step 2: Generate grayscale PNGs from existing toolbar icons**

Use an image tool to generate clearly gray versions from `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, and `icons/icon128.png`.

- [ ] **Step 3: Run manifest test**

Run: `node --test tests/manifest.test.js`

Expected: pass once all disabled icons exist.

### Task 3: Set Toolbar Icon From Popup

**Files:**
- Modify: `popup/popup.js`
- Test: full test suite

- [ ] **Step 1: Add toolbar icon path helpers**

```js
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
```

- [ ] **Step 2: Add `setActionIcon()`**

```js
function setActionIcon(settings) {
  if (!root.chrome || !root.chrome.action || !root.chrome.action.setIcon) {
    return;
  }

  root.chrome.action.setIcon({
    path: settings.extensionEnabled ? getEnabledIconPaths() : getDisabledIconPaths(),
  }, reportActionIconError);
}
```

- [ ] **Step 3: Call `setActionIcon(currentSettings)` after successful reads and writes**

- [ ] **Step 4: Run all tests**

Run: `npm test`

Expected: all tests pass.
