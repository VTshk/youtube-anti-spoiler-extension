# R1 report: popup redesign "B. Logo capsule" and the i18n framework (2026-11-06)

Plan: `docs/superpowers/plans/2026-11-06-redesign-i18n.md`. Worktree `project-overview-62c71a`, branch
`claude/project-overview-62c71a`. Nothing is committed and git state is unchanged.

**Status:** the code and tests are done, and `npm test` is green (221 → 251). **The live check (plan §5.3) was not
run.** The agent's context passed 250k tokens, so it stopped here, as the plan requires. See "Not done".

## 1. Strings inventory

The line numbers refer to the files **before** this change (HEAD `e9526a6`). The English text is the R1 text. The popup
wording is new, as listed in plan §3.4.

### Manifest (`manifest.json`)
| Key | English | Old location |
|---|---|---|
| `manifestName` | Anti-Spoiler for YouTube | `manifest.json:3` (`name`), `:19` (`action.default_title`) |
| `manifestDescription` | Hides spoiler-prone YouTube elements: time, progress bars, previews, titles, comments, and live-stream results. | `manifest.json:5` |
| `manifestToggleCommand` | Turn spoiler protection on or off | `manifest.json:33` |

### Popup (`popup/popup.html`, `popup/popup.js`)
| Key | English | Old location (old text) |
|---|---|---|
| `manifestName` (popup `<title>`) | Anti-Spoiler for YouTube | `popup.html:6` |
| `popupName` | Anti-Spoiler | `popup.html:13` ("Anti-Spoiler for YouTube") |
| `popupStatusOn` / `popupStatusOff` | Protection on / Protection off | `popup.html:31`, `popup.js:85` ("Protection is on/off") |
| `popupNoteOn` / `popupNoteOff` | Video time and duration are hidden / YouTube is shown normally | `popup.html:32`, `popup.js:90–91` |
| `popupMasterSwitchLabel` | Spoiler protection | `popup.html:22`, `popup.js:81` ("Enable/Disable protection") |
| `popupGroupPlayer` / `popupGroupAroundVideos` / `popupGroupLive` | Player / Around videos / Live streams | new |
| `popupHideProgressBar` / `…Note` | Hide progress bar / In the player and in previews | `popup.html:39–40` |
| `popupSkipButtons` / `…Note` | Skip buttons / Jump 10 s, 1 min or 10 min | `popup.html:51–52` |
| `popupSkipButtonsRequires` | Requires "Hide progress bar" | new |
| `popupBlurPreviews` / `…Note` | Blur previews / Thumbnails and hover previews | `popup.html:63–64` |
| `popupBlurTitles` / `…Note` | Blur video titles / In lists, on the video page and in end cards | `popup.html:75–76` ("Hide video titles") |
| `popupHideComments` / `…Note` | Hide comments / Show them with one click | `popup.html:87–88` |
| `popupProtectLive` / `…Note` | Protect live streams / Pause at the start and hide live chat | `popup.html:99–100` |
| `popupShortcutLabel` | Shortcut: | `popup.js:192` (`Shortcut: ${…}`) |
| `popupShortcutNotSet` | Set a shortcut in chrome://extensions/shortcuts | `popup.js:193` |
| `popupLanguageLabel` / `popupLanguageBrowser` | Language / Browser language | new |
| `popupSaveError` | Could not save settings | `popup.js:123` |
| `popupLoadError` | Could not load settings — close and reopen the popup | `popup.js:234` |
| `popupLanguageError` | Could not change the language | new |

Removed and not replaced: `popup.html:16` aria-label "Main toggle", `:36` "Protection settings", and `:25–26` "ON/OFF"
inside the old track (the plan says no text in the track).

### In-page (the English text is unchanged)
| Key | English | Old location |
|---|---|---|
| `liveGuardTitle` | Spoiler protection is active | `live-start-controller.js:1317` |
| `liveGuardPaused` | This live stream was paused before showing the current moment. | `:1326` |
| `liveGuardUnknownStatus` | Couldn't tell whether this is a live stream. | `:1325` |
| `liveGuardChecking` | Checking whether the stream can be rewound… | `:1263` |
| `liveGuardCannotRewind` | This stream can't be rewound. Continue live or leave the page. | `:1265` |
| `liveGuardJumpFailed` | Couldn't jump to the beginning. | `:1267` |
| `liveGuardStartButton` / `liveGuardContinueButton` / `liveGuardPlayButton` | Start from beginning / Continue live / Play | `:1342`, `:1352`, `:1348` |
| `liveGuardAdNote` | Ad — the choice will appear after it | `:1386` |
| `commentsHiddenTitle` | Comments hidden | `content.js:860` (cover), `content.js:676` (live chat cover) |
| `commentsShowButton` | Show comments | `content.js:866`, `content.js:681` |
| `skipBack10Minutes` … `skipForward10Minutes` (6 keys) | Back 10 minutes, Back 1 minute, Back 10 seconds, Forward 10 seconds, Forward 1 minute, Forward 10 minutes | `skip-buttons.js:17–22` (`step.name`) |
| `mediaHiddenTitle` | YouTube video | `live-player-bridge.js:26` (`HIDDEN_MEDIA_TITLE`, kept as the fallback) |

Removed: `live-start-controller.js:1301` aria-label "Live spoiler protection" (see decision D1).

Not translated, on purpose:
- `content.js:36` `HIDDEN_TAB_TITLE = "YouTube"`: it imitates YouTube's own tab title.
- The skip labels `−10m … +10m` (plan §4).
- YouTube's own strings in selectors and comments: "Up next", "Key moments", "Most replayed", "Show less" and others.
- `background.js`: it has no visible strings and was not changed.

All 50 keys: `_locales/en/messages.json`. No placeholders. Each has a `description`.

## 2. Files

New:
- `_locales/en/messages.json`
- `src/shared/i18n.js`
- `tests/helpers/english-messages.js`: loads the en file and stubs `chrome.i18n`. It is not a test file, so
  `node --test` does not run it.
- `tests/i18n.test.js`: 9 tests.
- `tests/content-language.test.js`: 3 tests. They load the content scripts into a vm in manifest order, so `init()`
  runs as it does in Chrome.

Changed:
- `manifest.json`: `default_locale`, the `__MSG_…__` fields, and `src/shared/i18n.js` after `settings.js`. No new
  permissions and no WAR.
- `popup/popup.html`, `popup/popup.css`, `popup/popup.js`: design B and the language picker.
- `src/content/content.js`: the cover and chat texts go through `setText`; `loadLanguage` / `showLanguage` /
  `writeMediaTitle`; a `local` branch in `storage.onChanged`; the CSS of the live guard and the comments cover.
- `src/content/live-start-controller.js`: all texts go through `setText`, the status text with its key on every
  update, and `aria-labelledby`.
- `src/content/skip-buttons.js`: `labelKey` and `setLabel` in `createSkipButton()`.
- `src/content/live-player-bridge.js`: `data-yas-media-title`, read with a fallback to "YouTube video", and added to
  the `attributeFilter`.
- `scripts/build-release.ps1` (`_locales`), `store/package-contents.md`.
- Tests: `popup.test.js` (rewritten; the fake DOM is built from the real `popup.html`), `content.test.js`,
  `comments-and-tab-title.test.js`, `skip-buttons.test.js`, `media-session.test.js`, `manifest.test.js`,
  `release.test.js`.

## 3. Decisions and assumptions

- **D1. The live guard dialog is named with `aria-labelledby` pointing to its visible title. Its own `aria-label` is
  gone.**
  - Why: the plan's `setLabel` sets both `aria-label` and `title`. A `title` on the overlay would show a tooltip over
    the whole player and its buttons, which changes in-page behaviour, and §4 forbids that.
  - The accessible name changes from "Live spoiler protection" to "Spoiler protection is active".
  - The title `<p>` gets an id, `youtube-anti-spoiler-live-guard-title`.
  - The test checks that there is no `title` on the overlay.
- **D2. The live chat cover reuses `commentsHiddenTitle` / `commentsShowButton`.** Its English text was already
  "Comments hidden / Show comments". The chat cover's look was not changed, because §4 restyles only the live guard and
  the comments cover. **Question Q1** is below.
- **D3. `getHtmlLang("auto")` matches the base language only against a folder of that exact name.**
  - Example: `pt-PT` → `pt`, which does not match `pt_BR` → `en`.
  - This is what Chrome itself shows, so `<html lang>` stays truthful.
  - An exact match treats `-` and `_` as equal.
- **D4. The popup's off state is pure CSS:** `.hero:has([data-power-toggle]:not(:checked))` → `#6e6e6e`. `:has()` needs
  Chrome 105, and the minimum is 111. No JS class is needed.
- **D5. A successful language change clears the status line**, like a successful settings save does. Assumption: an
  old "Could not save settings" may disappear with it.
- **D6. The external `uiLanguage` listener in the popup is bound in read-only mode too.** It changes texts only, and
  the select stays disabled.
- **D7. The status line, the skip note and the live guard status:**
  - when they have no text, the key is removed (`delete dataset.yasI18n`), so `applyTranslations` cannot bring an old
    text back;
  - the status text is set with its key on every `updateLiveGuardOverlay` call.
- **D8. Disabled toggles: only the control fades (opacity .45).** The row text keeps its contrast (§3.3). Read-only
  mode fades every control.
- **D9. In-page, the scrim under the live guard went from `rgba(15,15,15,.82)` to `rgba(0,0,0,.85)`**, because the old
  value is lighter (§4 rule). The comments cover scrim was not changed, because the plan says nothing about it.
- **D10. Panel strip:** `border-top: 6px solid #c85252` on the panel. This is the simple variant from §4. The look is
  not checked live yet.
- **D11. `getText` does not guard against a missing `chrome.i18n`.** The API is always there in the extension, so that
  case cannot happen. Tests stub it through the helper.
- **D12. The popup HTML keeps English as its starting text.** `applyTranslations` replaces it after `storage.local`
  answers. A test checks that every `data-yas-i18n` text in the HTML equals the en message.

## 4. Tests

| Gate | Expected | Actual |
|---|---|---|
| `npm test` before (HEAD + plan) | 221 pass | 221 pass, 0 fail |
| `npm test` after | green | **251 pass, 0 fail** (`exit=0`) |

New and changed tests mapped to plan §5.2:
- **Locale files:** keys match en, texts are non-empty, no `$` or `placeholders`, the manifest `__MSG__` keys exist,
  and `default_locale` is `en`. Two extra checks: every en key is used somewhere, and the description is at most 132
  characters.
- **Key scan:** every key in `popup.html`, `popup.js`, `i18n.js`, `content.js`, `live-start-controller.js`,
  `skip-buttons.js` and `background.js` exists in en. The scan uses the regex
  `"(popup|liveGuard|comments|skip|manifest|media)[A-Z]…"`.
- **`getText`:** override, then `getMessage`, then the key.
- **`getHtmlLang`:** `pt_BR` → `pt-BR`; auto with UI `ru` → `en`; auto with UI `en-US` → `en`.
- **`setText` / `setLabel` / `applyTranslations`:** text and labels are re-applied; elements without a key are left
  alone.
- **Live guard:** the open panel is translated without a rebuild. After the state changes (checking → cannot rewind),
  a later language change shows the new state's text. The panel has `aria-labelledby` and no `title`.
- **Comments cover:** translated without a rebuild; protection stays on.
- **Content init (vm, manifest order):** both storage reads are pending, protection classes are already set, the media
  title attribute is "YouTube video", and the texts change after the `local` read answers. A `storage.onChanged`
  `local` event translates and writes the attribute, and removing the key goes back to English. Skip button labels
  follow a language change while their short labels stay the same.
- **Bridge:** with the attribute set, the media title is shown in that language. When only the attribute changes,
  `mediaSession.metadata.title` updates; the fake observer honours `attributeFilter`.
- **Popup:**
  - the startup language is applied with no fetch;
  - the select writes and removes `uiLanguage`;
  - the latest choice wins when two fetches finish in reverse order;
  - a fetch error or a write error rolls the select back and shows the error;
  - an external change translates, and its removal goes back to English;
  - read-only mode disables the select and still translates;
  - a failed `uiLanguage` read falls back to the browser language;
  - skip is disabled with the "Requires" note while the bar is visible, and the saved value is unchanged;
  - the shortcut is shown as a label plus `<kbd>`.
- **Release:** the zip contains `src/shared/i18n.js` and `_locales/en/messages.json`. The test builds `dist/` itself.

## 5. Live check (plan §5.3)

**Not run.** Expected vs actual:

| Item | Expected | Actual |
|---|---|---|
| (a) popup light/dark, screenshots | renders as in the mockup | not run |
| (b) override → panel and cover show test text without reload; removal → English; select en → Browser works | yes | not run (the logic is covered by unit and vm tests only) |
| (c) live DVR stream, restyled guard, screenshot | yes | not run |
| (d) `RwB09qzaNdU`, restyled comments cover, screenshot | yes | not run |
| (e) page errors | 0 | not run |
| Tab focus in both themes, screenshot (§3.2) | the ring is visible on the switch, the toggles and the select | not run |

## 6. Not done

1. **The whole live check, §5.3 (a)–(e), plus the focus check with Tab and its screenshot (§3.2).**
   - Reason: the context limit (≈285k tokens at the time of writing).
   - Rig: `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\`. Pattern `run.mjs` / `features-p4.mjs`. Copy
     `manifest.json src popup icons _locales` into `ext-r1` and write outputs to `out-r1`. The `ext-r1` and `out-r1`
     folders were not created.
   - Check visually:
     - the 6 px red `border-top` on the live guard panel, where the rounded corners meet the 1 px gray border;
     - the comments cover card with its left red border and centered content;
     - the popup `:has()` gray state.
2. Nothing else in R1 is left. No version bump, README or store texts, and no translations, as planned.

## 7. Open questions

- **Q1. Should the live chat cover be restyled like the comments cover?** It shows the same "Comments hidden / Show
  comments" text and keeps the old look: a translucent scrim, a white button with radius 6. §4 does not list it, so it
  was not changed.
- **Q2. Is the D1 name for the live guard dialog acceptable?** The accessible name is now "Spoiler protection is
  active" instead of "Live spoiler protection".

## R1 fixes (2026-11-06)

Plan: `docs/superpowers/plans/2026-11-06-r1-fixes.md`, plus the coordinator's extra item on the cover bar.

### Changed

1. **Popup tests** (`tests/popup.test.js`). The harness has a new `delayLanguageRead` option and a
   `finishLanguageRead()` helper. Two new tests:
   - "popup shows the settings and follows changes made elsewhere before the language is read": with the language read
     pending, the settings and the power status are shown, and an external `hideVideoTitles` change is applied. After
     the read resolves, the texts switch to the stored language. The next save keeps the external change.
   - "popup does not write its own language choice over a removal made elsewhere while loading": a `pt_BR` choice is
     pending in the deferred fetch (made-up second code, the same as the existing reverse-order test). An external
     `uiLanguage` removal is fired, then the fetch resolves. Result: no `uiLanguage` is stored, the select shows `auto`,
     and the texts are English.
2. **Language texts after an update** (`src/background/background.js`). The worker now loads `src/shared/i18n.js` with
   `importScripts`, next to `settings.js`, and reuses `fetchMessages` and `SUPPORTED_LANGUAGES`.
   - On `runtime.onInstalled` with `reason === "update"`, it reads `storage.local.uiLanguage`. With no stored
     language it does nothing. An unsupported code is removed. Otherwise the texts are fetched again and
     `{ code, messages }` is written back.
   - Errors are logged with `[Anti-Spoiler for YouTube] Could not refresh the language texts.`
   - The comment on `fetchMessages` in `i18n.js` now names the service worker too.
   - Tests in `tests/background.test.js`: the harness gains `storage.local`, `runtime.getURL`,
     `runtime.onInstalled`, `fetch` and a multi-file `importScripts`. Four new tests: update rewrites the texts,
     update with no stored language does nothing, install does nothing, an unsupported code is removed.
3. **Live chat cover restyle** (`src/content/content.js`, CSS only). It now has the comments-cover look:
   - the card is `#222222` with radius 12 px;
   - the title is `#f4f4f5`, 14 px, weight 600;
   - the button is `#b33939` with white text, radius 999 px, min-height 32 px and padding `0 14px`;
   - the same `:focus-visible` ring as the comments cover was added.
   The scrim and the structure are unchanged.
4. **Red bar on both covers** (coordinator's extra item). On both covers `border-left: 4px solid #c85252` was replaced
   with `box-shadow: inset 4px 0 0 #c85252`. Padding is now `12px 16px 12px 20px`, so the text stays clear of the bar.
   No test asserted the old values.

### Tests

| Run | tests | pass | fail |
|---|---|---|---|
| `npm test` before | 251 | 251 | 0 |
| `npm test` after | 257 | 257 | 0 |

### Not done

1. No live check in Chrome of the restyled chat cover or the inset bar on either cover. They are covered by CSS review
   only, and no unit test asserts these CSS values.
2. The update refresh was not tried in a real extension update. It is covered by vm tests only.
3. No mutation check showing that the two new popup tests fail with the main session's `popup.js` fixes reverted. The
   tool permission system blocked the temporary edit of `popup.js`.
