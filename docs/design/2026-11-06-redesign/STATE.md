# Popup redesign and i18n: state (2026-11-06)

The owner's request, 2026-11-06: «теперь давай доработаем наш дизайн. подумайте с кодексом и аргоном, как мы можем сделать
его простым и понятным и при этом красивым? … логотип … мне он очень нравится … дизайн самого расширения не особо. вот надо
придумать вариантов накидать. и еще я бы хотел добавить поддержку разных языков самых основных, штук 6-10». The owner
also said: «проверим завтра все уже под конец». That means the live checks of 0.3.0, portion 5 and the LIVE badge fix are
postponed until the end.

## Done

- The brief is in `brief.md`. The logo stays unchanged.
- Independent design directions:
  - **Argon** (`gemini-4-argon-high`, agent): "Censor Band", "Broadcast Control Deck" (bento), "Cinema Curtain". It
    recommends "Censor Band".
  - **Astra** (`run.sh review`, report `C:\Users\vtshk\AppData\Local\Temp\yas-design\codex-design\round1.out.md`):
    "Protection Band", "Quiet Checklist", "Rounded Controls". It recommends "Protection Band".
- Mockups are in `mockups/a-band.html`, `b-capsule.html`, `c-checklist.html` and `d-tiles.html`. Each is a standalone
  static HTML file with a light and a dark theme. The screenshots are in `shots/`, and the comparison board is
  `board.html` / `board.png`. Screenshots come from `C:\Users\vtshk\AppData\Local\Temp\yas-design\shot.mjs` (Playwright
  with a chrome.* stub): `node shot.mjs <html> <png> <width> <light|dark>`, plus `DPR=1` for boards.
- Language research (Codex Sol, `run.sh research`) is in
  `C:\Users\vtshk\AppData\Local\Temp\yas-design\codex-i18n\round1.out.md`.

## Agreed by all three models (Claude, Astra, Argon), whatever variant is chosen

- Use one red, the logo's `#c85252`. The header's `#cc0000` goes away.
- No text inside the switch. White on `#c85252` is 4.39:1, below AA for small text, so buttons with white text use
  `#b33939` (5.90:1).
- Unchecked control borders must reach at least 3:1. The current `#c7cbd1` is 1.52:1.
- Add a dark theme through `prefers-color-scheme`.
- State that time and duration are always hidden: "Video time and duration are hidden".
- Nest "Skip buttons" under "Hide progress bar". When the progress bar is visible, disable the skip control without
  clearing its saved value, and show the note "Requires 'Hide progress bar'".
- Move the save and load errors under the master switch, and hide the status line while it is empty.
- The logo keeps its 149:81 proportion. The current 49×32 is distorted.
- In-page UI (live guard, comments cover) uses opaque dark panels, keeps primary and secondary buttons, and never
  shows a red warning. Skip buttons stay native to YouTube's player.

## Language research: key facts

- YouTube ad reach, October 2026 (DataReportal): India 573M, USA 268M, Indonesia 155M, Brazil 154M, Mexico 89M, Japan 83M,
  Germany 69M, Vietnam 64M, Philippines 62M, Turkey 61M.
- Competitors: SponsorBlock and DeArrow ship 47 locales, Enhancer 45, Improve YouTube 57, Return YouTube Dislike 23.
  Unhook and BlockTube ship English only.
- Mechanics:
  - `_locales/<code>/messages.json` plus `default_locale: "en"`;
  - `__MSG_x__` in the manifest, for the name, description, `action.default_title` and the command description;
  - `chrome.i18n.getMessage` works in the popup, isolated content scripts and the service worker, but NOT in the
    MAIN-world bridge (`live-player-bridge.js`, the string "YouTube video"), which has to receive the text from the
    isolated world;
  - Chrome does not support plurals in messages, so if needed use `Intl.PluralRules`;
  - `chrome.i18n` has no runtime language switch; that needs its own `fetch` loader.
- Store: the name (up to 75 characters) and the short description (up to 132) come from the manifest locales. The long
  description and screenshots are set per locale in the Dashboard.
- Testing: run Chrome with `--lang=<code>` and a separate `--user-data-dir`.

## Owner decisions, 2026-11-06

1. Variant: **"B. Logo capsule"** (`mockups/b-capsule.html`).
2. Languages: **"the proposed 9"** plus English, 10 in all: en (default), ru, es, pt_BR, de, fr, ja, ko, id, tr.
3. Language selection: at first "follow the browser language", then corrected by the owner: **«язык выбирается по
   языку браузера плюс надо сделать возможность изменить»**. The default is the browser language, and the popup has
   a picker.
   - The owner then asked what the picker costs. The answer: about 40–60 lines and 6 tests, using a simpler design
     where the popup stores the chosen language's messages in `chrome.storage.local`. Content scripts read them from
     there, so no `web_accessible_resources` are needed.
   - Astra confirmed that a content-script `fetch` of packaged files requires WAR.
   - The owner's answer on keeping the picker is pending.

Note for B: the white bold 15 px title on `#c85252` is 4.39:1, below AA. In implementation, either darken the hero
cap to `#b33939` (5.90:1) or make the title 19 px bold, which counts as large text and needs 3:1.

## Next, after the decisions

1. Write a plan file.
2. `implementer` (Opus) builds:
   - the new popup;
   - the in-page panels;
   - the i18n framework and English `messages.json`.
3. Translations: Claude translates, and Astra or Argon proofread each language, with the owner checking Russian.
4. Review the result with `cross-reviewer`.
5. Live checks with `--lang`, together with the postponed 0.3.0 checks.

## Progress, 2026-11-06 (later)

- **Owner answer on the picker: "Keep it, simpler way".**
  - The popup stores `storage.local.uiLanguage = { code, messages }`.
  - Content scripts only read it, and no WAR is needed.
  - The background re-fetches the texts on an extension update.
- **R1 is done and uncommitted.** It covers the popup in design B, the language picker, the i18n framework with
  English only (51 keys), and the restyled live guard, comments cover and live chat cover.
  - Plan: `docs/superpowers/plans/2026-11-06-redesign-i18n.md`; fixes: `2026-11-06-r1-fixes.md`.
  - Report: `docs/research/2026-11-06/r1-report.md`.
  - `npm test`: 257/257.
- **Astra.** Plan critique: 9 findings, all accepted into the plan. Code review: 2 findings, both accepted and fixed
  (the popup no longer waits for the language before binding its listeners; an external language change cancels a
  pending choice).
- **Live (rig `yas-audit2`, scripts `r1.mjs` / `r1b.mjs`, outputs `out-r1`, `out-r1b`):**
  - the popup works in light and dark, in the off state and with the skip dependency, and the Tab focus ring is visible;
  - the override switches the open guard panel and comments cover in place, and reverts;
  - errors: 0.
- **Not checked live:**
  - the live chat cover;
  - the real toolbar popup frame;
  - the YouTube dark theme set through the account;
  - a real extension update.

## Next: R2, the translations

1. Add `_locales/<code>/messages.json` for ru, es, pt_BR, de, fr, ja, ko, id, tr, with the same 51 keys as `en` and the
   `description` fields copied. Add one line per language to `SUPPORTED_LANGUAGES` in `src/shared/i18n.js`, in the order
   given there.
   - The tests already enforce identical keys, non-empty values and no placeholders.
2. Proofreading: Astra or Argon per language. The owner checks Russian. YouTube's own term for each UI word ("live
   chat", "end screen", "Shorts") should match YouTube's localized UI.
3. Translate the store texts (`store/listing.md`) for the Dashboard.
4. Live check with `--lang=<code>`: popup screenshots for `de` and `ru` (the longest strings) and `ja` (CJK).
5. Then: version 0.4.0, README, and the postponed live checks of 0.3.0 and portion 5 (the owner: «проверим завтра все
   уже под конец»).

## Progress, 2026-11-06: R2 done, uncommitted

- 9 locales (`_locales/<code>/messages.json`, 51 keys, descriptions copied), `SUPPORTED_LANGUAGES` has all 10, store pages
  `store/listing.<code>.md`. `npm test`: 258/258.
- Proofreading: Argon (ru, ja, ko; id, tr) and Astra (es, pt_BR, de, fr). 30 findings in all; every one was checked
  against the strings. 28 were accepted and 2 were accepted in part ("Most replayed" left descriptive where no source
  confirmed the label).
- Live (`--lang` de, ru, ja; rig `yas-audit2`, `r2.mjs`): 0 clipped elements, 0 errors; switching the language in the
  popup changes the YouTube cover and skip labels in place.
- Report with the Russian table and "Not checked": `docs/research/2026-11-06/r2-report.md`.
- The owner approved the Russian strings; committed as `f46df69`.
- Next: 0.4.0, README, the postponed live checks of 0.3.0 / portion 5.

## R3 and live-guard fixes, 2026-11-06 (evening): uncommitted at the time of writing

- **Owner feedback**, plan `docs/superpowers/plans/2026-11-06-r3-owner-feedback.md`, report
  `docs/research/2026-11-06/r3-report.md`:
  - no "Browser language" option; the select shows the browser's language, and picking it removes the override;
  - no shortcut hint;
  - no skip-buttons setting; the buttons show whenever the timeline is hidden (main-session assumption);
  - the skip buttons sit in one gray pill measured from YouTube's own controls;
  - the main card holds progress bar, previews and live streams; "Advanced settings" (`<details>`) holds titles,
    comments and language.
- **Owner bug: "Protect live streams breaks the stream, no buttons".**
  - The cause: `content.js` forced `position: relative` on `#player-container` while the guard waited. After an
    in-site click the player collapsed to 0 px, and the panel never rendered.
  - Fixed: the rule is removed, `findLiveGuardBoundsTarget` skips 0×0 elements, and there is a CSS regression test.
- **Second live bug: "Start from beginning" never finished on 12-hour windows (Sky News).**
  - Fixed: the bridge reports `rewindStart`, the jump targets it, and the confirm window is −10 s / +30 s. See plan
    `2026-11-06-live-guard-long-window.md` and report `docs/research/2026-11-06/live-guard-long-window-report.md`.
- `npm test`: 267/267.
- **Real Chrome 156 matrix** (headful, CDP `loadUnpacked`, rig `yas-audit2/r3fix-accept.mjs`, outputs in `out-r3fix`):
  - A: 34/34;
  - C: 6/6;
  - B: settings off pass. URL + reload cells fail the same way without the extension, because of YouTube's autoplay
    after reload;
  - D: 2/2, with rewinding off;
  - errors: 0.
- **Not checked:** mini-player; an ad during the guard; a rewind window under 30 s; a `<video>` swap during a long jump;
  a signed-in account.
- **Doc leftovers:** README lines ~56 and ~61 and `store/permissions.md:13` still describe the old skip toggle and popup
  layout; `store/listing.*.md` may too.
- **The owner's rule from now on** («смотрите в браузере все проверяйте свою работу. и обязательно проверяйте что и
  отключенные настройки никак не ломают ютуб»): every change is checked live in real Chrome, with each setting on and
  off.

## Hero card and quick access, 2026-11-06 (late): uncommitted at the time of writing

- **Owner fixed the "everything visible until toggled" report:** two copies of the extension were installed at once.
  It was not a code bug: in real Chrome 156 and Chromium, direct loads were protected from the first moment.
- **Hero card** (plan `docs/superpowers/plans/2026-11-06-hero-card.md`):
  - the whole card is a `<label>` for the master switch;
  - the play triangle is centred, 37×40, `bottom: -20px`, so about half of it sits behind the band as in the logo;
  - with protection off, a red circle follows the pointer, brighter at the centre (`#ef6a6a` → `#c85252`);
  - with protection on, the band lightens on hover;
  - `npm test` 271/271;
  - the clicks were checked live in real Chrome; the latest triangle and hover tweaks were checked only by stub
    screenshot.
- **Owner request:** «смену языка и смену темной и светлой темы надо вынести из настроек и добавить куда то тоже в
  быстрый доступ. подумайте с кодексом и аргоном над вариантами».
  - Brief: `brief-quick-access.md`.
  - Codex (Astra) report: `C:\Users\vtshk\AppData\Local\Temp\yas-design\codex-quick\round1.out.md`.
  - Argon: summarized in the options below.
  - Mockups: `mockups/quick-a.html`, `quick-b.html`, `quick-c.html`; board: `board-quick.png`.
    - **A. Footer bar** (Argon's pick): below Advanced, a native language select with the full name and a 3-button
      theme segment. Height 436 px (+40).
    - **B. Chips in the hero cap**: a globe "EN ▾" chip and a theme cycle button, top-right, outside the `<label>`.
      Height 396 px (+0).
    - **C. In the Advanced row** (Codex's pick): "EN" plus 3 theme icons on the right of the summary row. Height
      396 px (+0), but the row is crowded.
  - Both models agree:
    - the theme applies to the popup only, and the in-page panels stay dark;
    - store `uiTheme` in `storage.local` next to `uiLanguage`;
    - remove the language row from Advanced.
  - **Owner choice, 2026-11-06: "B. Значки в шапке".** Implement it in a new session: plan → implementer → live check in real Chrome.
    Per the owner's rule, every setting on and off must not break YouTube.

## Quick access (option B) and contact footer, 2026-11-06: implemented, uncommitted

- Plan: `docs/superpowers/plans/2026-11-06-quick-access-chips.md` (section 6 is the contact footer, owner request).
- Built: a language chip (an overlay native `<select>`) and a theme cycle button (Auto → Light → Dark) in the hero cap,
  outside the label; `uiTheme` in `storage.local` (no key = Auto); popup only. The language row is gone from Advanced,
  and `data-settings-panel` sits on `<details>`. A footer with "Questions or ideas?" and `mailto:vtshka8@gmail.com`.
  5 new keys in all 10 locales; none removed.
- `npm test`: 284/284.
- Live in real Chrome 156 (rig `yas-audit2/quick.mjs`, `heights.mjs`, `mailto.mjs`, `yt-quick.mjs`; outputs
  `out-quick`, `out-quick-yt`): popup 35/36 (the failing cell is the height). YouTube DIRECT 2/2, B the same as the R3
  baseline (the paused-after-reload cells also fail without the extension), errors 0.
- **Height with Advanced closed** (body px, before → after): en/ru/pt_BR/id 384 → 420, es/fr/tr 400 → 436,
  ja 401 → 441, de 416 → 452, ko 419 → 455. Of this, +24 is the footer and +12 the earlier hero-card cap padding.
  This is over the "about 400" target: owner decision pending.
- **mailto:** from the real action popup a plain link starts a `mailto:` navigation that Chrome takes over (the popup
  stays open); `target="_blank"` opens a tab that closes itself and closes the popup. Whether the OS mail app opens
  was **not observed**: the window probe was blocked by the permission classifier.
- Rig quirk: Playwright `locale: en-US` makes `getUILanguage()` en-US while `getMessage` returns Russian on this
  machine, so "English" shows Russian texts in the rig. It comes from the rig; the language logic was not changed.
- **Spacing tightened (owner: "Tighten spacing"):** shell padding top and bottom 12 → 10, card gap 12 → 10, row
  padding 9 → 7, Advanced summary min-height 48 → 44, footer margin 8 → 6 with line-height 1.25. `npm test` 284/284;
  popup cells unchanged (35/36, only the height cell). Height now: en/ru/pt_BR/id 393, es/fr/tr 409, ja 410, de 425,
  ko 428. The rest comes from notes that wrap to 2 lines: `popupNoteOn` in es/de/fr and `popupBlurPreviewsNote` in
  de/ko/tr. Shorter translations would bring these languages to about 393–412.
- **Notes shortened (owner: "Shorten notes"):** `popupNoteOn` es «Tiempo y duración del video ocultos», de
  «Zeit und Videolänge ausgeblendet», fr «Temps et durée des vidéos masqués»; `popupBlurPreviewsNote` de
  «Thumbnails und Hover-Vorschauen», ko «썸네일과 마우스 오버 미리보기», tr «Küçük resimler ve fareyle önizleme».
  `npm test` 284/284. Height in real Chrome: 393 px in 8 languages; ja and ko 410 px, only from the CJK line-height
  1.5 rule (no wrapping).

## 1.0.0 (planned as 0.4.0): docs, store texts, version, final live checks (2026-11-06)

- **Docs:** `README.md` describes the current popup (the capsule is the master switch and the settings hide while it is off;
  the language chip and theme button sit in the red cap; the main card holds progress bar, previews and live streams;
  "Advanced settings" holds titles and comments; skip buttons always come with the hidden progress bar, with no
  switch of their own; a contact line; 10 languages). It also gets a "Contact" section with `vtshka8@gmail.com`.
  `store/permissions.md` no longer has the skip switch and now names `storage.local` (language and theme).
  `store/reviewer-notes.md` follows the new popup. `store/privacy.md` and `docs/privacy.md` have one sentence about
  `storage.local`.
- **Store listings (10 languages):** a bullet "language (10) and light/dark/auto theme in the popup", a contact line in
  the detailed description, and the support email in "Support", each in its own language. Not proofread by
  Astra/Argon; the owner checks Russian.
- **Version 1.0.0** (the owner chose 1.0.0 over 0.4.0 on 2026-11-06): `manifest.json`, `package.json`. No test pins the literal (`release.test.js` reads it from the
  manifest). `npm test` 284/284 at the bump; 285/285 on the tree with the other session's Beta badge.
- **Not mine, found in the tree:** an uncommitted restyle of the contact line in `popup/popup.css` +
  `tests/popup.test.js` (a thin rule above it, 11 px, muted link), plus `board-footer*.png`. The rig copy `ext-040`
  includes it, so the measured popup height is 409 px (ja 425 px) instead of 393/410.
- **Live, real Chrome 156.0.8078.80 headful, CDP `loadUnpacked`, rig `yas-audit2`:** scripts `pop-040.mjs` (popup,
  `--lang=<code>`, fresh profile) and `yt-040.mjs` (`PHASE=MINI|FULL|AD|CHAN`, six configs: def, allOn = previews +
  titles on, barOff, liveOff, commentsOff, masterOff; `--autoplay-policy=no-user-gesture-required`). Outputs are in
  `out-040/` (`*.log` + screenshots; the `*-run1.log` files are the first run, which network timeouts broke).

| Check | Expected | Actual |
|---|---|---|
| Popup ru / en / de / ja: texts, layout light+dark, master off/on, theme cycle, 5 rows on/off, picker → other language → back, contact | all PASS, 0 clipped, 0 errors | 52/52 PASS; `getUILanguage` = ru/en/de/ja; 0 clipped; body 409 px (ja 425) |
| Mini-player, normal video, 6 configs (key `i`, then back) | playing; time/bar hidden per config; back to a full player | 12/12 PASS (masterOff after a rig fix: the hidden pill element counted as "present"). In the mini-player YouTube shows no time, bar or pill |
| Mini-player, live, guard configs (def, allOn, barOff, commentsOff) | the stream is never shown | `i` does nothing while the panel is up (NA ×4); leaving with the YouTube logo while the panel is up: no mini-player, video paused at opacity 0 (PASS ×4); Continue live → plays, unmuted (PASS ×4) |
| Mini-player, live, liveOff / masterOff | no guard, plays in the mini-player | PASS ×2 |
| Fullscreen, normal video, 6 configs | time/bar per config; pill visible with the bar hidden, +10s works and fullscreen stays; exit restores the player | 12/12 PASS (+10s: 8 → 19 s, still fullscreen; barOff/masterOff: bar visible, no pill) |
| Fullscreen, live, guard configs | guard inside the fullscreen element | `f` does nothing while the panel is up (NA ×4); Continue → plays, unmuted; exit OK (PASS ×8) |
| Fullscreen, live, liveOff / masterOff | fullscreen live plays, no guard | PASS ×2 |
| `/@SkyNews/live`, `/@aljazeeraenglish/live`, guard configs | panel ≤5 s; silent and hidden; Start from beginning → ≤180 s from the window start; chat covered → revealed | panel 25–765 ms; 4 s sampling: paused+muted+opacity 0 every time; start: 3–4 s from the start; chat cover + reveal PASS on every config where chat was on (Sky News chat was disabled by the channel in 3 of 4 runs: NA) |
| Same, liveOff / masterOff | no panel, no chat cover, live edge | PASS ×4 (0 s behind the edge) |
| Ad before a video | ad plays, then the video, protection per config | **NA ×6**: no ad in 36 loads. YouTube serves this machine as region RU (the logo shows "RU"), so there are no ads |
| Page and extension errors | 0 | 0 in every run (popup ×4, MINI ×2, FULL ×2, CHAN ×2, AD) |

- **Observation (not a confirmed defect):** at the moment the panel is first found (314–765 ms after navigation), Al
  Jazeera and Sky News once showed the `<video>` as "playing, not muted, opacity 0". The next sample (~0.5 s later and
  on to 4 s) was always paused+muted. A fraction of a second of sound may slip out before the mute; to confirm, it
  needs a probe with 50 ms sampling or an audio capture.
- **Not checked:** an ad before a video and an ad during the live guard (no ads in region RU; needs another region or
  VPN); a real toolbar popup frame (the popup was opened as a tab); the mailto opening the OS mail app (the owner checks
  by hand); a signed-in account; proofreading of the new listing lines in the 9 non-English languages.
- **Changed by another session during the checks:** a "Beta" badge next to "Protect live streams" (`popup/popup.html`,
  `popup.css`, `tests/popup.test.js`). The `ext-040` copy was taken before it, so the live popup checks above do
  **not** cover the badge.
