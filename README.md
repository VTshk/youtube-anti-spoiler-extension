# Anti-Spoiler for YouTube

Chrome Extension (Manifest V3) that hides YouTube elements that can spoil sports match results:

- time in previews, lists, search results, recommendations, chapters, transcripts, and the player;
- the player progress bar, with skip buttons in its place;
- optional video preview blur (including end cards, the post-video suggestion wall, the autoplay "Up next" screen, and the frames shown when hovering the timeline);
- optional video title blur in lists, recommendations, end cards, the browser tab, and the system media controls;
- comments under videos and live chat, behind a **Show comments** button;
- the live edge of live streams, behind a **Start from beginning** / **Continue live** choice.

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
|   |   |-- live-start-controller.js
|   |   `-- skip-buttons.js
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

The popup has a main **Protection is on** toggle. It fully enables or disables the extension without changing the other checkboxes. The keyboard shortcut **Alt+Shift+S** does the same; change it at `chrome://extensions/shortcuts`.

Time hiding is always active while protection is on. Available settings:

- **Hide progress bar** - hides the player timeline and preview progress bars. Enabled by default.
- **Skip buttons** - while the timeline is hidden, adds `−10m −1m −10s +10s +1m +10m` buttons to the player controls. They never show where the video ends up. Enabled by default.
- **Blur previews** - applies a strong blur to video thumbnails/previews, end screens, and the storyboard frames shown when hovering a visible timeline; removes the video's artwork from Chrome's media controls and the system media overlay. Disabled by default.
- **Hide video titles** - blurs titles in lists, recommendations, and end cards, and chapter names in the timeline tooltip; removes the browser's own title tooltip on hover; shows `YouTube` as the tab title on video pages; shows `YouTube video` as the title in Chrome's media controls and the system media overlay. The title of the open video above the description stays visible. Disabled by default.
- **Hide comments** - blurs comments under a video behind a **Show comments** button. The choice counts for the current video only. Enabled by default.
- **Protect live streams** - see below. Enabled by default.

While protection is on, the extension does not pass the playback position to Chrome's media controls. Settings switched mid-video reach the media controls right away. Chrome may still show a position it reads from the video element itself; this cannot be turned off from an extension.

### Live streams

When a live stream opens, the player is blacked out and muted right away, before anything of the stream is shown. While the player loads the stream's rewind window, the stream keeps loading behind the cover. Then the extension asks:

- **Start from beginning** - jumps to the earliest point the stream can be rewound to and plays from there; the cover lifts only once the player is really there.
- **Continue live** - goes to the live edge.

If the extension can't tell whether the video is live, it offers **Start from beginning** and **Play** (resume where the video is).

If the streamer turned rewinding off, the extension says the stream can't be rewound and offers only **Continue live**. A pre-roll ad plays blurred and muted, then the choice appears. The choice holds for the current visit to the stream; opening it again asks again. Live chat stays blurred behind **Show comments** until the choice is made and the user opens it. Recordings of finished streams are not affected.

## Development

Run the tests:

```bash
npm test
```

Tests cover setting defaults, legacy key compatibility, content script selectors, the live-stream guard and its page-world bridge, skip buttons, the comments guard, the tab title, the media session patch, the MV3 manifest, the keyboard shortcut, toolbar icon state, popup behavior, and release packaging.

## Chrome Web Store Preparation

Build the upload package:

```bash
npm run build:release
```

The generated ZIP is written to `dist/` and contains only runtime extension files. Store listing text, permission justifications, reviewer notes, and the release checklist are in `store/`.

The public privacy policy page is `docs/privacy.md`, intended for GitHub Pages.
