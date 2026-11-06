# R3 report: owner feedback on the popup and skip buttons (2026-11-06)

Plan: `docs/superpowers/plans/2026-11-06-r3-owner-feedback.md`. Base `12f18da`. Nothing committed.

## What changed

| Plan item | Change | Files |
|---|---|---|
| §1 Language list | No "Browser language" option. Without a stored language the list shows the browser's language (`getBrowserLanguage()`, new, wraps the existing `findShownLanguage(chrome.i18n.getUILanguage())`). Picking the browser's language removes `uiLanguage`; any other choice stores `{ code, messages }`. Latest-choice counter, rollback on failure and external-change handling kept. `"auto"` stays internal. | `src/shared/i18n.js`, `popup/popup.js`, `popup/popup.html` |
| §2 Shortcut hint | Removed from markup, script (`renderShortcut`, `chrome.commands.getAll`) and CSS (`.footer`, `kbd`). Command stays in `manifest.json` / `background.js`. | `popup/*` |
| §3 Skip setting | `showSkipButtons` removed from `DEFAULT_SETTINGS`, `normalizeSettings`, `CLASS_BY_SETTING` and the CSS show rule; added to `LEGACY_SETTING_KEYS`, so an old stored value is read, ignored and removed on the next save. Popup row and skip-dependency code removed. | `src/shared/settings.js`, `src/content/content.js`, `popup/*` |
| §4 Skip button style | One gray pill for the six buttons, measured from YouTube's own controls (below). | `src/content/content.js` (CSS) |
| §5 Popup layout | Main card: Hide progress bar, Blur previews, Protect live streams. Native `<details>` "Advanced settings", closed by default: Blur video titles, Hide comments, Language row. Group headings removed. | `popup/*` |
| Locales | Removed in all 10: `popupLanguageBrowser`, `popupShortcutLabel`, `popupShortcutNotSet`, `popupSkipButtons`, `popupSkipButtonsNote`, `popupSkipButtonsRequires`, `popupGroupPlayer`, `popupGroupAroundVideos`, `popupGroupLive`. Added `popupAdvancedSettings` with the plan's 10 texts. The `popupLanguageLabel` description no longer says "footer". 51 → 43 keys each. | `_locales/*/messages.json` |

Assumption from the main session, kept: "always" means "whenever the timeline is hidden" (protection on AND
`hidePlayerProgressBar` AND no live guard AND the player allows seeking).

## Measured YouTube controls (live, 2026-11-06, Chromium 1248, 1280×800, `dQw4w9WgXcQ`)

`RwB09qzaNdU` is now "Video unavailable — removed by the uploader", so `dQw4w9WgXcQ` was used. The player has the
`ytp-delhi-modern` classes. Logs: `out-r3/measure-before.log`, `out-r3/probe-time.log`.

| Element | Size | Background | Radius | Other |
|---|---|---|---|---|
| `.ytp-left-controls` | 56 px high | none | 0 | flex row |
| `.ytp-play-button` | 40×40 | `rgba(0,0,0,0.3)` | 50% | margin `8px 0 0`, padding 0, color `#eee` |
| `.ytp-mute-button` | 40×40 | none | 0 | sits in `.ytp-volume-area` |
| `.ytp-volume-area` (mute pill) | 40 high | `rgba(0,0,0,0.3)` | 28px | margin `8px 0 8px 12px` |
| `.ytp-prev-button` / `.ytp-next-button` | hidden here | `rgba(0,0,0,0.3)` | `28px 0 0 28px` / `0 28px 28px 0` | YouTube joins previous, play and next into one pill |
| `.ytp-time-wrapper` (time pill, text) | 40 high | `rgba(0,0,0,0.3)` | 28px | padding `0 16px`, font `"YouTube Noto", Roboto, Arial, Helvetica, sans-serif` 14px 500, line-height 40px, text-shadow `0 0 2px #000` |
| Hover (play, volume, time) | `::after`, inset 4px | `rgba(255,255,255,0.1)` (`--yt-sys-color-baseline--overlay-button-secondary`) | 27–28px | transition `background-color .2s cubic-bezier(.05,0,0,1)` |

YouTube has no keyboard-focus rule for these buttons in this player (none found).

**Decision: one pill for the group of six.** YouTube draws one pill per control and joins related buttons (previous,
play, next) into one pill; the six skip buttons are one group, and they sit where the time pill was. Container:
40 px high, margin `8px 0 8px 12px`, padding `0 4px`, `rgba(0,0,0,0.3)`, radius 28px. Buttons: 32 px high (the 4 px
hover inset), padding `0 8px`, radius 28px, white 14px 500 in YouTube's control font, the same text shadow; hover
`rgba(255,255,255,0.1)` with YouTube's transition; focus ring `2px solid #fff`. Labels unchanged.

Measured after: container 294×40 at the play button's y (515) and height (40); button 52×32; hover background
`rgba(255,255,255,0.1)`; keyboard focus outline `2px solid #fff`. Fullscreen (1280×800 headless): play button still
40×40, skip pill 294×40, same look. YouTube's `ytp-big-mode` (larger controls on big screens) was not reached at this
size and is not measured.

## Popup height (1x, English UI `--lang=en-US`, new profile, protection on)

| | Before (R2) | After, Advanced closed | After, Advanced open |
|---|---|---|---|
| Body height | 644 px | **384 px** | **542 px** |

Protection off: 206 px closed, 254 px open. German: 416 / 574 px.

**Decision, language with protection off:** the "Advanced settings" block stays visible and holds only the language
row; the two advanced setting rows and the main card hide. The two hidden parts carry the same `data-settings-panel`
attribute, and `renderPower` hides each of them. This needed no extra row or moved element, so it was the simpler
option.

## Tests

`npm test`: before **258/258**, after **261/261** (0 fail). Removed: the skip dependency test and two shortcut tests.
Added: old skip setting ignored and removed (settings), skip pill CSS (skip-buttons), browser language selected with no
stored language (`de-DE` → `de`, `zh-CN` → `en`), English stored when the browser is German, browser language picked
while another language is still loading, `getBrowserLanguage` (i18n). The race, rollback and external-change tests are
adapted and pass. Locale tests (same keys in all locales, no placeholders, every key used) pass.

## Live checks (rig `C:\Users\vtshk\AppData\Local\Temp\yas-audit2`, scripts `r3.mjs`, `r3-measure.mjs`, `r3-probe-time.mjs`)

| Check | Expected | Actual |
|---|---|---|
| (a) popup light/dark, Advanced closed/open, protection off | main card 3 rows; Advanced closed by default; off: only Language | as expected in en-US and de; off state shows the Advanced block with only "Language"; no shortcut, no skip row, no group titles, no `auto` option |
| Summary | 14px 600, 48 px, chevron turns, focus ring | `14px 600 48`; `rotate(45deg)` → `rotate(225deg)`; Tab reaches the summary, `:focus-visible`, outline `2px solid` inset (`-2px`); Enter opens it |
| (b) `--lang=de`, nothing stored | list shows Deutsch | `getUILanguage()` `de`, select `de` / "Deutsch", `lang="de"`, summary "Erweiterte Einstellungen", no `uiLanguage` |
| Language choice | other language stored, browser's removes | en-US: pick de → stored `de` (43 keys); pick en → key removed. de: pick fr → stored; pick de → removed |
| (c) skip buttons before/after | gray pill like YouTube's | see "Measured" above; buttons show with an old `showSkipButtons:false` still stored |
| (d) page errors | 0 | 0 in every run (popup en-US, de, before; YouTube before and after) |
| Restore | DEFAULT settings, no `uiLanguage` | `profile2` sync = the 7 defaults from `settings.js` (cleared first, so no `showSkipButtons`); local `{}` |

Screenshots, in `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\out-r3\`:
- popup: `a-popup-en-US-{light,dark}-{closed,open}.png`, `a-popup-en-US-off-light-{closed,open}.png`,
  `a-popup-en-US-off-dark-open.png`, `a-popup-en-US-focus-summary.png`, the same set as `a-popup-de-*`, and the old
  popup `a-popup-before-light.png`;
- skip buttons: `c-skip-before.png`, `c-skip-after.png`, `-hover`, `-focus` and `-fullscreen` of each, and YouTube's
  own time pill `c-youtube-left-controls-protection-off.png`.

Rig note: `profile2` runs Chrome with UI language `ru`, and Playwright's `locale: en-US` changes only the page side of
`getUILanguage()`, so a popup there shows Russian texts with English selected. This is a rig artefact (in a real
browser both come from the same UI language); the English and German checks above use new profiles with `--lang`.

## Not done

- `README.md` line 61 still lists "Skip buttons … Enabled by default" as a popup option, and line 56 is about the
  popup toggle and shortcut; `store/permissions.md` line 13 says "skip buttons shown". README and store texts were out
  of scope; they need a wording pass.
- `ytp-big-mode` (bigger player controls on large fullscreen screens) not measured; the skip pill stays 40 px there.
- The older, non-`delhi-modern` YouTube player was not checked; the pill would still show there.
- Rig profile folders `profile-r3-*` are left in the rig, as R2's were.
