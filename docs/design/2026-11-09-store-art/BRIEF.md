# Brief: premium Chrome Web Store screenshots + small promo tile — "Anti-Spoiler for YouTube™"

## Owner's words (Russian, translated)
"We need to redraw the screenshots beautifully: expensive, rich, and instantly clear what the extension can do, where,
and how. Also variants for the small promo tile. The three of you (Claude, Astra, Argon) — work hard, think, draw."

## Product (version 1.1.0, Chrome MV3, runs only on www.youtube.com)
Store name: "Anti-Spoiler for YouTube™ – Hide Video Length & Progress Bar". Audience: sports and esports fans watching
replays / VODs / long streams, where the video length or the bar position gives away the result ("4 minutes left and
1–1? there's no overtime then"). Features, in the user's order of importance:
1. Hides the video length everywhere: player time, player progress bar, duration badges on thumbnails.
2. Skip pills in the player instead of the bar: −10m −1m +1m +10m (jump without seeing the timeline).
3. Live streams (Beta): a stream opened mid-way is paused before showing the current moment — panel "Spoiler
   protection is active" with "Start from beginning" / "Continue live".
4. Comments under the video and the live chat are covered ("Show comments" / "Show chat"; chat can be closed with ×).
5. Blur previews (thumbnails + hover previews) — titles are blurred together with previews (chain link in the popup).
6. Uncover one video: the eye button in the player or Alt+Shift+V shows time for this video only; others stay safe.
7. Popup: one main switch "Protection on", per-feature toggles, 10 languages, Alt+Shift+S toggles protection.
   Runs locally: no account, no tracking, no data collected.

## Store constraints
- Screenshots: 1280×800 PNG, up to 5, no rounded outer corners or padding required by the store (our own canvas is ok).
  They are shown large on the listing and small (~ 640×400) in the carousel: headlines must read at half size.
- Small promo tile: 440×280, shown in search results and category grids at roughly 220×140 on screen — it must read at
  that size (very few words, big shapes). Cannot be localized.
- Images are English only.
- Legal: "for YouTube™" wording is fine; NO YouTube logo, no YouTube red play-button logo, no real people, no real
  thumbnails or channels. Our content is generated fictional sports (teams like "APEX FC vs NOVA UNITED — Grand Final",
  "VOLT vs CRIMSON OWLS — World Finals", "Hawks vs Titans — Game 7").
- Do not claim things the product does not do.

## Brand
Logo: `E:\vt\pet\projects\youtube-anti-spoiler-extension\icons\icon.svg` — a red capsule (#c85252) with a white play
triangle, a dark band (#222222) across the lower half with "ANTI-SPOILER" in white heavy caps. The popup is dark
(#18181b-ish) with the logo red as accent. Current store art: dark canvas, red glow, white heavy headline.

## Current set (what we are replacing)
Contact sheet of the 5 current screenshots + tile: `C:\Users\vtshk\AppData\Local\Temp\yas-store\redesign2\current-sheet.png`
(look at it). Owner's verdict: not premium enough, not instantly clear. Main-session notes: every slide is the same
layout (headline top-left + one capture); UI details are small; the "what changed" is not obvious without reading;
the tile is a plain text card; slide 1's popup still shows an old footer email (the popup now has an "About us" button).

## Material you can use (absolute file paths; in HTML use file:///C:/... URLs)
- Fresh captures of real YouTube with the extension, content swapped for fictional sports, device scale 2:
  `C:\Users\vtshk\AppData\Local\Temp\yas-store\redesign2\captures\` — see the list and element boxes below
  (rects.json: CSS-px boxes of player, popup, guard, chat, etc.; 1 CSS px = 2 image px).
- Generated sports art (no people's real faces/brands), large: `C:\Users\vtshk\AppData\Local\Temp\yas-store\gen\img\*.png`
  (football, basketball, esports, racing, hockey, tennis, rugby, volleyball, baseball, cycling, fighting, strategy,
  frame = a football broadcast frame, liveframe = an esports arena frame); thumbnails `gen\img\thumbs\*.jpg`.
- Logo SVG above (inline it).
- You may also draw UI elements in HTML/CSS yourself (e.g. a big crisp player control bar with the pills, the popup
  card) if that reads better than a cropped capture — but keep it truthful to the real UI (pill labels, texts).
- Fonts: rendering is offline in Chrome on Windows 11 — only locally installed fonts: Segoe UI, Segoe UI Variable
  Display, Bahnschrift (incl. condensed via font-stretch), Arial Black, Georgia, Consolas, Impact. No web fonts.

## What to return (in your reply; you cannot write files)
1. Art direction, ≤ 15 lines: concept name, idea, palette (hex), type, how "premium" is achieved, how each slide makes
   the "what / where / how" obvious in 2 seconds.
2. Storyboard for 5 screenshots: headline (≤ 6 words), sub-line (≤ 12 words), composition in 2–3 lines each.
3. Complete self-contained HTML for **screenshot 1** (1280×800: `<body>` exactly 1280×800, overflow hidden).
4. Complete self-contained HTML for **3 different small-tile variants** (440×280 each), clearly different ideas.
Each HTML in its own fenced ```html block preceded by a line `FILE: <name>.html` (names: `shot1.html`,
`tile-a.html`, `tile-b.html`, `tile-c.html`). Inline CSS/SVG only; images only via the file:/// paths above.
Keep your text answer outside the code short. Do not edit any files.

## Capture list (redesign2\captures, device scale 2; boxes in CSS px from rects.json — read rects.json for all of them)
Overview of four captures: `C:\Users\vtshk\AppData\Local\Temp\yas-store\redesign2\captures-sheet.png`.
- `watch-protected.png` 2560×1600 (= 1280×800 CSS): watch page, player at x16 y68 w873 h491; control bar x28 y500
  w849 h59; pills (−10m −1m +1m +10m) x258 y511 w200 h40; eye x470 y511; no time, no progress bar; related
  column x905 y56 w360; "Comments hidden / Show comments" cover at x372 y794 (below the fold, partly cut).
- `watch-revealed.png`: same page after the eye — time "21:00 / 34:03"-style and the red bar back, pills gone.
- `live.png`: live stream, guard panel "Spoiler protection is active — Start from beginning / Continue live" centred
  on the player (player x16 y68 w873 h491); live chat column covered: "Comments hidden / Show comments" panel and a
  × close button (chat x905 y68 w344 h596).
- `grid-time.png`, `grid-previews.png`, `grid-titles.png`: channel video grid (grid starts x124 y104; first card
  x124 y128 w347 h273): 1) no duration badges, 2) thumbnails blurred, 3) thumbnails + titles blurred.
- `popup-dark.png`, `popup-light.png`: 704×824 (= 352×412 CSS): the popup: header "Anti-Spoiler", EN language
  button, theme button; "PROTECTION ON — Video time and duration are hidden" switch; toggles "Hide progress bar",
  "Blur previews", "Protect live streams BETA"; "Advanced settings"; footer "About us".
- IMPORTANT: every page capture shows YouTube's masthead with the YouTube logo at the top (y < 56 CSS px) — crop it
  out; it must not appear in our art.
