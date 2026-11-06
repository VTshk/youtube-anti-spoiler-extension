# Fix: "Start from beginning" never finishes on streams with a long rewind window (2026-11-06)

The working tree is `E:\vt\pet\projects\youtube-anti-spoiler-extension\.claude\worktrees\project-overview-62c71a`. It
holds uncommitted work:
- R3, the popup and skip buttons, per `docs/superpowers/plans/2026-11-06-r3-owner-feedback.md`;
- the collapsed-player fix. `content.js` no longer forces `position: relative` on `#player-container`, and
  `findLiveGuardBoundsTarget` skips 0×0 elements.

`npm test` is 262/262. The simplicity rules and "Do not" list of `docs/superpowers/plans/2026-11-06-redesign-i18n.md`
(§1, §6) apply: no git commands that change state, and do not delete `.playwright-mcp/`.

## The bug, found live in real Chrome 156 on 2026-11-06

On Sky News (`umLWFz4izTM`), whose rewind window is about 12 hours (≈ 43 195 s), "Start from beginning" made the
player jump. The player's progress state then showed current − seekableStart = 22 s. But the guard never lifted: it
stayed paused and obscured with both buttons enabled again, which means the 3 s confirm timeout reported the jump as
failed.

On CS2 streams with shorter windows, the same action worked: the panel lifted in about 1 s.

Evidence: `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\out-r3fix\A.log` and
`A-umLWFz4izTM-A2-after-start.png`.

The hypothesis, which you must check in the code and live:
- `startFromBeginning` (`src/content/live-start-controller.js` around 1103–1199) takes
  `startTime = getEarliestSeekableStart(video)`, the `<video>.seekable` start, which was 0.
- It confirms with `reachedStart`: `|media.currentTime − startTime| ≤ tolerance`.
- After YouTube's player handled the jump (`requestMainWorldPlayerSeek` → bridge → `player.seekTo`), the media time was
  about 3617. The player clamps to its OWN window start (`getProgressState().seekableStart`), not to the media's
  `seekable.start(0)`, so the media check never passes.

## What to do

1. Confirm the cause:
   - Read the code: `getEarliestSeekableStart`, `requestMainWorldPlayerSeek`, the bridge's seek handler in
     `src/content/live-player-bridge.js`, and what the bridge reports in its live state (`canRewind`; is
     `seekableStart` or the progress reported?).
   - Reproduce on a live stream with a long window. Sky News `umLWFz4izTM` if it is live, or another 24/7 news stream.
   - Record `video.seekable` ranges, `getProgressState()` (seekableStart, seekableEnd, current) and `video.currentTime`
     before and after the jump.
2. Fix it in the simplest correct way. Two possible directions:
   - **(a)** target and confirm against the player's own window: get the player's seekable start from the bridge, which
     already reads `getProgressState()`, and confirm when the player's progress current − seekableStart ≤ tolerance;
   - **(b)** take the target from the bridge, and confirm when the media is no longer seeking, has a frame loaded, and
     has moved to the position the player chose.
   - Whatever you choose, it must keep the invariant: **never reveal the live moment by accident**. A jump that lands
     at the live edge must never count as "reached the start".
   - Keep the existing handling of YouTube swapping the `<video>` element during the jump.
3. Unit tests:
   - a long-window case where the media seekable start (0) differs from the player's window start, and the guard
     lifts;
   - a case where the jump lands at the live edge, and the guard does not lift.
   - The existing tests stay green.
4. Live acceptance in real Google Chrome, headful, 1366×768, with the extension loaded through CDP
   `Extensions.loadUnpacked`, since Chrome 156 ignores `--load-extension`.
   - The rig is `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\`. The script `r3fix-accept.mjs` has phases `A`, `B`,
     `C`, `D`, and its header shows usage.
   - Copy the working tree (`manifest.json src popup icons _locales`) into `ext-r3fix` again before running. The
     profile is `profile-r3fix-chrome`.
   - Run:
     - phase **A** on: the long-window stream, 2 CS2 streams (search `cs2 live`), and one more news stream. Use both
       an in-site click and a direct URL. Check "Start from beginning", "Continue live", reopening the stream, and the
       chat cover reveal.
     - phase **B**: every setting OFF one at a time, plus the extension fully off. YouTube must work normally: live
       streams play with sound, no overlay, normal player size, bar and comments visible, no skip buttons when the bar
       is visible, real tab title.
     - phase **D**: a live stream with rewinding turned off, if one is live; otherwise "not available".
     - page and extension errors: 0.
   - Restore the defaults from `src/shared/settings.js` and remove `uiLanguage` at the end.
5. Report: write `docs/research/2026-11-06/live-guard-long-window-report.md` with:
   - the cause and its evidence;
   - the fix;
   - the test counts before and after;
   - the full acceptance matrix (cell, expected, actual, evidence);
   - a "Not checked" section.
   - If you cannot write that file, put the matrix in your final message.

If your context passes about 250k tokens, finish the current step, report what is done and what remains, and stop.
