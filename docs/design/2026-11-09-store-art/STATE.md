# Store art redesign (2026-11-09) — state

Owner: «нам надо перерисовать красиво сделать скриншоты. чтобы дорого богато и сразу понятно что где и куда умеет
расширение. и еще варианты для маленького рекламного окна. потрудитесь хорошенько втроем подумайте порисуйте».

## Round 1 (done): three independent concepts, screenshot 1 + 3 small tiles each
- Board: `board-round1.png` (screenshots at carousel size, tiles at search size). Full shots: `shot1-<who>.png`.
- Sources: `<who>/*.html` (render with `%TEMP%\yas-store\redesign2\render.mjs <folder>`; images are file:/// paths
  into `%TEMP%\yas-store\redesign2\captures` and `%TEMP%\yas-store\gen\img`). Storyboards for all 5 slides:
  `astra/report.md`, `argon/report.md`; Claude's is not written yet (same 5 topics as the current set).
- Brief given to all three: `BRIEF.md`.
- Fresh captures (current build, popup with "About us"): `%TEMP%\yas-store\redesign2\captures` via `cap/cap.mjs`.
- Claude — "Broadcast": dark, sports-TV headline, loupe on the pills, numbered tags, popup. 
- Astra — "Blindside": light porcelain + cobalt, huge headline, real player, cobalt "Without → With" rail.
- Argon — "Broadcast Blackout / HUD": dark, browser frame, before/after bar rows, feature card; dense, small text.

## Round 2 (done): owner chose Claude's style — «мне нравится как клод сделал, давай на вроде этого еще несколько вариантов»
- Board: `board-round2-claude.png`; files `claude2/v1..v5.png`; generator `claude2/gen-claude2.mjs` (copy; the working
  one is `%TEMP%\yas-store
edesign2\gen-claude2.mjs`, render with `render.mjs claude2`).
- V1 round-1 shot (loupe on pills, numbered tags, popup); V2 match full-bleed + real control bar big + news ticker;
  V3 score bug "APEX vs NOVA ??:??" + legend; V4 diagonal wipe without (21:00 / 34:03 + bar) / with (pills);
  V5 giant crossed clock "1:28:14" + player with loupe.

## Round 3 (done, waiting for the owner): full set in V1 style — owner: «v1 как будто лучше»
- `final/s1..s5.png` (1280x800) + `final/tile-small.png` (440x280, Claude tile A); board `board-final-set.png`.
- s1 = round-1 Claude shot; s2 skip (control bar loupe), s3 live guard + chat cover (BETA), s4 three feed steps,
  s5 uncover one video (revealed bar loupe + related column). Generator `final/gen-final.mjs` (working copy in
  `%TEMP%\yas-store
edesign2`, render `render.mjs final`).
- Not done: replacing `store/screenshots/*` and `docs/screenshots/*`, marquee 1400x560 in this style, second look by
  Astra/Argon, commit.

## Round 4 (done): owner «почему у тебя повторяется некоторые? сделайте нормально каждый скрин. втроем пройдитесь потом по каждому и чтоб без косяков»
- Each slide has its own picture: s2 three different generated moments (gen/img frame, frame2, frame3) + the four
  buttons as type; s5 basketball (hoopframe) full page + time loupe. All captures recaptured in YouTube dark theme
  (`captures2`, `cap/cap.mjs` now colorScheme dark, grid-previews with titles unlinked, `swap.js` frame follows swaps).
- Reviews: Argon round 1 — 18 findings (16 accepted, 2 disputed → withdrawn in round 2), round 2 — 3 new geometry nits,
  fixed. Astra round 1 — 11 (all accepted), round 2 — 10 fixed, 1 partly (chat text → zoom added), 2 new: outline
  fixed; tile clock "suggests hiding the in-video clock" → tile B (crossed video length) made, owner chooses.
- Files: `final/s1..s5.png`, `final/tile-small.png` (A, score bug), `final/tile-small-b.png` (B, crossed length),
  board `board-final-set.png`, generator `final/gen-final.mjs`.

## Round 5 (done, 2026-11-10): owner «зачем нам отдельный скрин для перемотки? как будто он не нужен» → «можно слайд с настройками»
- Skip slide dropped. Order: s1 overview (compact master-switch card + "Hidden for you" list), s2 live, s3 feeds,
  s4 uncover one video (basketball), s5 "Your rules. One switch." (popup with Advanced open, 10 languages in English
  names, Alt+Shift+S, No account / No tracking / No data collected). New captures: `watch-comments` (unused now),
  `popup-dark-advanced` (cap.mjs).
- Round 3 reviews: Argon — popup/"one switch" repeated s1/s5 (fixed), s4 loupe cut CC (fixed), prefers tile B.
  Astra — claims on s5 verified in code (10 locales, Alt+Shift+S, privacy.md); native language names broke
  "English only" (fixed); s1/s5 popup repetition (fixed).
- Waiting for the owner: tile A or B (both reviewers and Claude: B), then replace `store/screenshots/*` and
  `docs/screenshots/*` (README/landing reference them), commit.

## Tile round 2 (2026-11-10): owner «плитку другую надо. давай еще варианты пусть рисуют»
- Both A and B rejected. Brief `%TEMP%\yas-store
edesign2\TILE-BRIEF.md`. Nine new tiles in `tiles-round2/`
  (claude, astra, argon; html + png), board `tiles-round2/board-tiles.png` numbered 1–9.
- Known nits before final: 7 (Argon) "--:--" wraps; 9 (Argon) "START FROM 0:00" overclaims (button is
  "Start from beginning"); 7/9 show a partly played red bar although the product hides the bar.
- Waiting for the owner's pick; then fix it, replace store/docs screenshots and the tile, commit.

## Tile round 3 (2026-11-10): owner «вот 2 мне нравится. давай еще на подобие несколько сделаем»
- Owner liked round-2 tile 2 (big logo + "Hide the video length"). Seven variations in `tiles-round3/` (board.png,
  generator gen-tiles-logo.mjs): 1 original, 2 logo left + stacked words, 3 hidden dashed bar, 4 blurred match,
  5 brand-red canvas (capsule merges with the background), 6 "Hide video length & progress bar", 7 "No time spoilers".
- Waiting for the owner's pick.

## Tile round 4 (2026-11-10): owner «1 6 и 7 сохрани. и давай попробуем еще сделать 7 вариант где снизу добавить текст что скрывает длину, прогрессбар и тд»
- Kept: `tiles-chosen/tile-1`, `tile-6`, `tile-7` (png + html). New: `tile-7a` (one line "Hides video length,
  progress bar & more"), `tile-7b` (chips Video length / Progress bar / Comments), `tile-7c` (logo left, list
  No video length / No progress bar / Skip ±1 / ±10 min). Board `tiles-chosen/board-7-variants.png`.
- Generator of all logo tiles: `tiles-round3/gen-tiles-logo.mjs` (working copy `%TEMP%\yas-store
edesign2`).
- Waiting for the owner's final pick.

## Done (2026-11-10): owner picked tile 7a. Committed: store/screenshots (5 new + tile), docs/screenshots 1..5,
landing feature texts (skip buttons moved into feature 1, new feature 5 "Your rules, one switch"). Only STATE, BRIEF,
final board, 7-variants board and both generators are in git; the other drafts here stay untracked on purpose.

## Next
Owner picks a variant (and tile) from round 2. Then: all 5 screenshots + tile (+ marquee) in that direction, Astra/Argon
second look on the result, replace `store/screenshots/*` and `docs/screenshots/*`. Not committed yet.
