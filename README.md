# Anti-Spoiler for YouTube

Chrome Extension (Manifest V3) that hides YouTube elements that can spoil sports match results:

- time in previews, lists, search results, recommendations, and the player;
- the player progress bar;
- optional video preview blur.

Settings are stored in `chrome.storage.sync`, so they survive browser restarts and sync with the Chrome profile when sync is enabled.

This extension is not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Project Structure

```text
.
├── manifest.json
├── icons/
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── src/
│   ├── content/
│   │   └── content.js
│   └── shared/
│       └── settings.js
└── tests/
```

## Local Installation

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project folder.
5. Open `https://www.youtube.com/`.

No build step is required.

## Usage

The popup has a main **Protection is on** toggle. It fully enables or disables the extension without changing the other checkboxes.

Available settings:

- **Hide time** - hides duration in lists/previews and time in the player. Enabled by default.
- **Hide progress bar** - hides the player progress bar. Enabled by default.
- **Blur previews** - applies a strong blur to video thumbnails/previews. Disabled by default.

## Development

Run the basic tests:

```bash
npm test
```

Tests cover setting defaults, legacy key migration, content script selectors, the MV3 manifest, and the popup.

## Chrome Web Store Preparation

The project already includes an MV3 manifest, popup, content script, `storage` permission, YouTube host permission, and placeholder PNG icons. Replace the icons with final assets before publishing.
