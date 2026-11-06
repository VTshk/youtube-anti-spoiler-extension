# R2: translations into 9 languages, report (2026-11-06)

Stage R2 of the redesign (`docs/design/2026-11-06-redesign/STATE.md`, "Next: R2, the translations"). Nothing is
committed.

## 1. What changed

| File | Change |
|---|---|
| `_locales/{ru,es,pt_BR,de,fr,ja,ko,id,tr}/messages.json` | New. Each has the 51 `en` keys; every `description` is copied from `en` unchanged; no placeholders. |
| `src/shared/i18n.js` | `SUPPORTED_LANGUAGES`: 9 lines added in the plan's order (Русский, Español, Português (Brasil), Deutsch, Français, 日本語, 한국어, Bahasa Indonesia, Türkçe). |
| `store/listing.<code>.md` × 9 | New. Name, short description (same as `manifestName` / `manifestDescription`), detailed description, keywords and support line for the Developer Dashboard. |
| `tests/i18n.test.js` | The `getHtmlLang` test now expects the real languages: `ru` → `ru`, `pt-BR` → `pt-BR`, `es-419` → `es`, `de-AT` → `de`, `pt-PT` → `en`, `zh-CN` → `en`. New test: every locale keeps the store name ≤ 75 and the description ≤ 132 characters. |
| `tests/popup.test.js` | The language list test expects all 10 languages. The "browser language" test expects `lang="ru"` and no file fetch. |
| `tests/release.test.js` | The zip must contain every `_locales/<code>/messages.json`, not only `en`. |
| `docs/research/2026-11-06/r2-live-check.mjs`, `r2-shots/` | The live check script (a copy; it runs from the rig) and 9 screenshots. |

Translation choices:

- **The brand.** `manifestName` is "Anti-Spoiler для YouTube / para / für / pour / untuk", and in Turkish "YouTube için Anti-Spoiler". Japanese and Korean keep "Anti-Spoiler for YouTube". `popupName` is "Anti-Spoiler" everywhere.
- **Spanish** is one neutral `es` for Spain and Latin America, using "video" and "en vivo".
- **YouTube terms:**
  - live chat: Livechat, chat en vivo / ao vivo / en direct, ライブチャット, 실시간 채팅, live chat, canlı sohbet;
  - end screen: конечная заставка, Abspann, pantalla final, tela final, écran de fin, 終了画面, 최종 화면, layar akhir, bitiş ekranı;
  - Shorts is not translated (ショート in Japanese).
- **The "Most replayed" graph** is described in words, not quoted as a YouTube label. The exception is Indonesian, where the label "Paling sering di-replay" is backed by a YouTube Help thread. For ru, es, fr, de, ja and tr, no source confirmed the exact label on the player, so the store page describes it in words instead of quoting a label that might be wrong.

## 2. Proofreading by another model family

Three reviewers ran in parallel, read-only, from the task file
`…\side-session-notes\local_e4156a48-…\r2-proofread-task.md`:

- Argon (`gemini-4-argon-high`): ru, ja, ko;
- Argon: id, tr;
- Astra (`cross-reviewer`, `gpt-6-astra`): es, pt_BR, de, fr.

Claude checked every finding against the strings itself before fixing.

| Language | Findings | Accepted | Partly / declined | Notes |
|---|---|---|---|---|
| ru | 4 | 3 | 1 | Declined: «Чаще всего пересматривают» as the label, because no source was given. The descriptive phrase stays. Accepted: «текущий момент эфира», «эпизоды / текст видео» on the store page, «Расширение не отправляет». |
| ja | 4 (5 strings) | 4 | 0 | `先頭に移動`, no dangling `で` in notes, `コメントパネル`. The "Most replayed" label became descriptive, so the reviewer's 「リプレイ回数が最も多い部分」 is also not quoted. |
| ko | 5 | 5 | 0 | Word order of the description, `흐리게 표시`, notes without `~에서`, `필요에 따라`, no `그들의`. |
| id | 4 | 4 | 0 | `segmen video`, `ditutupi`, "Paling sering di-replay", `meN-` verbs throughout the list. |
| tr | 4 | 3 | 1 | Accepted: `Canlı yayına devam et`, `örtülü`, `açılır pencere` + 3rd person. Partly: "tekrar oynatılan", but descriptive, not a quoted label. |
| es | 1 | 1 | 0 | `elijas ver desde el inicio`. |
| pt_BR | 2 (3 strings) | 2 | 0 | `retroceder na/nesta transmissão`, disclaimer `afiliada ao … e não é endossada … por eles`. |
| de | 0 | — | — | — |
| fr | 2 | 2 | 0 | `Reculer/Avancer de 1 minute` (no elision before a digit); U+00A0 before `:` and inside `« »` on the store page. |

Claude's own fixes after the live check and the review:

- ja `popupBlurPreviewsNote` was shortened to 「サムネイルとホバー時のプレビュー」. The long version wrapped with a lone 「ー」 at the start of the second line.
- The pt_BR and fr store lists now use the 3rd person throughout ("Ativa ou desativa", "Active ou désactive"). Argon raised the same mood mismatch for id and tr.

## 3. Russian for the owner to check

51 popup and in-page strings:

| # | Key | English | Русский |
|---|---|---|---|
| 1 | `manifestName` | Anti-Spoiler for YouTube | Anti-Spoiler для YouTube |
| 2 | `manifestDescription` | Hides spoiler-prone YouTube elements: time, progress bars, previews, titles, comments, and live-stream results. | Скрывает на YouTube всё, что выдаёт спойлеры: время, полосы прогресса, превью, названия, комментарии и текущий момент эфира. |
| 3 | `manifestToggleCommand` | Turn spoiler protection on or off | Включить или выключить защиту от спойлеров |
| 4 | `popupName` | Anti-Spoiler | Anti-Spoiler |
| 5 | `popupStatusOn` | Protection on | Защита включена |
| 6 | `popupStatusOff` | Protection off | Защита выключена |
| 7 | `popupNoteOn` | Video time and duration are hidden | Время и длительность видео скрыты |
| 8 | `popupNoteOff` | YouTube is shown normally | YouTube показывается как обычно |
| 9 | `popupMasterSwitchLabel` | Spoiler protection | Защита от спойлеров |
| 10 | `popupGroupPlayer` | Player | Плеер |
| 11 | `popupGroupAroundVideos` | Around videos | Вокруг видео |
| 12 | `popupGroupLive` | Live streams | Трансляции |
| 13 | `popupHideProgressBar` | Hide progress bar | Скрыть полосу прогресса |
| 14 | `popupHideProgressBarNote` | In the player and in previews | В плеере и в превью |
| 15 | `popupSkipButtons` | Skip buttons | Кнопки перемотки |
| 16 | `popupSkipButtonsNote` | Jump 10 s, 1 min or 10 min | На 10 с, 1 мин или 10 мин |
| 17 | `popupSkipButtonsRequires` | Requires "Hide progress bar" | Нужна настройка «Скрыть полосу прогресса» |
| 18 | `popupBlurPreviews` | Blur previews | Размыть превью |
| 19 | `popupBlurPreviewsNote` | Thumbnails and hover previews | Значки видео и превью при наведении |
| 20 | `popupBlurTitles` | Blur video titles | Размыть названия видео |
| 21 | `popupBlurTitlesNote` | In lists, on the video page and in end cards | В списках, на странице видео и в конечных заставках |
| 22 | `popupHideComments` | Hide comments | Скрыть комментарии |
| 23 | `popupHideCommentsNote` | Show them with one click | Открываются одним нажатием |
| 24 | `popupProtectLive` | Protect live streams | Защищать трансляции |
| 25 | `popupProtectLiveNote` | Pause at the start and hide live chat | Пауза в начале и скрытый чат |
| 26 | `popupShortcutLabel` | Shortcut: | Сочетание клавиш: |
| 27 | `popupShortcutNotSet` | Set a shortcut in chrome://extensions/shortcuts | Задайте сочетание клавиш в chrome://extensions/shortcuts |
| 28 | `popupLanguageLabel` | Language | Язык |
| 29 | `popupLanguageBrowser` | Browser language | Язык браузера |
| 30 | `popupSaveError` | Could not save settings | Не удалось сохранить настройки |
| 31 | `popupLoadError` | Could not load settings — close and reopen the popup | Не удалось загрузить настройки — закройте и снова откройте окно |
| 32 | `popupLanguageError` | Could not change the language | Не удалось сменить язык |
| 33 | `liveGuardTitle` | Spoiler protection is active | Защита от спойлеров включена |
| 34 | `liveGuardPaused` | This live stream was paused before showing the current moment. | Трансляция поставлена на паузу, чтобы не показать текущий момент. |
| 35 | `liveGuardUnknownStatus` | Couldn't tell whether this is a live stream. | Не удалось понять, прямая ли это трансляция. |
| 36 | `liveGuardChecking` | Checking whether the stream can be rewound… | Проверяем, можно ли перемотать трансляцию… |
| 37 | `liveGuardCannotRewind` | This stream can't be rewound. Continue live or leave the page. | Эту трансляцию нельзя перемотать. Смотрите в прямом эфире или уйдите со страницы. |
| 38 | `liveGuardJumpFailed` | Couldn't jump to the beginning. | Не удалось перейти к началу. |
| 39 | `liveGuardStartButton` | Start from beginning | Смотреть с начала |
| 40 | `liveGuardContinueButton` | Continue live | Смотреть в прямом эфире |
| 41 | `liveGuardPlayButton` | Play | Воспроизвести |
| 42 | `liveGuardAdNote` | Ad — the choice will appear after it | Реклама — выбор появится после неё |
| 43 | `commentsHiddenTitle` | Comments hidden | Комментарии скрыты |
| 44 | `commentsShowButton` | Show comments | Показать комментарии |
| 45 | `skipBack10Minutes` | Back 10 minutes | Назад на 10 минут |
| 46 | `skipBack1Minute` | Back 1 minute | Назад на 1 минуту |
| 47 | `skipBack10Seconds` | Back 10 seconds | Назад на 10 секунд |
| 48 | `skipForward10Seconds` | Forward 10 seconds | Вперёд на 10 секунд |
| 49 | `skipForward1Minute` | Forward 1 minute | Вперёд на 1 минуту |
| 50 | `skipForward10Minutes` | Forward 10 minutes | Вперёд на 10 минут |
| 51 | `mediaHiddenTitle` | YouTube video | Видео на YouTube |

Points worth the owner's eye:

- #19 «Значки видео»: YouTube's Russian term for a thumbnail.
- #12/#24: «трансляции», not «прямые эфиры».
- #31: «окно» for the popup.
- The store page (`store/listing.ru.md`) says «эпизодах, тексте видео» for chapters and transcript. Argon says these are YouTube's Russian UI terms; Claude did not verify that against the live Russian YouTube.

## 4. Live check

Rig: `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\`, script `r2.mjs`, extension copy `ext-r2`, logs `out-r2-de2.log`,
`out-r2-ru.log`, `out-r2-ja2.log`, screenshots `out-r2/<code>/`.

Setup:

- Chromium 1248, headless;
- `--lang=<code>`, plus Playwright `locale`;
- a new empty profile per run;
- all settings on;
- the popup page opened as a tab at 400×900; the shell itself is 352 px;
- YouTube video `RwB09qzaNdU`.

The "clipped" check walks every element in `.shell` and flags an element if either:

- its `overflow` or `text-overflow` cuts content (scroll size > client size);
- its box sticks out of the 352 px shell.

| Check | Expected | de | ru | ja |
|---|---|---|---|---|
| `chrome.i18n.getUILanguage()` / `manifestName` in the worker | the browser language / the local name | de / Anti-Spoiler für YouTube | ru / Anti-Spoiler для YouTube | ja / Anti-Spoiler for YouTube |
| Popup texts = locale file (23 `data-yas-i18n` elements), light and dark | 0 mismatches | 0 | 0 | 0 |
| `<html lang>` | the code | de | ru | ja |
| Clipped elements: light, dark, off state, "Requires" state, longest error line injected into the status line | 0 | 0 in all 5 | 0 in all 5 | 0 in all 5 |
| Horizontal page scroll | no | no | no | no |
| Off state texts | `popupStatusOff` / `popupNoteOff` | match | match | match |
| Skip note with the bar shown | `popupSkipButtonsRequires` | match | match | match |
| Visual check of the screenshots (wrapping, uppercase, nothing cut) | clean | clean (long note wraps to 2 lines) | clean | clean after the ja fix (before: a lone 「ー」, see §2) |
| YouTube comments cover and the 6 skip button labels, browser language | the locale's texts | Kommentare ausgeblendet / 10 Minuten zurück | Комментарии скрыты / Назад на 10 минут | コメントは非表示です / 10分戻る |
| Pick another language in the popup | `uiLanguage.code` stored, 51 keys; popup re-translated, 0 mismatches; cover and skip labels switch **in place** (same DOM node) | picked ja: stored ja, 51; cover コメントは非表示です, 10分戻る; same node | picked de: stored de, 51; Kommentare ausgeblendet; same node | picked ru: stored ru, 51 (popup only; YouTube run before the last ja fix: Комментарии скрыты, same node) |
| Pick "Browser language" again | `uiLanguage` removed; popup and cover back to the browser language | removed; de again | removed; ru again | removed; ja again |
| Page and extension errors | 0 | 0 | 0 | 0 |
| `npm test` | all pass | 258 / 258 / 0 failures (before R2: 257) | | |

Screenshots in the repo, `docs/research/2026-11-06/r2-shots/`:

- `de-popup-light.png`, `de-popup-long-status.png`, `de-popup-requires.png`;
- `ru-popup-light.png`, `ru-popup-dark.png`, `ru-popup-off.png`;
- `ja-popup-light.png`, `ja-popup-dark.png`;
- `de-browser-picked-ja.png`.

## 5. Not checked

1. **Screenshots of the YouTube comments cover.** The cover's text was read from the DOM in every language, but the clipped screenshot failed: Playwright returned no bounding box for `.yas-comments-guard-panel`, so `shot fail` appears in the logs. The cover's wrapping in German and Russian was not seen.
2. **The live guard panel and the live chat cover in other languages.** No live stream was opened in R2. Their texts go through the same `setText` path as the cover, which was checked, but their layout with long German or Russian strings was not seen.
3. **es, pt_BR, fr, ko, id and tr in the browser.** These were checked by the key and length tests and by the reviewers only, not live. German and Russian are the longest, Japanese is the CJK case.
4. **The real toolbar popup frame.** The popup was opened as a tab. The shell width (352 px) is the same, but the toolbar frame itself was not tested.
5. **The store pages in the Dashboard.** Nothing was uploaded. The Dashboard's per-language fields and its rendering are not checked.
6. **The exact YouTube labels:**
   - "Most replayed" in ru, es, fr, de, ja, tr and ko. ko keeps a quoted 「가장 많이 다시 본 장면」 from the first draft; Argon did not object, but no source was seen.
   - Russian «эпизоды» and «текст видео».
   - Indonesian «segmen video».
   They were not confirmed in the live localized YouTube UI.
7. **`mediaHiddenTitle` in the system media controls**, in another language. It is covered by unit tests only.
8. **A native speaker.** No native speaker has read any language. The owner reads Russian.

## 6. Follow-ups (not in R2)

- Version 0.4.0, README, and the postponed live checks of 0.3.0 and portion 5, as listed in STATE "Next" step 5.
- Possibly add "Interface in 10 languages" to the English store text and then to the 9 translations. It was not added, so the translations stay faithful to `store/listing.md`.
- Store screenshots per language for the Dashboard.
