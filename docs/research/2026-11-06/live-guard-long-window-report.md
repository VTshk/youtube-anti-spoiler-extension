# "Start from beginning" on long-window streams: report (2026-11-06)

Plan: `docs/superpowers/plans/2026-11-06-live-guard-long-window.md`. Real Google Chrome 156.0.8078.80, headful,
1366×768, extension loaded through CDP `Extensions.loadUnpacked`. Rig: `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\`
(below `RIG`), output `RIG\out-r3fix\`.

## Cause and evidence

The hypothesis was right, and there was a second part.

1. **Wrong target.** On a stream longer than the player's 12 h rewind window, `<video>.seekable` starts at 0, but the
   player seeks only to its own window start. Sky News `umLWFz4izTM`, before the fix (`RIG\out-r3fix\probe-umLWFz4izTM-before-fix.log`):
   - before the click: media `currentTime` 46789.8, `seekable` [0, 50389.8];
   - `getProgressState()` at the same moment: current 1528171.8, seekableStart 1484992.2, seekableEnd 1528177.2.
     The player's times are `<video>` time + 1481382, so the window starts at `<video>` 3610;
   - after the click: the content script set `currentTime = 0` (media `seekable.start(0)`). The player moved the media to
     3606.8 (player 1484988.8, 3.4 s before its window start), then `seeked` and `canplay` fired with readyState 4;
   - the confirm check `|3606.8 − 0| ≤ 5` never passed. At 3 s the guard reported "Не удалось перейти к началу." and
     both buttons came back. That matches the earlier A2 FAIL (`RIG\out-r3fix-prev\A-before-fix.log`).
   - CS2 streams work because their window start is media 0 (player current = media time; offset 0).
2. **Too tight a range.** After the target was corrected, the player still sometimes put the media later than its
   window start. Over 20 settled jumps on Sky News and France 24 (`HvZt-nh9sGg`, also a 12 h window), it landed
   between −4.8 s and +2.2 s around the window start, or at +17 s to +23.1 s. With the ±5 s check, those late landings
   failed safe ("Couldn't jump", guard kept). Logs: `RIG\out-r3fix\landing-tol5.log`, `landing-fixed.log`,
   `RIG\out-r3fix-prev\A-fix1-tol5.log` (A2 +17, +18, A2-url +18 failed on that intermediate build).
3. The player moves its window start in steps of about 10 s. The live-state snapshot from the last tick was already
   5 s stale at the click (3605 against 3610, `probe-umLWFz4izTM-after-fix.log`), so the click asks for a fresh state.

## Fix

- `src/content/live-player-bridge.js`: the live-state reply gets `rewindStart`, where the player's rewind window begins
  in `<video>` seconds: `video.currentTime − (progress.current − progress.seekableStart)`. It is `null` while the
  `<video>` is seeking (the player then reports the target, not the shown position). It is reported only when the player
  holds the reported video, like `canRewind`.
- `src/content/live-start-controller.js`:
  - `startFromBeginning` first asks the bridge for a fresh state. The answer is synchronous, so the target and the
    bridge's own `seekTo(seekableStart)` read the same window;
  - the new `getJumpStartTime` uses `rewindStart` for the guarded video, and otherwise falls back to
    `<video>.seekable.start(0)` (the old behavior);
  - `reachedStart` now accepts from 10 s before to 30 s after the target, not ±5 s. Constants:
    `LIVE_START_SEEK_CONFIRM_BEFORE_START_SECONDS = 10` and `LIVE_START_SEEK_CONFIRM_AFTER_START_SECONDS = 30`.
- Unchanged: confirmation is still on the media element (`!seeking`, `readyState ≥ 2`, one more frame or the 500 ms
  fallback), the 3 s timeout, and the handling of a swapped `<video>`.
- Invariant: the live moment is a whole rewind window after the start (hours on these streams), so a landing at the
  live edge never passes. The unit test and the live A2 checks below confirm this. A landing past +30 s fails safe.

## Tests

`npm test`: **262/262 before, 267/267 after.** New tests:
- `tests/live-player-bridge.test.js`:
  - "reports where the rewind window starts in <video> seconds" (Sky numbers: 3610);
  - "does not report the rewind window start while the <video> is seeking" (null).
- `tests/content.test.js`:
  - "jumps to the player's rewind window start on a long-window stream": media seekable 0, target 3610, lands at 3607,
    the guard lifts;
  - "accepts a long-window jump that the player lands a little after its window start": lands at 3627, lifts;
  - "does not count a jump that lands at the live edge as reaching the start": lands at 46790, the guard holds, then
    "Couldn't jump to the beginning.", nothing recorded.

Existing tests were changed only to add the new field: `rewindStart: null` in 5 exact-match bridge assertions, and
forwarding of `rewindStart` in the `answerLiveStateRequests` helper.

## Acceptance matrix (final build)

Logs are in `RIG\out-r3fix\`: `A.log`, `B.log`, `B5C.log`, `B-control-noext.log`, `C.log`, `D.log`; screenshots are next
to them.

Streams:
- `umLWFz4izTM` Sky News (12 h window on a 14 h stream; chat turned off by the channel);
- `IUZyQSMDKK8` and `x-gF-YfdPH8`, CS2 IEM Beijing (windows about 4.2–4.3 h);
- `HvZt-nh9sGg` France 24 (12 h window).

### Phase A — live streams

| Cell | Expected | Sky | CS2 IUZy | CS2 x-gF | France 24 |
|---|---|---|---|---|---|
| A1-click | panel ≤ 5 s, video opacity 0 | PASS 304 ms | PASS 563 ms | PASS 270 ms | PASS 268 ms |
| A1-url | same, by direct URL | PASS 23 ms | PASS 17 ms | PASS 19 ms | PASS 10 ms |
| A2 (click) Start from beginning | panel gone, playing, opacity 1, unmuted, current − seekableStart < 180 s | PASS lift 1056 ms, +19 s | PASS 835 ms, +3 s | PASS 800 ms, +3 s | PASS 780 ms, +20 s |
| A2-url | same after a direct URL | PASS +0 s | PASS +3 s | PASS +3 s | PASS +2 s |
| A3 Continue live | panel gone, playing, unmuted, ≤ 40 s behind the live edge | PASS 0 s | PASS 0 s | PASS 0 s | PASS 0 s |
| A4 reopen by click | panel again | PASS 725 ms | PASS 735 ms | PASS 618 ms | PASS 569 ms |
| A5-blur | chat iframe blurred when the chat frame first exists, panel up | n/a (chat off) | PASS blur(18px) | PASS | PASS |
| A5-cover | chat cover with its button within 5 s, panel up | n/a | PASS 77 ms | PASS 33 ms | PASS 51 ms |
| A5-reveal | after the choice, the chat cover reveals (iframe filter none) | n/a | PASS | PASS | PASS |
| E A | page and extension errors | 0 / 0 | | | |

### Phase C — defaults, normal video (`WKartru6lyA`)

All 6 PASS: plays; time and bar hidden; skip pill visible; +1m 7→67 s; comments cover; 0 errors.

### Phase B — each setting off (live stream: France 24)

| Cell | Expected | Result |
|---|---|---|
| B1-click, start-from-beginning off | no overlay or cover, playing at the live edge, unmuted, chat not covered, normal player | PASS, 0 s behind |
| B1-url | same by URL + reload | rig FAIL only on `paused`: everything else matches (no overlay, opacity 1, unmuted, chat filter none, player 891×501, 5 s behind). YouTube's own behavior: the control with no extension loaded also stays paused after `goto` + `reload` (`B-control-noext.log`) |
| B2, bar on | bar visible, no skip buttons, click at 50 % seeks to about 50 % | PASS |
| B3, comments on | comments visible, no cover | PASS, 20 threads, filter none |
| B4, defaults: titles and previews | titles and thumbnails unblurred | PASS |
| B5-normal / B5-live, extension fully off (URL + reload) | no overlays, real title, time visible, playing | rig FAIL on `paused` (the same as the no-extension control) and, live only, on time `display: none` (YouTube hides it on live streams even with no extension; control `timeDisplay: none`). No `yas-` classes, real tab titles, player 891×501 |
| B5C-live / B5C-normal, extension fully off, opened by an in-site click | no `yas-` classes, no overlays, real title, player normal, playing with sound | all behavior met: playing (46796→46799, 7→10), unmuted, opacity 1, no classes or overlays, real title. The rig's `!skip` condition was too strict: the skip element is in the DOM with `display: none`, 0×0 (invisible; B2 uses the same criterion) |
| E B, E B5C | errors | 0 / 0 |

### Phase D — stream with rewinding off

`3MOrgUjiigE` (`allowSeeking: false`, found among 7 scanned): **D-panel PASS** (says it can't be rewound; start hidden).
**D-continue PASS** (playing, unmuted, opacity 1). 0 errors.

Summary:
- A: 34/34 PASS (+ 3 n/a for chat, Sky).
- C: 6/6 PASS.
- B: B1-click, B2, B3, B4 PASS. B1-url, B5-normal and B5-live are rig FAILs that equal YouTube's no-extension baseline
  (no autoplay after reload, no live time display). B5C-live and B5C-normal meet all behavior; the rig FAIL comes only
  from an invisible 0×0 skip element.
- D: 2/2 PASS. Errors 0 in every phase. Settings restored to `DEFAULT_SETTINGS`;
`storage.local` empty (`uiLanguage` removed).

## Rig changes (`RIG\r3fix-accept.mjs`)

- A5-cover used to check 270 ms after the click, when the chat frame did not exist yet (`chat: null` in all earlier
  FAILs). It is now two cells: A5-blur (iframe blurred when the frame first has a size) and A5-cover (overlay within 5 s).
- A chat turned off by the channel ("Chat is disabled for this live stream.", checked with the extension off) is
  recorded as n/a.
- A collapsed chat is opened with YouTube's own "Show chat" first.
- New phase `B5C`: extension fully off, videos opened by an in-site click.
- New probes: `probe-long.mjs`, `probe-landing.mjs`, `probe-chat.mjs`, `control-noext.mjs`, `find-live.mjs`.

## Not checked

- A long-window stream where YouTube swaps the `<video>` element during the jump: not seen in 20 jumps (same element
  every time). It is covered only by the existing unit tests; the new element is judged against the same target.
- Landings beyond +30 s: not seen. Such a jump fails safe ("Couldn't jump", buttons usable).
- A stream whose rewind window is shorter than about 30 s (its first half minute). There the start and the live moment
  are less than 30 s apart. No such stream was tested.
- Mini-player, ads during the jump, other UI languages: not part of this run.
- In 2 of 8 A1 snapshots (A1-url x-gF at 19 ms, A1-click France 24 at 268 ms after the panel appeared), the video read
  `muted false`. Both were at t = 0 with nothing loaded and opacity 0. All 4 A4 snapshots, taken while the panel waited
  for the user, read `muted true`. Audio at that first moment was not measured. This was not changed by this fix.
- B1-url / B5 playback after URL + reload: YouTube does not autoplay there even without the extension. It was checked
  by in-site click instead (B1-click, B5C).
