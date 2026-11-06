# Tech debt

Known problems we decided to fix later. Each entry: what happens, how often, evidence, where to look.

## "Start from beginning" sometimes fails on long live streams

Recorded 2026-11-06. Present since 1.0.0, not a regression of "Show spoilers for this video".

**What happens.** On a live stream with a long rewind window (about 12 hours), one of two things happens now and then:

- after **Start from beginning** the cover stays on with "Couldn't jump to the beginning" and the video does not play;
- the choice opens with "This stream can't be rewound" and only **Continue live**, although the stream can be rewound.

**How often.** Live check in Chrome 156 on Al Jazeera English (`/@aljazeeraenglish/live`, video `gCNeDWCI0vo`):

| Build | Result |
|---|---|
| 1.0.0 (258b206) | 3 of 4 played from the beginning; 1 stalled with "Couldn't jump to the beginning" |
| 21b4871 | 4 of 4 played from the beginning; in 1 more opening the guard said the stream can't be rewound |
| No extension | 2 of 2: YouTube itself plays from the start of the window |

**Clue from the failed run.** In the 1.0.0 failure the player reported the start of the rewind window about 3,600 s
(one hour) earlier than in every other run (window ~46,800 s instead of ~43,200 s). The extension jumped to that
point, the player could only reach its real start, and the "is the player really there" check never passed. So the
extension seems to trust a stale or too-wide seekable range, and the "can't be rewound" case looks like the same
range read too early.

**Where to look.** `src/content/live-start-controller.js` (rewind check and the jump to the beginning) and
`src/content/live-player-bridge.js` (the seekable range read from the player).

**Evidence.** Run logs and JSON: `%TEMP%\yas-audit2\out-start-control\` (`BASE-4.json` is the stall, `NEW-3.json` is
"can't be rewound"). The folder is temporary; the numbers above are the summary.

**Done when.** Ten openings in a row of a ~12 h stream all play from the beginning with the extension, with the
same stream checked once without it, plus a unit test for a seekable range whose start the player can't reach.

