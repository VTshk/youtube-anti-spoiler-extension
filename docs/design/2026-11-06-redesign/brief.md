# Brief: redesign of the "Anti-Spoiler for YouTube" UI (2026-11-06)

Owner's request, 2026-11-06 (translated): "Let's improve our design. Think, with Codex and Argon, about how to make it
simple, clear and at the same time beautiful. We have a logo, and I really like how it turned out. The design of the
extension itself, not so much. We need to come up with several variants. I'd also like to add support for the main
languages, about 6–10."

## Product

A Chrome MV3 extension that hides spoilers on YouTube: video time and duration, the progress bar, previews, titles,
comments, and the "current moment" of live streams. Users are sports fans, esports viewers, and people catching up on
series or streams. The main UI is the **toolbar popup**. The extension also draws a few elements **inside YouTube**
(see "In-page UI" below).

Repository root is the current directory. Files to read:
- `popup/popup.html`, `popup/popup.css`, `popup/popup.js` — the current popup (about 620 lines total);
- `icons/icon.svg` — the logo (keep it unchanged);
- `docs/design/2026-11-06-redesign/current-popup.png` — a screenshot of the current popup at 2x scale, light theme;
- `src/shared/settings.js` — settings and defaults;
- `src/content/live-start-controller.js` around lines 1290–1460 — the live-stream guard overlay (in-page);
- `src/content/content.js` around lines 660–910 — the "Comments hidden / Show comments" cover (in-page);
- `src/content/skip-buttons.js` — the skip buttons in the player bar (in-page).

## The logo (fixed, the owner likes it)

The SVG is 149×81 with a rounded rectangle (rx 30) filled `#c85252` (muted red). It has a white play triangle in the
upper half and a dark band `#222222` across the lower middle with the white text "ANTI-SPOILER" (Arial 900). The design must be built around this
logo: its palette (muted red `#c85252`, near-black `#222`, white), its rounded shape, and the "band covering the
content" metaphor (the band hides part of the play button the way the extension hides spoilers).

## The current popup and what is wrong with it

A 340 px wide popup with:
- a header: the logo and "ANTI-SPOILER FOR YOUTUBE" in bright red caps `#cc0000`, a different red from the logo;
- a white card: the large ON/OFF pill switch, "Protection is on", "Spoilers are hidden on YouTube" and
  "Shortcut: Alt+Shift+S";
- 6 settings as rows with a bold title, a gray note, and a red checkbox on the right:
  1. Hide progress bar (`hidePlayerProgressBar`, default on)
  2. Skip buttons (`showSkipButtons`, default on), which only matters while the progress bar is hidden
  3. Blur previews (`hideVideoPreviews`, default off)
  4. Hide video titles (`hideVideoTitles`, default off)
  5. Hide comments (`hideComments`, default on)
  6. Protect live streams (`startLiveFromBeginning`, default on)
- Video time and duration are always hidden while protection is on (no toggle).
- When protection is off, the settings list is hidden.
- A status line for save errors: "Could not save settings", and "Could not load settings — close and reopen the popup",
  which also disables the controls.

Owner's verdict: "not very good". Our own observations:
- The popup is long (about 720 px at 1x). It is visually flat and looks like a generic settings form.
- The header red does not match the logo red.
- Nothing ties the UI to the logo's visual idea.
- There is no hierarchy or grouping between the settings.
- The dependency "Skip buttons need a hidden progress bar" is not shown.

## Constraints (hard)

- A Chrome extension popup: width 320–380 px, and the height should ideally fit without scrolling on a 768 px screen.
  It opens on the toolbar click and closes on blur.
- No build step, no frameworks, no web fonts loaded from the network. The UI uses plain HTML, CSS and a small amount of
  vanilla JS. System fonts only, or a font bundled in the package if truly justified (it adds size, so say so).
- Simple code: a developer without an AI agent must understand and edit it. Avoid clever CSS tricks and avoid deep
  component layers.
- Accessible:
  - real `<input type="checkbox">` or `role="switch"` controls with labels;
  - visible keyboard focus;
  - text contrast at WCAG AA or better;
  - state never shown by color alone.
- Light and dark theme through `prefers-color-scheme`. Chrome popups follow the OS theme.
- **i18n is coming** for about 6–10 languages: English, Russian, Spanish, Portuguese (Brazil), German, French,
  Japanese, Korean, Chinese (Simplified), Turkish and possibly Ukrainian or Hindi. Strings can be 30–50% longer in
  German or Russian, and CJK needs its own line height. The layout must not depend on English text length.
  Right-to-left languages are out of scope for now.
- Existing behaviour stays:
  - the master on/off switch;
  - 6 setting toggles;
  - the shortcut note (it can be changed in `chrome://extensions/shortcuts`);
  - the error status;
  - settings hidden or disabled while protection is off.
- Settings keys and storage do not change.

## In-page UI (secondary scope: should match the new style)

- **Live stream guard:** a dark overlay over the player with a panel. The panel has the title "Spoiler protection is
  active", the text "This live stream was paused before showing the current moment." and the buttons "Start from
  beginning" and "Continue live". Variants of the panel show "Checking whether the stream can be rewound…", "This stream
  can't be rewound", and "Ad — the choice will appear after it" with "Skip ad".
- **Comments cover:** the comments are blurred, with a cover that says "Comments hidden" and a "Show comments" button.
- **Skip buttons:** 6 small buttons (−10m −1m −10s +10s +1m +10m) in YouTube's player control bar. They must look
  native to YouTube's player.

These must stay readable on top of YouTube (light and dark YouTube themes) and must not look like an ad or an error.

## What we want from you

Propose **3 clearly different design directions** for the popup and show how each extends to the in-page UI. For each
direction give:
1. **Name and idea**, in one or two sentences, and how it uses the logo (palette, shape, the "band" metaphor).
2. **Layout** as an ASCII wireframe of the popup in the "protection on" state, plus a short note on the "off" state.
3. **Exact tokens**: background, surface, text, muted text, accent, border, focus colours for light AND dark theme
   (hex, with the contrast ratio of main text and muted text on their background); font sizes and weights; spacing;
   radii; sizes of the switch, checkbox or toggle and the rows. Give enough numbers that someone can build it without
   guessing.
4. **Grouping and wording** of the 6 settings in English: shorter, clearer titles and notes. Say whether to group, for
   example "Player", "Feed", "Live", and how to show that "Skip buttons" depends on the hidden progress bar.
5. **Header**: what to do with the product name and the logo.
6. **In-page UI**: how the live guard panel and the comments cover look in this direction (a short description with
   tokens).
7. **Trade-offs**: what is better or worse than the other directions, the risk with long translated strings, and the
   estimated popup height at 1x.

Then:
- give **5–10 concrete criticisms of the current popup**, each with the place and what to do instead;
- pick **one direction you recommend** and say why, in no more than 5 lines.

Do not write code files. Do not edit anything. Keep the whole answer under about 300 lines. Write the answer in English.
