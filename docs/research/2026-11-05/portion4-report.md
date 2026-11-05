# Порция 4: отчёт исполнителя (F2–F5)

План: `docs/superpowers/plans/2026-11-05-features-first-wave.md`, разделы F2–F5 и «Уточнения главной сессии перед запуском F2–F5».
F1 не трогал. Git не трогал (ни коммитов, ни stash, ни веток). Разрешения в manifest не добавлял.
YouTube живьём не запускал: всё ниже проверено только unit-тестами, визуальное поведение не заявляю.

## Итог `npm test`

| Момент | Ожидание | Факт |
|---|---|---|
| До порции | 169/169 | 169 тестов, 169 pass, 0 fail |
| После подключения ключей, до правки старых тестов | известные падения от новых ключей | 169 тестов, 161 pass, 8 fail (перечни ключей в settings/content/manifest, счёт таймеров в одном тесте чат-гарда) |
| Итог | всё зелёное | **202 теста: 202 pass, 0 fail, 0 cancelled, 0 skipped** |

Новых тестов 33: 11 (F2) + 7 (F3) + 7 (F4) + 7 (F5) + 1 (попап). Ещё добавлена одна проверка в `tests/release.test.js` (в ZIP попадает `src/content/skip-buttons.js`).

## Пункты плана

### Подключение настроек — сделано
- `src/shared/settings.js`: `showSkipButtons: true`, `hideComments: true` в `DEFAULT_SETTINGS` и в `normalizeSettings`.
- `src/content/content.js`: `CLASS_BY_SETTING` — `showSkipButtons: "yas-show-skip-buttons"`, `hideComments: "yas-hide-comments"`. Классы ставятся только при включённой защите, как остальные (через существующий `getEnabledClassNames`). Слушатель `storage.onChanged` берёт ключи из `CLASS_BY_SETTING`, поэтому реагирует и на новые.
- `popup/popup.html`: две строки по образцу соседних — «Skip buttons» / «Jump ±10 s, 1 min, 10 min while the timeline is hidden» (после «Hide progress bar») и «Hide comments» / «Blur comments under videos until you choose to show them» (после «Hide video titles»). `popup.js` не менялся: он работает со всеми `[data-setting]` и `SETTING_KEYS`.
- Обновлены тесты, перечисляющие ключи: `tests/settings.test.js` (4 теста), `tests/popup.test.js` (список переключателей в `loadPopup`, проверки HTML, новый тест «popup shows skip buttons and comment hiding on by default and saves them when changed»), `tests/content.test.js` («getEnabledClassNames maps enabled settings to stable root classes» — новые ключи и классы; «getEnabledClassNames keeps time hiding enabled when stored setting is false» — новые ключи явно `false`; «chat spoiler guard keeps checking once a second after the quick retries» — `hideComments: false`, потому что тест считает только таймеры чат-гарда), `tests/manifest.test.js` (порядок скриптов).

### F2. Кнопки перемотки без шкалы — сделано
- Новый файл `src/content/skip-buttons.js` (в стиле `settings.js`: функции в `globalThis.YouTubeAntiSpoiler`, `module.exports` для тестов): `SKIP_STEPS` (`−10m −1m −10s +10s +1m +10m`), `getSkipBounds(video)`, `skipVideo(video, seconds)`, `ensureSkipButtons(doc)`.
- Вставка: `#movie_player .ytp-left-controls`, контейнер `div.yas-skip-buttons`, в конец левых контролов; повторно не вставляется, если контейнер уже есть.
- Клик: `preventDefault()` + `stopPropagation()`; `<video>` ищется на каждый клик (`#movie_player video`); нет видео — ничего не делает.
- Границы: `[seekable.start(0), seekable.end(length - 1)]`, если `seekable.length > 0`, иначе `[0, duration]`, если длительность конечна; иначе перемотки нет. Время нигде не показывается.
- Видимость — только CSS в `buildSpoilerCss`: по умолчанию `#movie_player .yas-skip-buttons { display: none }`, показ — `html.yas-extension-enabled.yas-hide-player-progress-bar.yas-show-skip-buttons:not(.yas-live-start-obscured) #movie_player .yas-skip-buttons`. Стиль — белый текст, без рамок и фона, 13px Roboto.
- Повторная вставка: в `init()` — на тех же событиях навигации (`refresh` теперь ещё вызывает `ensureSkipButtons`) и `setInterval` раз в 1 с (`SKIP_BUTTONS_CHECK_MS`). MutationObserver не добавлял.
- `manifest.json`: `src/content/skip-buttons.js` перед `src/content/content.js` в изолированном мире; `content.js` в Node подтягивает его через `require`.
- Тесты (`tests/skip-buttons.test.js`): skip buttons are inserted once into the player's left controls; skip buttons wait for the player controls to exist; skip buttons come back after YouTube rebuilds the player controls; skip button click seeks the player's video and does not reach the player; skip button click without a video does nothing; skipVideo keeps a regular video between 0 and its duration; skipVideo keeps a live stream inside its seekable window; getSkipBounds uses the last seekable range end; skipVideo does nothing before the video knows its length; skip buttons are hidden by default and shown only with a hidden timeline and no live guard; skip button classes follow the settings and protection switch.

### F3. Комментарии за «Show comments» — сделано
- `content.js`: `syncCommentsGuard(settings, doc)`, `renderCommentsGuardOverlay`, `removeCommentsGuard`, `clearCommentsGuardCheck` — по образцу чат-гарда, отдельным кодом. Вызов — из `applySettings` сразу после `syncChatGuard`.
- Хост оверлея — `ytd-comments#comments`; оверлей `#youtube-anti-spoiler-comments-guard`, заголовок «Comments hidden», кнопка «Show comments» (`data-comments-guard-action="show"`); класс-признак на `<html>` — `yas-comments-obscured`.
- Видео — id из `shared.getLiveStartVideoId`; «Show comments» действует только для этого id, при смене id — снова скрыто.
- Проверка раз в 1 с (`COMMENTS_GUARD_CHECK_MS`) — только пока есть id видео; вне страниц просмотра обложка снимается и таймера нет. Нажатие кнопки снимает обложку и останавливает проверку.
- CSS: `ytd-comments#comments` — `position: relative`; `ytd-comments#comments #contents` — `blur(18px)` + `pointer-events: none`; `ytd-comments-entry-point-header-renderer` — `blur(18px)` (кликабельность сохранена, см. допущения); оверлей — `position: absolute; inset: 0; z-index: 10`, панель с кнопкой — `position: sticky; top: 80px`.
- Тесты (`tests/comments-and-tab-title.test.js`): comments guard blurs comments under a video behind a Show comments button; comments guard CSS blurs the comment list and the comment teaser only while obscured; Show comments uncovers this video's comments and stops the checks; comments guard covers the comments again on the next video; comments guard stays off when the setting or protection is off; comments guard does not run or schedule checks outside video pages; comments guard checks once a second for lazily loaded and re-created comments.

### F4. Название во вкладке — сделано
- `content.js`: `syncTabTitle(doc)`, `observeTabTitle(doc, titleElement)`, `isOnVideoPage()`. Вызов — из `applySettings`, из колбэка `MutationObserver` и на `DOMContentLoaded` (в `init()`).
- Условие: класс `yas-hide-video-titles` на `<html>` (он есть только при включённой защите) и путь `/watch`, `/live/…` или `/shorts/…`. Тогда `document.title = "YouTube"`, а заголовок YouTube запоминается.
- `MutationObserver` — только на элементе `<title>` (`childList`, `characterData`, `subtree`); если YouTube заменит сам элемент `<title>`, наблюдатель переподключается при следующей синхронизации.
- Своя запись отличается сравнением с подставленным значением `"YouTube"`.
- Выключили опцию или защиту на странице видео — возвращается последний заголовок YouTube (если во вкладке всё ещё наш `"YouTube"`).
- Тесты (`tests/comments-and-tab-title.test.js`): tab title shows YouTube on a watch page while video titles are hidden; tab title replaces every title YouTube sets and ignores its own write; tab title comes back when protection is switched off; tab title is hidden on live and Shorts pages too; tab title is left alone on other pages and when titles are not hidden; tab title of a video that was left does not come back on the next page; tab title waits for the <title> element at document start.

### F5. Системные медиаконтролы — сделано в коде, работа в Chrome не проверена
- `src/content/live-player-bridge.js` (MAIN world): `patchMediaSession(win)` вызывается из `initLivePlayerBridge` сразу после `patchHistory`.
- `MediaSession.prototype.setPositionState`: при классе `yas-extension-enabled` на `<html>` вызывается оригинал **без аргументов** (по спецификации Media Session пустой словарь сбрасывает position state), иначе — с аргументами страницы.
- Сеттер `metadata` на `MediaSession.prototype` (через `Object.defineProperty` с исходным геттером): при `yas-hide-video-titles` — `title: "YouTube video"`, при `yas-hide-video-previews` — `artwork: []`; создаётся новый `MediaMetadata` (`title`, `artist`, `album`, `artwork`), объект YouTube не меняется; без этих классов и для `null` — передаётся как есть.
- Нет `navigator.mediaSession` / `MediaSession` / `MediaMetadata` — патч пропускается (`false`).
- Тесты (`tests/media-session.test.js`): media session gets no position or duration while protection is on; media session passes the position through when protection is off; media session title is replaced while video titles are hidden; media session artwork is dropped while previews are blurred; media session metadata is untouched without the hiding classes; media session patch skips a page without the Media Session API; live player bridge init patches the media session.

## Изменённые файлы
- `src/shared/settings.js` — два новых ключа.
- `src/content/skip-buttons.js` — **новый**.
- `src/content/content.js` — `require("./skip-buttons.js")`, константы F3/F4, `CLASS_BY_SETTING`, CSS F2/F3 в `buildSpoilerCss`, функции F3/F4, вызовы в `applySettings`, `init()` (навигация + интервал кнопок + `DOMContentLoaded`), экспорт `COMMENTS_GUARD_OBSCURED_CLASS`, `COMMENTS_GUARD_OVERLAY_ID`, `COMMENTS_GUARD_CHECK_MS`, `HIDDEN_TAB_TITLE`.
- `src/content/live-player-bridge.js` — F5, экспорт `patchMediaSession`, `HIDDEN_MEDIA_TITLE`.
- `manifest.json` — `src/content/skip-buttons.js` в списке изолированного мира.
- `popup/popup.html` — две строки настроек.
- Тесты: `tests/settings.test.js`, `tests/popup.test.js`, `tests/manifest.test.js`, `tests/release.test.js`, `tests/content.test.js` (3 точечные правки); **новые** — `tests/skip-buttons.test.js`, `tests/comments-and-tab-title.test.js`, `tests/media-session.test.js`.
- Этот отчёт.

## Не сделано
- **Живая проверка на YouTube** всех четырёх функций — нет браузера с YouTube в этой порции; список — ниже.
- **F5: позиция, которую Chrome берёт прямо из `<video>`.** Если страница не задала position state, Chrome показывает позицию и длительность по самому медиаэлементу. Это не убрать из страницы — по плану записано как ограничение, обхода нет.
- **F5: смена настроек посреди видео.** Подмена метаданных происходит в момент, когда YouTube их задаёт. Включили «Hide video titles» / «Blur previews» посреди ролика — в системных контролах остаётся старое название/обложка до следующей записи YouTube (обычно следующее видео); выключили — остаётся «YouTube video». Повторную подмену по смене классов не делал: план её не требует, а для неё нужен наблюдатель за `<html>` в MAIN world.
- **F5: `chapterInfo`** (главы в `MediaMetadata` новых Chrome) в новый объект не переносится — при подмене главы в системных контролах пропадают. Для антиспойлера это скорее плюс (названия глав — спойлер), но это решение не из плана.
- **F3: панель комментариев (engagement panel) и комментарии Shorts** не закрываются: в плане только `ytd-comments#comments #contents` и превью `ytd-comments-entry-point-header-renderer`. На Shorts `getLiveStartVideoId` id не даёт, поэтому гард там не работает вовсе.

## Допущения (план не решал)
1. **F3, тизер комментариев** `ytd-comments-entry-point-header-renderer` — только блюр, без `pointer-events: none`. Если тизер окажется вне `#comments`, при запрете кликов пользователь вообще не смог бы открыть комментарии (кнопки там нет). Открыть панель комментариев кликом по тизеру — считается выбором пользователя.
2. **F3, страница просмотра** — любая, для которой `getLiveStartVideoId` даёт id (`/watch`, `/live/ID`, канал `/live`), как у чат-гарда.
3. **F3, вид оверлея** — тёмная подложка поверх всего блока `#comments` (включая заголовок с числом комментариев и поле ввода), панель с кнопкой прилипает (`sticky`, `top: 80px`) — блок комментариев может быть очень длинным. `z-index: 10`, а не максимальный, как у чат-гарда: оверлей в обычном потоке страницы и не должен перекрывать фиксированную шапку YouTube.
4. **F4, уход со страницы видео** — запомненный заголовок забывается, а не восстанавливается: YouTube сам ставит заголовок новой странице. Если бы восстанавливали, при записи YouTube «YouTube» (главная) до смены адреса во вкладке всплыло бы название ушедшего видео — это спойлер. Цена: если YouTube запишет заголовок новой страницы ещё до смены адреса, во вкладке может остаться «YouTube» вместо, например, «Subscriptions - YouTube».
5. **F4, загрузка страницы с нуля** — на `document_start` элемента `<title>` ещё нет; добавлен слушатель `DOMContentLoaded`. Между разбором `<title>` и `DOMContentLoaded` настоящее название может мелькнуть во вкладке (наблюдатель на `<head>`/документ ради этого не ставил — план ограничивает наблюдатель элементом `<title>`).
6. **F5, `setPositionState`** — оригинал вызывается без аргументов (сброс), а не пропускается: иначе состояние, заданное до включения защиты, продолжало бы «тикать». Если живая проверка покажет, что Chrome бросает исключение или плеер ломается, — заменить `return originalSetPositionState.call(this);` на `return;` (одна строка, `live-player-bridge.js`, `patchedSetPositionState`).
7. **F2, интервал** — `setInterval` раз в 1 с работает на всех страницах YouTube (плеер бывает и вне `/watch`: мини-плеер, трейлер канала); кнопки вставляются в любой `#movie_player`, видимость решает CSS.
8. **F2, подписи** — со знаком минус U+2212 (`−10m`), как в плане; `title` и `aria-label` — «Back 10 minutes» / «Forward 10 seconds» и т. п.

## Что проверить живьём
Стенд: Chrome, распакованное расширение из этого worktree, `https://www.youtube.com`.

F2:
1. `/watch` обычного ролика, защита вкл, «Hide progress bar» и «Skip buttons» вкл: в `#movie_player .ytp-left-controls` есть `div.yas-skip-buttons` с 6 кнопками; они появляются и прячутся вместе с остальными контролами; не обрезаются и не наезжают на громкость/название главы.
2. Клик `+1m` / `−10s`: ролик перематывается, не ставится на паузу, не открывается/закрывается полноэкранный режим, время нигде не появляется. `−10m` в начале → 0; `+10m` в конце → конец ролика.
3. Снять «Hide progress bar» или «Skip buttons», или выключить защиту — кнопок не видно (`display: none`).
4. Эфир с DVR: при live-guard (`html.yas-live-start-obscured`) кнопок нет; после выбора — `−10m` не уходит раньше начала окна DVR, `+10m` упирается в live edge.
5. Мини-плеер и полноэкранный режим: вид кнопок; после перехода на другое видео кнопки на месте (≤ 1 с).
6. После клика по кнопке нажать пробел: проверить, что это ожидаемо (фокус на кнопке).

F3:
7. `/watch` с комментариями: на `ytd-comments#comments` — оверлей `#youtube-anti-spoiler-comments-guard`, `#contents` размыт; при прокрутке подгружаются новые комментарии и тоже размыты; кнопка «Show comments» видна при прокрутке (sticky) и не перекрывает шапку YouTube.
8. «Show comments» → комментарии видны; переход на другое видео (SPA) → снова скрыты; назад на первое — снова скрыты (выбор не запоминается навсегда).
9. Узкое окно / новый макет: где находится `ytd-comments-entry-point-header-renderer` (внутри `#comments` или нет), размыт ли, открывается ли панель комментариев.
10. Оверлей виден в DOM (YouTube не использует для `ytd-comments` настоящий shadow DOM, иначе чужой дочерний `div` не отрисуется — у чат-гарда тот же приём).

F4:
11. «Hide video titles» вкл: на `/watch`, `/shorts/…`, `/live/…` вкладка — «YouTube»; переход между видео по SPA — остаётся «YouTube»; жёсткая перезагрузка `/watch` — заметно ли мелькание настоящего названия.
12. Выключить опцию или защиту на странице видео → во вкладке название текущего видео; уйти на главную/подписки → заголовок своей страницы, не название прошлого видео.

F5 (Windows, Chrome Global Media Controls и оверлей громкости Windows):
13. Защита вкл: в медиаконтролах нет полосы позиции/длительности (или она идёт только из `<video>` — тогда это ограничение, записать, что видно).
14. «Hide video titles» вкл: название — «YouTube video»; «Blur previews» вкл: нет обложки. Канал (artist) остаётся.
15. Плеер YouTube работает как прежде: пауза/следующее из медиаконтролов, никаких ошибок в консоли страницы от `setPositionState`.
