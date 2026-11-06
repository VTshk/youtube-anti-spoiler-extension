# Plan R3: owner feedback on the new popup and skip buttons (2026-11-06)

Working tree: `E:\vt\pet\projects\youtube-anti-spoiler-extension\.claude\worktrees\project-overview-62c71a`, branch
`claude/project-overview-62c71a`. The base is commit `12f18da`:
- design B popup;
- i18n in 10 languages (`_locales/*/messages.json`, `src/shared/i18n.js`);
- the language choice in `storage.local.uiLanguage`, which only the popup writes;
- `npm test` 258/258.

Earlier plans and reports, for context only:
- `docs/superpowers/plans/2026-11-06-redesign-i18n.md`, whose §1 simplicity rules and §6 "Do not" still apply;
- `docs/research/2026-11-06/r1-report.md`;
- `docs/research/2026-11-06/r2-report.md`.

## Owner feedback, 2026-11-06 (quoted)

> убери "язык браузера" ну что это такое? ставишь просто тот который в браузере установлен но не отдельным пунктом под
> это. подсказку про сочетание клавиш тоже можно убрать думаю. кнопки перемотки можно показывать всегда, не добавляя
> под это отдельный свитч. и кстати можем мы стилизовать немного эти кнопки перемотки? так же небольшой бекграунд серый
> сделать как у кнопок ютуба, а то из совсем не видно. ну и в стиле кнопок ютуба сделать которые рядом - плей и звук.
> и вообще как будто бы я показал бы только основные настройки типа прогрессбар, превью, трансляции, а остальные всякие
> настройки вынес бы в отдельный раскрывающийся список с расширенными настройками

## 1. Language select: no "Browser language" option

- The select lists only the languages in `SUPPORTED_LANGUAGES`, by native name. Remove the `auto` option and the
  `popupLanguageBrowser` key from all 10 locale files.
- **The selected value** is the stored `uiLanguage.code` if one is set. Otherwise it is the browser's language, as
  resolved by the existing `findShownLanguage(chrome.i18n.getUILanguage())` logic in `i18n.js`: exact match, then
  base, then `en`. Expose that resolver if it is not exported yet; one small function.
- **Choosing:**
  - if the chosen code equals the browser's resolved language, **remove** `uiLanguage`, so the extension goes back to
    following the browser;
  - otherwise store `{ code, messages }` as today.
  - Keep the latest-choice-wins counter, the failure rollback and the external-change handling exactly as they work now.
- Internally `"auto"` may stay as the meaning of "no stored language". It is just not shown as an option.
- Tests:
  - with no stored language, the select shows the browser language, using a `getUILanguage` stub such as `de-DE` →
    `de`, and an unsupported UI language → `en`;
  - choosing a non-browser language stores it;
  - choosing the browser language removes the key;
  - the existing race and rollback tests still pass after adaptation.

## 2. Remove the shortcut hint from the popup

- Remove the shortcut line and its code from `popup.html`, `popup.js` and `popup.css`: `renderShortcut`, the `<kbd>`,
  and the `chrome.commands.getAll` call.
- Remove the keys `popupShortcutLabel` and `popupShortcutNotSet` from all locales.
- The keyboard command itself stays in `manifest.json` and `background.js`, unchanged. Update the tests that checked
  the hint.

## 3. Skip buttons: no setting, shown whenever the timeline is hidden

- Remove the `showSkipButtons` setting:
  - drop it from `DEFAULT_SETTINGS` and `normalizeSettings`;
  - add `"showSkipButtons"` to `LEGACY_SETTING_KEYS` in `settings.js`, so old stored values are cleaned up the way the
    other legacy keys are;
  - drop the `CLASS_BY_SETTING.showSkipButtons` class, and its use in the CSS rule at `content.js:423`.
- The buttons now show whenever protection is on AND the progress bar is hidden AND the existing conditions hold: no
  live guard, and the player allows seeking.
  - Main-session assumption, to state in your report: "always" means "whenever the timeline is hidden". With the
    timeline visible, YouTube's own seeking is available.
- Remove the popup row and the keys `popupSkipButtons`, `popupSkipButtonsNote` and `popupSkipButtonsRequires` from all
  locales. Remove the skip-dependency code in `popup.js` (`skipToggle`, around line 99) and its tests.
- Update the tests in `tests/settings.test.js`, `tests/content.test.js`, `tests/skip-buttons.test.js` and
  `tests/popup.test.js`. Keep the tests of the skip behaviour itself (seek bounds, live-guard and seekable conditions).

## 4. Skip buttons styled like YouTube's own player buttons

- **Measure first, on live YouTube**, using the rig in `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\`. The pattern is
  `r1b.mjs`: Playwright, Chromium 1248, `profile2`, `--load-extension`.
  - Open a normal video, for example `RwB09qzaNdU`, and hover the player so the controls show.
  - Record `getComputedStyle` of the play button (`.ytp-play-button`) and the mute button (`.ytp-mute-button`): width,
    height, background, background-color, border-radius, padding, margin.
  - Record the same for their pill or background container, if the current player draws a shared rounded background
    behind a button group. Look at the parents of these buttons in `.ytp-left-controls`.
  - Also record any `:hover` background.
  - Take a screenshot of the control bar before the change, cropped to the left controls.
  - Write the numbers into your report.
- Then restyle `.yas-skip-buttons` / `.yas-skip-button` (CSS in `content.js`, around lines 410–440) to look like those
  buttons:
  - the same height and vertical alignment;
  - the same kind of subtle gray, semi-transparent background as YouTube's buttons;
  - the same corner radius;
  - white text in YouTube's control font, size and weight;
  - the hover state like YouTube's;
  - a visible focus ring.
  - Either each button gets its own pill, or the group of six sits in one pill like YouTube groups its controls. Choose
    whichever matches what you measured, and say which.
  - The labels stay `−10m −1m −10s +10s +1m +10m`.
- Take a screenshot after the change, cropped the same way, in YouTube's normal player and in fullscreen if that is
  simple. If the player's controls look different in fullscreen, note it.

## 5. Popup: main settings visible, the rest under "Advanced settings"

- Main card, always visible while protection is on, in this order:
  1. Hide progress bar
  2. Blur previews
  3. Protect live streams
  - One card without group headings. Remove the keys `popupGroupPlayer`, `popupGroupAroundVideos` and
    `popupGroupLive` from all locales if they become unused.
- Below it, a collapsible **"Advanced settings"** made with a native `<details>`/`<summary>`, closed by default. The
  summary is a full-width row in the same card style, 14 px, weight 600, with a chevron that rotates when open and a
  visible focus ring. It contains, in this order:
  1. Blur video titles
  2. Hide comments
  3. Language: the label and the select, laid out as a row in the same style as the other rows.
- While protection is off, the main card and "Advanced settings" are hidden, as the settings are hidden today.
  Language stays reachable: show the "Advanced settings" block when protection is off but put only the language inside
  it then. Alternatively keep the language row visible in the off state in the simplest way. Pick the simpler option and
  say which.
- New key `popupAdvancedSettings`, "Advanced settings". Translate it into all 9 languages using the wording of each
  language's common software UI: ru «Дополнительные настройки», es «Configuración avanzada», pt_BR «Configurações
  avançadas», de «Erweiterte Einstellungen», fr «Paramètres avancés», ja «詳細設定», ko «고급 설정»,
  id «Pengaturan lanjutan», tr «Gelişmiş ayarlar».
- Notes under rows stay as they are. Popup height should drop noticeably; report it at 1x in English, closed and open.

## 6. Gates

- `npm test` green. Report the count before (258) and after.
- The existing locale tests (identical keys, no placeholders, every used key exists) must still pass after the key
  removals.
- Live, with the rig and outputs in `out-r3`:
  - (a) popup screenshots, light and dark, with Advanced closed and open, and with protection off;
  - (b) with `--lang=de` (a separate rig profile copy, or the `locale` option), confirm the select shows Deutsch with
    no stored language;
  - (c) skip buttons before and after, cropped;
  - (d) page errors: 0.
- Make sure `storage.local` and the settings in the rig profile are restored at the end. Restore the DEFAULT values
  from `src/shared/settings.js`, not whatever was there before.

## 7. Report

Append "R3" to `docs/research/2026-11-06/r1-report.md`, or write `r3-report.md`. Include:
- what changed;
- the measured YouTube button numbers;
- your decisions (the pill layout, the language row in the off state);
- the test counts;
- the screenshot paths;
- a "Not done" section.

No commits: git is the main session's job. If your context passes about 250k tokens, write the report with the
remaining work and stop.
