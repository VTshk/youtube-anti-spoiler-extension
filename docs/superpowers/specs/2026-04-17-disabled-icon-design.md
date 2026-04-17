# Disabled Icon Design

## Goal

When the extension is turned off with the popup power toggle, the pinned Chrome toolbar action icon becomes grayscale. When the extension is turned back on, the normal colored toolbar icon returns.

## Approach

Add grayscale toolbar PNG assets at the same sizes already used by `manifest.action.default_icon`. The popup updates the action icon with `chrome.action.setIcon()` after reading settings and after a successful settings save.

## Files

- `popup/popup.js`: set the toolbar action icon from `extensionEnabled`.
- `icons/icon-disabled16.png`, `icons/icon-disabled32.png`, `icons/icon-disabled48.png`, `icons/icon-disabled128.png`: grayscale toolbar icon assets.
- `tests/popup.test.js`: verify popup toggles the toolbar icon to disabled and normal paths.
- `tests/manifest.test.js`: verify disabled toolbar icon assets exist.

## Testing

Use `node --test`. The popup regression tests load the shared settings module and popup script in an isolated VM context with fake Chrome APIs, then verify that turning protection off calls `chrome.action.setIcon()` with disabled icon paths and turning protection on calls it with normal paths.
