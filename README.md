# Anti-Spoiler for YouTube

Chrome Extension (Manifest V3) that hides YouTube elements that can spoil sports match results:

- time in previews, lists, search results, recommendations, and the player;
- the player progress bar;
- optional video preview blur.

Settings are stored in `chrome.storage.sync`, so they survive browser restarts and sync with the Chrome profile when sync is enabled.

Requires Chrome 111 or newer (the live-stream guard runs a MAIN-world content script).

This extension is not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Project Structure

```text
.
|-- manifest.json
|-- icons/
|-- popup/
|   |-- popup.html
|   |-- popup.css
|   `-- popup.js
|-- src/
|   |-- background/
|   |   `-- background.js
|   |-- content/
|   |   |-- content.js
|   |   |-- live-player-bridge.js
|   |   `-- live-start-controller.js
|   `-- shared/
|       `-- settings.js
|-- tests/
|-- scripts/
|-- store/
`-- docs/
```

## Local Installation

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project folder.
5. Open `https://www.youtube.com/`.

No build step is required for local unpacked installation.

## Usage

The popup has a main **Protection is on** toggle. It fully enables or disables the extension without changing the other checkboxes.

Time hiding is always active while protection is on. Available settings:

- **Hide progress bar** - hides the player timeline and preview progress bars. Enabled by default.
- **Blur previews** - applies a strong blur to video thumbnails/previews. Disabled by default.
- **Protect live streams** - when a live stream opens, immediately blurs and mutes the player, pauses it, and shows a choice: **Start from beginning** (earliest DVR point) or **Continue live** (jump to the live edge). Live chat is blurred behind a **Show comments** overlay. Recordings of finished streams are not affected. Enabled by default.

## Development

Run the tests:

```bash
npm test
```

Tests cover setting defaults, legacy key compatibility, content script selectors, the MV3 manifest, toolbar icon state, popup behavior, and release packaging.

## Chrome Web Store Preparation

Build the upload package:

```bash
npm run build:release
```

The generated ZIP is written to `dist/` and contains only runtime extension files. Store listing text, permission justifications, reviewer notes, and the release checklist are in `store/`.

The public privacy policy page is `docs/privacy.md`, intended for GitHub Pages.
