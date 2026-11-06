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

## Title blur is not linked to preview blur yet (option G)

Recorded 2026-11-06. Owner: «давай потом это сделаем. запиши как техдолг».

**What happens.** "Blur video titles" (Advanced) and "Blur previews" are two separate switches. The owner wants titles
to follow preview blur by default, with a way to set them separately.

**Approved design** (owner, «Да, G»; full text in `docs/design/2026-11-06-redesign/STATE.md`, "Owner's variant G";
mockup `board-titles-link.png`):
- new setting `blurTitlesLinked`, default `true`; titles are blurred when
  `blurTitlesLinked ? hideVideoPreviews : hideVideoTitles`;
- a chain `<button aria-pressed>` next to the titles switch with a tooltip (`title` + `aria-label`); while linked the
  switch is disabled and shows the previews value; the "Blur previews" note says "…and titles" while linked;
- migration: a stored `hideVideoTitles: true` becomes unlinked and on; everyone else starts linked.

**Where to look.** `src/shared/settings.js` (defaults, `normalizeSettings`), `src/content/content.js` `applySettings`
(~1331: classes from settings) and the startup cache `readStartupSettings` / `saveStartupSettings` (~1415–1451, must
store the effective titles value), `popup/popup.html` Advanced (~100–111), `popup/popup.js`, `popup/popup.css`, 10
locales, tests. After it ships: store screenshot 4 ("+ Blur titles" as a separate step) and the texts that say title
blur is off by default need an update.

**Done when.** Unit tests for the effective value and the migration; live check in Chrome: linked/unlinked, previews
on/off, protection off, settings off do not break YouTube.
