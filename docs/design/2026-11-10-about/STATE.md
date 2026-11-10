# "About us" placement in the popup (2026-11-10) — state

Owner: «мне не нравится как выглядит "о нас" в футере. и при выключенной защите там некрасиво появляется со скроллом.
может вообще не показывать это если выключена защита? ... как обычно это делается в интерфейсах? подумайте с астрой и
аргоном».

- Cause of the scroll: with protection off the popup is 152–192 px tall (Chrome sizes it to the content); the About
  sheet is a fixed `<dialog>` with `max-height: calc(100% - 20px)` and `overflow: auto`, so it scrolls inside.
- Astra and Argon (brief `BRIEF.md`) agree: do NOT hide About when protection is off (people turn it off when
  something breaks — that is when they want to write); the sheet must not be squeezed into the small popup.
- Options drawn on the real popup (`about-mocks.mjs`, board `board-about-options.png`):
  A (Argon): (i) chip in the header next to language/theme, footer removed, sheet kept, popup grows to 380 px.
  B (Astra): quiet left-aligned "About & feedback" link at the bottom (no line), About as its own screen with Back.
  C (Claude's combination): (i) chip in the header + About as its own screen with Back. Main-session pick.
- Owner picked B («вариант B мне нравится. думаешь какую то черточку или как то отделить не надо?»). Link styles drawn
  (`about-footer-variants.mjs`, board `board-footer-variants.png`): B1 plain, B2 short line, B3 row card with "›",
  B4 version left + link right. Main-session pick: B3 (reads as navigation to a screen; same shape as the cards).
- Owner picked B4 («а мне нравится B4», 2026-11-10). Implemented in the worktree, NOT committed:
  - footer: `v<manifest version>` left (11 px, muted, 0.7 opacity), "ⓘ About & feedback" right (12 px muted link,
    32 px tall, hover fill), no line; `.contact` is a flex row;
  - About is a `<section data-about-screen hidden>` after `<main data-popup-main>`: the link hides main and shows it,
    focus goes to the `<h1 tabindex=-1>` title; Back (chevron, left of the title) or Escape returns, focus back to the
    link. The `<dialog>`, the bottom-sheet CSS and the backdrop are gone; the screen is one card (14 px radius, surface);
  - locales: `popupAboutButton` is now "About & feedback" in 10 languages; `popupAboutClose` became `popupAboutBack`
    ("Back"); README and RELEASE.md updated.
  - Tests: `npm test` 370/370 (new: version from the manifest, swap + focus + Escape, read-only).
  - Live (real Chrome, muted, `about-live.mjs`, board `board-implemented-b4.png`): dark/light × on/off in English and
    off in ru/de/ja/tr/es — footer one line (32 px), popup 408 on / 188 off (193 ja), About 295–335 px, no scroll anywhere,
    focus title → link after Escape and after Back, labels translated.
  - Not checked: the real toolbar popup window (shots are the popup page in a 352 px tab, sized like Chrome does),
    a screen reader, whether Chrome closes the popup on Escape before the page sees it.
