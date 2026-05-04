# Always Hide Time Design

## Goal

Anti-Spoiler for YouTube should always hide spoiler-prone time indicators whenever protection is enabled. Users should no longer be able to disable time hiding separately from the main protection toggle.

## Behavior

- The popup removes the `Hide time` checkbox.
- The popup still allows users to control `Hide progress bar` and `Blur previews`.
- `hideTime` remains an internal setting for compatibility with the current content script and stored data shape.
- `normalizeSettings()` always returns `hideTime: true`, including when storage contains `hideTime: false` or legacy time keys.
- Turning the main protection toggle off still disables all hiding classes, including time hiding.

## Architecture

The shared settings module remains the source of truth for normalized settings. The content script continues to consume `hideTime` through the existing class mapping, so the CSS behavior stays localized and low-risk. The popup simply stops rendering a `data-setting="hideTime"` input, and saves only the remaining visible setting controls plus the main enabled state.

## Testing

Tests should be updated before implementation:

- Settings tests should prove saved `hideTime: false` normalizes to `true`.
- Legacy time keys should no longer be able to disable `hideTime`.
- Popup tests should prove the HTML does not expose `data-setting="hideTime"` or the `Hide time` label.
- Existing popup save tests should continue to pass, showing the remaining settings and toolbar icon behavior still work.
