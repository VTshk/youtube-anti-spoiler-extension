# Audit 2026-11-09 — verified results

Three read-only audits ran in parallel: Astra (covers and blur, `content.js`), Argon (live guard, bridge, skip
buttons) and Codex Sol (popup, settings, docs). Raw reports: `%TEMP%\yas-store\audit\` (`codex-C/round1.out.md`;
Astra and Argon replied inline). The main session checked every finding in code, and the visible ones in Chrome
(muted, profile `cap/profile-main`, script `%TEMP%\yas-store\cap\audit-live.mjs`, video `rH-XexiOBCA`).

## Confirmed — proposed fixes
| # | What | How verified | Fix |
|---|---|---|---|
| 1 | Comments cover under a video also covers YouTube's "Sort by" menu (same class as the chat close button) | Chrome: elementFromPoint at the sort menu hits our cover, widths 1180 and 1320 | Cover only the comment list, as the comments panel cover already does |
| 2 | Keyboard reaches covered comments: 136 focusable links and buttons under the cover | Chrome: count of visible focusable elements in `ytd-comments #contents` while covered | `inert` on the covered list (and the covered chat iframe), removed on reveal / setting off |
| 3 | Skip buttons stay visible during ads; +1m/+10m would seek the ad | Code: `content.js:520` selector has no `.ad-showing` exclusion. Not live (RU region gets no ads) | Add `:not(.ad-showing)` to the visibility selector |
| 4 | README FAQ tells to turn on "Blur video titles", which is linked to previews and disabled by default | Code: `README.md:130` vs `popup.js:121` | Rewrite the FAQ answer |
| 5 | ~90 lines of seek verification in the bridge whose result event nobody listens to | Code: `LIVE_START_SEEK_RESULT_EVENT` dispatched in `live-player-bridge.js:508`, no listener in the controller | Remove it and its tests |

Items 3–5 fixed on 2026-11-09 (uncommitted): skip buttons hide under `#movie_player.ad-showing`; README and
landing FAQ rewritten; unused seek verification removed from the bridge (≈120 lines, tests updated). 353/353 tests.

## NEW, confirmed live — live guard covers YouTube's player error (likely the owner's "guard on a finished stream")
- Repro 2026-11-09 evening: the rig's network switched to region CH; YouTube answers every video with the player
  message "Sign in to confirm you're not a bot". The player never loads a video (`getVideoData().video_id` null,
  `video.duration` NaN, `getPlayerState()` 3, no `.ytp-error` element). After ~9 s (LIVE_START_TIMEOUT_MS path,
  `live-start-controller.js` ~1597-1606, `statusUnknown`) our guard shows "Couldn't tell whether this is a live
  stream" with Start from beginning (disabled, "Checking whether the stream can be rewound…") and Play, on top of
  YouTube's message; before that the dark cover hides it. Happens on regular videos (`Os7Djuf1wjc`) and finished
  streams (`rH-XexiOBCA`) alike, on HEAD too (not caused by today's edits). Screenshot:
  `%TEMP%\yas-store\cap\guard-on-vod.png`. Probe scripts: `guard-on-vod.mjs`, `error-probe.mjs`.
- Marker: `player.getPlayerResponse().playabilityStatus.status` = `"LOGIN_REQUIRED"` (normal videos: `"OK"`).
  Other non-OK statuses: `UNPLAYABLE`, `ERROR`, `AGE_CHECK_REQUIRED`, `LIVE_STREAM_OFFLINE` (upcoming stream).
- Proposed fix: the bridge reports the current video's playability (only when the response names the current
  video); the controller does not engage the guard, and removes the cover, while the status is not `OK`. Unit tests
  for each status; live check needs a network where YouTube shows the bot wall or an unavailable/age-restricted
  video, plus the usual live stream / finished stream / settings-off cells. Also the smoke video `Os7Djuf1wjc` shows
  the wall on this network, so `smoke.mjs` "off: video keeps playing" fails for that reason.
- **Fixed 2026-11-09 (uncommitted).** Bridge `getLiveState` reports `playabilityStatus` taken from a response that
  names the current video; a response without `videoDetails` (the bot wall has none) counts only while nothing names
  a video. Controller: while the status is a string other than `OK` and the guard is not engaged, it drops the cover
  and does not engage; it keeps polling, so an upcoming stream that goes live is guarded. Tests: 5 statuses, the
  no-id error response, stale responses (bridge and controller), upcoming → live.
- Live check (muted, `cap/blocked-check.mjs`, log `cap/blocked-check.log`; then `cap/live-cells.log`):

  | Cell | Expected | Fixed build | HEAD |
  |---|---|---|---|
  | Bot wall `LOGIN_REQUIRED` (CH network): finished stream `rH-XexiOBCA`, `Os7Djuf1wjc`-class, Sky News `/live` — defaults, protection off, "Protect live streams" off | no cover, no guard at 3 s and 13 s | 9/9 none; YouTube message fully visible (screenshot `blocked-check-fixed-crop.png`) | `rH-XexiOBCA`: cover + guard at 3 s and 13 s |
  | `UNPLAYABLE` with its id (`jfKfPfyJRdk`), 3 settings | none | 3/3 none (HEAD also none: not a discriminating cell) | none |
  | Real live stream (Sky News, after the VPN switch) | guard, Start from beginning reaches the window start | PASS (window start +30 s), no page errors | — |
  | Finished stream `rH-XexiOBCA`, plays | no guard for 15 s | none in 15/15 samples | — |
  | Live stream, protection off / "Protect live streams" off | nothing of ours | none; 0 `yas-` classes with protection off | — |
  | `smoke.mjs` (Os7Djuf1wjc plays again) | 13 PASS | 13/13 PASS | — |

  The "YouTube message visible" text probe in `blocked-check.mjs` is broken (false even with nothing on top); the
  screenshot is the evidence for that column. Known edge: an in-site move from a page with a no-id error response to
  a playable live stream drops the cover until the player names the new video (then the live signal engages the
  guard); not seen live.

## NEW 2026-11-09, owner's report — guard stays after browser Back from a stream
- Report: open a stream, press Back → the dark panel "Spoiler protection is active" stays over the previous page.
- Cause: off the watch page the guard follows the player (mini-player) until the player stops naming the stream.
  After Back YouTube keeps the stream in the hidden watch page, so the bridge keeps naming it; the guard never ends,
  and the panel (mounted on `<body>`) keeps the player's last coordinates because a 0×0 player gives no new bounds.
- Repro on HEAD (muted, `cap/back-check.mjs`, in-site click from search results to Sky News live, then Back): panel
  at x 16, y 68, 888×499 and the cover class at 1, 4 and 8 s; player 0×0, no mini-player.
- Fix (uncommitted): the player counts as showing the stream only while it has a box (the existing 3 s "player gone"
  wait then ends the guard); the panel hides (`[hidden]`) while the player has no box. An instant end was tried
  first and dropped the guard when the mini-player opens (it opens from a 0×0 player) — caught live, reworked.
- Live (fixed): after Back the panel is hidden at 0.3 s and removed by 4 s; `i` (mini-player) keeps the guard on the
  400×225 mini-player at 0.3–8 s, as on HEAD. Back after a full page load ended the guard already on HEAD.
- Tests: Back hides the panel at once and ends the guard after the wait; a mini-player opening from 0×0 keeps it.
  Both fail without the fix. `npm test` 367/367.

## Plausible, not verified live
- Pre-roll ad after an in-page move to a live stream: the 10 s "unknown status" timer runs during the ad, and the
  window may then show "Couldn't tell whether this is a live stream" with Play instead of Continue live
  (`live-start-controller.js:1597-1606`). Needs ads (not available in RU).
- `/clip/<id>` pages: the tab title is not masked and comments are not covered (Astra, script harness).
- Off state: two hidden elements of ours and `data-yas-fit-layout` stay in the player, timers keep running. Chrome:
  nothing visible, YouTube time and bar work. Cleanup only.
- Popup races in millisecond windows (Codex F1–F4) and "Protection on" shown after a storage read error (F5).
- Volume slider open during a fit check may keep buttons compact until resize (Argon F7).
- Live guard over the miniplayer lags up to 1 s after scrolling (Argon F5).
- Skip buttons on >12 h streams clamp to `video.seekable` (Argon F3) — part of the TECH-DEBT long-stream item.

## Not reproduced / rejected
- Eye button disappears right after uncovering (Argon F1): Chrome at player widths 545, 685, 797, 902, 985 — the eye
  stays visible.
- Chapter thumbnails stay blurred after uncovering (Astra F5): filter `none`.
- Upcoming stream / Premiere microdata forces the guard (Argon F2): YouTube no longer sets `meta[itemprop=videoId]`
  (null in every probe), so `documentHasLiveSignal` cannot fire.
- Live guard on finished streams (owner's report): 24 runs, including a stream that ended 9 minutes earlier — never.

## Not checked
- Inline hover-preview player after uncovering the open video (Astra F4).
- Live chat header controls other than Close (chat mode, menu) stay under the cover — by design: the whole chat
  iframe is blurred.

## Regression check of a48ebc8 (2026-11-09, owner: "did these changes break anything?")
- Unit tests 367/367 on a48ebc8.
- Old vs new live comparison (muted, `cap/regress.mjs` → `regress-old.log` / `regress-new.log` / `regress-fixed.log`,
  compare with `regress-compare.mjs`): 22 scenarios on b94d45a and on the new build — watch page (pills, +1m = 60 s,
  eye, time/bar hidden, comments cover), previews on (watch, home, search: 100% thumbs, titles linked/unlinked),
  in-site move, Shorts, protection off, comments off, bar off, live stream (guard, last button, guard off, comments
  off, protection off), popup. Same everywhere; 0 page errors. The only differences (comments cover shown, a player
  on search/Shorts) were load timing: `regress-diag.mjs` gave identical results on both builds.
- Astra regression review of the diff: two real gaps, not in b94d45a, fixed:
  1. after YouTube's error message without a video id, the cover dropped for it did not come back when the player
     could play (in-site move to a stream) until a live signal — now `shielded` is kept while blocked, so the next
     tick raises the cover again;
  2. an upcoming stream that started while open could play uncovered and aloud up to 1 s (slow tick) — now a
     playback event while blocked runs the check at once.
  Tests: "an upcoming stream that starts playing is covered at once…", "the cover comes back when the player stops
  reporting an error" — both fail on a48ebc8, pass now; 369/369.
- Live after the fix: the 22 scenarios same as b94d45a; `UNPLAYABLE` video — no cover/guard in 3 settings (the
  "message visible" probe is the known broken one). Sky News `/live` currently can't be rewound — same on b94d45a,
  so Start from beginning was not re-run live; that path is unchanged since its PASS earlier today.
- Not checkable here: ads, a real bot wall (the network plays videos now), an upcoming stream going live.
