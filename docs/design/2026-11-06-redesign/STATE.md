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
