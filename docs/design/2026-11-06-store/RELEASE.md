# Release status (updated 2026-11-09)

Start here in a new session. Worktree `.claude/worktrees/project-overview-62c71a`, branch
`claude/project-overview-62c71a`, fast-forwarded to `main` b94d45a (includes G, the title-blur link).

## 1.0.0
- Uploaded to the Chrome Web Store from build 9c5cc25 (ZIP with "/" entries); the owner submitted it for review.
- `main` b94d45a is pushed; GitHub Pages works (privacy URL
  https://vtshk.github.io/youtube-anti-spoiler-extension/privacy/).
- Do not re-upload `dist/` from main: it already contains G (that is 1.1.0).

## Committed as a48ebc8 + regression fixes on this branch (not pushed, not merged into main)
- Popup footer: the email is gone; an "About us" button opens a bottom sheet (Argon's editorial design with the header
  of his centred design): thank-you headline, one sentence, Contact block, email link + copy button. 10 languages;
  "Anti‑Spoiler" in the thanks uses a non-breaking hyphen. Files: `popup/popup.html|css|js`, `_locales/*`.
  Replaced 2026-11-10 (owner, variant B4, `docs/design/2026-11-10-about/STATE.md`): the footer shows the version on the
  left and "About & feedback" on the right; About is its own screen in place of the settings with Back, no sheet.
- Live chat cover: a close (×) button in YouTube's own close position, presses YouTube's close (`#chatframe`
  → `#close-button button`, fallback `#show-hide-button button`); the chat stays covered. `src/content/content.js`.
- Tests: `tests/popup.test.js`, `tests/content.test.js` — 353/353 pass at that point (367 with the live guard fixes below). README updated.
- Live checks in Chrome (muted): `%TEMP%\yas-store\cap\about-chat-check.mjs` — 16/16.
- Live guard fixes (2026-11-09), details and live tables in `docs/design/2026-11-09-audit/AUDIT.md`:
  - no cover or guard over YouTube's own player message (`playabilityStatus` not `OK`: bot wall, unavailable, age
    check, upcoming stream) — `live-player-bridge.js`, `live-start-controller.js`;
  - browser Back from a stream no longer leaves the panel and cover over the previous page; the mini-player still
    keeps the guard — `live-start-controller.js`, `content.js` (`[hidden]` rule).
  - Tests 367/367 (14 new). Live cells in muted Chrome all as expected; logs `cap/blocked-check.log`,
    `cap/live-cells.log`, `cap/back-cells.log` (HEAD repro), `cap/back-cells-v2.log` (fixed).

## Regression fixes on top of a48ebc8 (committed, not pushed)
- Regression check of a48ebc8 (owner asked "did we break anything?"): Astra found two live-guard gaps that
  b94d45a did not have — both fixed in `live-start-controller.js`, 2 new tests (369/369; both fail on a48ebc8).
  Details and the old-vs-new live comparison: `docs/design/2026-11-09-audit/AUDIT.md`, section "Regression check".

## Open items
0. Done 2026-11-09 (a48ebc8): guard over YouTube's player error, and guard left after Back — see above.
1. Audit results: `docs/design/2026-11-09-audit/AUDIT.md`. Owner (2026-11-09): items 1–2 are too minor, skip them.
   Items 3–5 are fixed (a48ebc8): skip buttons hide during ads, FAQ rewritten (README + landing), unused seek
   verification removed from the bridge. The owner sees ads in their own browser. Rig network: region CH with the
   bot wall in the evening of 2026-11-09; the owner then switched the VPN — videos play again (`smoke.mjs` 13/13),
   and the owner says there will be no ads on it, so ad cells still cannot be checked here.
2. Owner's report "live guard on a finished stream": not reproduced in 24 runs; most likely the bot-wall bug (fixed,
   see above: on HEAD the guard showed over the wall on finished streams). Owner will watch. If it repeats: in
   the YouTube tab console `localStorage.YAS_DEBUG = "1"`, then send the `[YAS]` lines and the video link.
3. 1.1.0 after 1.0.0 is approved (owner 2026-11-10: 1.1.0, not 1.0.1 — new features, not only fixes): bump version, live smoke, fix texts saying title blur is off by default, build the
   ZIP, upload the new images. Screenshots and the small tile are DONE (2026-11-10): `store/screenshots/`
   1-watch-without-spoilers, 2-live-from-start, 3-clean-feeds, 4-uncover-one-video, 5-your-settings,
   tile-small-440x280 (owner's pick 7a); landing `docs/screenshots/1..5.png` + feature texts. The marquee 1400×560 is
   still the old style. Details: `docs/design/2026-11-09-store-art/STATE.md`.
4. Small promo tile: done (see 3).

## Rules learned this session
- Every Chrome run must be muted (`--mute-audio`); memory `mute-browser-runs`.
- Scripts live in `%TEMP%\yas-store\cap\` (smoke, about-chat-check, ended-stream-check, url-guard-check,
  recent-ended-probe, audit-live, ad-probe, render-variants).
