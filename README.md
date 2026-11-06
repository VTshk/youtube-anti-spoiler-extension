# Anti-Spoiler for YouTube

Chrome Extension (Manifest V3) that hides YouTube elements that can spoil sports match results:

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/ofplbhckbbeohimppkfbcfjagcheiaia).

- time in previews, lists, search results, recommendations, chapters, transcripts, and the player;
- the player progress bar, with skip buttons in its place;
- optional video preview blur (including end cards, the post-video suggestion wall, the autoplay "Up next" screen, and the frames shown when hovering the timeline), with the "Most replayed" graph hidden;
- optional video title blur in lists, recommendations, end cards, above the open video, the browser tab, and the system media controls;
- comments under videos, in the comments panel, on Shorts, and live chat, behind a **Show comments** button;
- the live edge of live streams, behind a **Start from beginning** / **Continue live** choice.

One video can be uncovered at a time with **Show spoilers for this video** (the eye button in the player or **Alt+Shift+V**); other videos stay protected.

Settings are stored in `chrome.storage.sync`, so they survive browser restarts and sync with the Chrome profile when sync is enabled.

The popup and the in-page buttons are available in 10 languages: English, Russian, Spanish, Portuguese (Brazil), German, French, Japanese, Korean, Indonesian, and Turkish.

Requires Chrome 111 or newer (the live-stream guard runs a MAIN-world content script).

This extension is not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Project Structure

```text
.
|-- manifest.json
|-- _locales/
|   `-- <language>/messages.json
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
|   |   |-- reveal-button.js
|   |   `-- skip-buttons.js
|   `-- shared/
|       |-- i18n.js
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

The popup opens with a red-capped card showing **Protection on** or **Protection off**. Clicking the card is the main switch: it fully enables or disables the extension without changing the other settings, which are hidden while protection is off. The keyboard shortcut **Alt+Shift+S** does the same; change it at `chrome://extensions/shortcuts`.

The card's red cap also holds two quick buttons:

- the language chip (for example `EN`) - picks the language of the popup and the in-page buttons. It starts with the browser's language; choosing the browser's language again removes the override;
- the theme button - cycles the popup theme: automatic (follows the system), light, dark. The in-page panels on YouTube always stay dark.

Time hiding is always active while protection is on. The main settings:

- **Hide progress bar** - hides the player timeline and preview progress bars. While the timeline is hidden, the player controls show `−10m −1m −10s +10s +1m +10m` skip buttons; they never show where the video ends up. They are not shown on live streams where the player does not allow seeking (the streamer turned rewinding off). There is no separate switch for the skip buttons. Enabled by default.
- **Blur previews** - applies a strong blur to video thumbnails/previews, end screens, and the storyboard frames shown when hovering a visible timeline; hides the "Most replayed" graph above a visible timeline; removes the video's artwork from Chrome's media controls and the system media overlay. Disabled by default.
- **Protect live streams** - see below. Enabled by default.

Under **Advanced settings**:

- **Blur video titles** - blurs titles in lists, recommendations, and end cards, and chapter names in the timeline tooltip and in the player bar; blurs the title of the open video and the line under it (views, "Streamed X ago", the upload date), and the text of its description, which often repeats the title (the **more** / **Show less** buttons stay readable); removes the browser's own title tooltip on hover; shows `YouTube` as the tab title on video pages; shows `YouTube video` as the title in Chrome's media controls and the system media overlay. Disabled by default.
- **Hide comments** - blurs comments under a video, in the comments panel, and on Shorts behind a **Show comments** button; the panel's title, sort menu, and Close button stay usable. The choice counts for the current video or Short only. Enabled by default.

At the bottom of the popup is a contact line with the support email.

While protection is on, the extension does not pass the playback position to Chrome's media controls. Settings switched mid-video reach the media controls right away. Chrome may still show a position it reads from the video element itself; this cannot be turned off from an extension.

### Show spoilers for this video

To watch one video with nothing hidden - say, a match whose result you already know - uncover it with either of these:

- the eye button in the player controls, after the skip buttons;
- the keyboard shortcut **Alt+Shift+V**; change it at `chrome://extensions/shortcuts`.

While a live stream shows the **Start from beginning** / **Continue live** choice, the choice covers the player controls, so use the shortcut.

For the open video this shows the player time, the timeline with its chapters (the skip buttons give way to it), the time, frames, and chapter names in the timeline preview, the "Most replayed" graph, the title in the player and above the video, the line under it, the description, Key moments and the chapter list, transcript timestamps, the comments (also in the comments panel and on Shorts) and live chat, the browser tab title, and the title, artwork, and position in Chrome's media controls. A live stream gets no **Start from beginning** / **Continue live** choice and plays from where it is once you press play.

Everything about other videos stays protected: thumbnails, durations, and titles on the home page, in search, and in recommendations, end cards, the post-video suggestion wall, and the autoplay "Up next" screen. Time links in the description and comments (for example `1:23:45`) stay hidden too: a link does not say which video it opens, and it may point to another match.

The same button or shortcut hides the video again (**Hide spoilers again**); its comments and live chat are covered again unless you had opened them with **Show comments** yourself, and a live stream asks again how to start, even if you had already chosen **Start from beginning** or **Continue live**. The video stays uncovered until you open another video or a page without a video. Reloading the page keeps it uncovered; leaving YouTube and coming back covers it again. While protection is off, the button is hidden and the shortcut does nothing.

### Live streams

When a live stream opens, the player is blacked out and muted right away, before anything of the stream is shown. While the player loads the stream's rewind window, the stream keeps loading behind the cover. Then the extension asks:

- **Start from beginning** - jumps to the earliest point the stream can be rewound to and plays from there; the cover lifts only once the player is really there.
- **Continue live** - goes to the live edge.

If the extension can't tell whether the video is live, it offers **Start from beginning** and **Play** (resume where the video is).

If the streamer turned rewinding off, the extension says the stream can't be rewound and offers only **Continue live**; the skip buttons are not shown on such a stream. A pre-roll ad plays blurred and muted, then the choice appears. The choice holds for the current visit to the stream; opening it again asks again. Live chat is blurred behind **Show comments**; the user can open it with that button at any time, also before making the choice. Recordings of finished streams are not affected.

## FAQ

### How do I hide the video length on YouTube to avoid spoilers?

Install Anti-Spoiler for YouTube™ from the [Chrome Web Store](https://chromewebstore.google.com/detail/ofplbhckbbeohimppkfbcfjagcheiaia). Protection is on by default. Video time and duration stay hidden while protection is on, unless you uncover the current video.

### Can I skip through a replay without seeing the progress bar?

Yes. With the progress bar hidden, player buttons let you move back or forward by 1 minute or 10 minutes without displaying your position. For short steps, the player's own arrow keys still work. The buttons are unavailable on live streams that do not allow seeking.

### Does it help with esports series?

Yes. In an esports series, the length of the VOD tells you how many maps or games were played, and so the final score. A short video means a clean sweep; a long one means the series went the distance. With the video length, the progress bar and chapter times hidden, the series stays open until the last map.

### Can I blur thumbnails and titles that give away the winner?

Yes. Turn on "Blur previews" in the popup for thumbnails, previews and end screens. Under "Advanced settings", turn on "Blur video titles" for titles, including the open video and browser tab. Both settings are off by default.

### Does it hide comments and live chat?

Comments are covered by default, including under videos, in the comments panel and on Shorts. Live-stream protection also covers live chat. Use "Show comments" to reveal either.

### Can I watch a live stream on YouTube from the start without seeing the result?

The Beta live-stream guard covers and mutes the player until you choose "Start from beginning" or "Continue live". Starting from the beginning means the earliest point still available for rewinding. It cannot recover parts outside that window or rewind a stream that disables seeking.

### Can I uncover just one video and keep other videos protected?

Yes. While protection is on, click the eye button in the player or press Alt+Shift+V. The current video is uncovered while other videos stay protected. Repeat the action to cover it again. Timestamp links in descriptions and comments stay hidden.

### Which settings are enabled by default?

Protection, time hiding, "Hide progress bar", "Hide comments" and "Protect live streams" (Beta) are on by default. "Blur previews" and "Blur video titles" are off by default. Time hiding stays active whenever protection is on, except for a video you uncover.

### Does it collect my viewing history or send data to a server?

The extension has no analytics and makes no requests to external services. Protection runs locally. Settings use Chrome storage and can sync when Chrome Sync is enabled; language and theme choices stay on your device. The page's local storage keeps your two blur choices so the blur applies at once, and the tab's session storage remembers which video you uncovered until you leave it or close the tab.

### How do I turn protection on or off with the keyboard?

Alt+Shift+S toggles protection. Alt+Shift+V uncovers or covers the current video while protection is on. You can change these shortcuts at chrome://extensions/shortcuts. The protection on/off switch is also available in the extension popup.

### Which languages does the extension support?

The popup and in-page buttons support English, Russian, Spanish, Portuguese (Brazil), German, French, Japanese, Korean, Indonesian and Turkish. Choose a language in the popup.

## Development

Run the tests:

```bash
npm test
```

Tests cover setting defaults, legacy key compatibility, content script selectors, the live-stream guard and its page-world bridge, skip buttons, the comments guard, the tab title, the media session patch, "Show spoilers for this video", the MV3 manifest, the keyboard shortcuts, toolbar icon state, popup behavior, the language picker and translations, the popup theme, and release packaging.

## Chrome Web Store Preparation

Build the upload package:

```bash
npm run build:release
```

The generated ZIP is written to `dist/` and contains only runtime extension files. Store listing text (one file per language), permission justifications, reviewer notes, and the release checklist are in `store/`.

The public privacy policy page is `docs/privacy.md`, intended for GitHub Pages.

## Contact

Questions, ideas, or something broken after a YouTube update: [vtshka8@gmail.com](mailto:vtshka8@gmail.com).
