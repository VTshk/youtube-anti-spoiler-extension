# План: функции первой очереди (порция 4, 2026-11-05)

Репозиторий: `E:\vt\pet\projects\youtube-anti-spoiler-extension\.claude\worktrees\project-overview-62c71a`
(Chrome MV3, без сборки, тесты `npm test` = `node --test`). Основание — `docs/research/2026-11-05/SUMMARY.md` §5:
самые частые просьбы пользователей похожих расширений и функции конкурентов, которых у нас нет.
Порции 1–3 уже лежат незакоммиченными (скрытие времени и селекторы в `content.js`, защита эфиров в
`live-start-controller.js` / `live-player-bridge.js`, попап) — их поведение не менять.

## Функции

### F1. Горячая клавиша вкл/выкл защиты
- `manifest.json`: ключ `commands` с командой `toggle-protection`, `suggested_key` `{"default": "Alt+Shift+S"}`,
  `description` «Turn spoiler protection on or off». Новых `permissions` не добавлять (для `commands` не нужны).
- `src/background/background.js`: `chrome.commands.onCommand` → прочитать настройки, записать с перевёрнутым
  `extensionEnabled` (через `readSettings`/`writeSettings` из `settings.js`). Иконка обновится сама (уже слушает
  `storage.onChanged`).
- Попап: под переключателем — строка `Shortcut: Alt+Shift+S` с фактическим сочетанием из `chrome.commands.getAll()`;
  если сочетание не назначено — `Set a shortcut in chrome://extensions/shortcuts`.

### F2. Кнопки перемотки без шкалы
- Новая настройка `showSkipButtons` (по умолчанию `true`) в `settings.js` и чекбокс в попапе:
  «Skip buttons» / «Jump ±10 s, 1 min, 10 min while the timeline is hidden».
- Кнопки показываются, только когда защита включена **и** скрыта полоса прогресса (`hidePlayerProgressBar`), и не
  показываются, пока активен live-guard (класс `yas-live-start-obscured` на `<html>`).
- Набор: `−10m −1m −10s +10s +1m +10m`. Вставить в `.ytp-left-controls` плеера (появляются и прячутся вместе с
  остальными кнопками плеера). Стиль — в тон кнопкам плеера (белый текст, без рамок), CSS — в `buildSpoilerCss`.
- Перемотка: `video.currentTime` в пределах `[seekable.start(0), seekable.end(last)]`, если `seekable` есть, иначе
  `[0, duration]`. Не показывать нигде, куда перемотались (время скрыто — так и должно быть).
- Новый файл `src/content/skip-buttons.js` (подключить в manifest перед `content.js`), в стиле остальных модулей
  (функции в `globalThis.YouTubeAntiSpoiler`, экспорт для тестов). Повторная вставка при перерисовке плеера — по
  существующим событиям навигации и редкой проверке (раз в 1 с), без MutationObserver на весь документ.

### F3. Комментарии под видео — за кнопкой «Show comments»
- Новая настройка `hideComments` (по умолчанию `true`) и чекбокс: «Hide comments» / «Blur comments under videos until
  you choose to show them».
- На странице просмотра блюрить содержимое комментариев (`ytd-comments#comments #contents` и превью комментария под
  видео, если есть: `ytd-comments-entry-point-header-renderer`) и показать поверх блока кнопку «Show comments».
  Нажатие открывает комментарии **для этого видео**; при переходе на другое видео — снова скрыты (как у чат-гарда).
- Поведение — как у существующего чат-гарда в `content.js` (повтор кода допустим, общий «движок оверлеев» не делать).
  Повторная проверка раз в 1 с, пока страница того же видео (YouTube подгружает комментарии лениво при прокрутке).

### F4. Название во вкладке
- Когда включены защита и «Hide video titles», на страницах `/watch`, `/live/…`, `/shorts/…` заголовок вкладки —
  `YouTube`. YouTube меняет `document.title` при каждой навигации — следить за элементом `<title>`
  (`MutationObserver` только на нём) и заменять. Выключили опцию — вернуть последний заголовок YouTube.

### F5. Системные медиаконтролы (Chrome Global Media Controls, Windows)
- В MAIN world (`live-player-bridge.js` или новый маленький MAIN-скрипт — как проще): обернуть
  `navigator.mediaSession.setPositionState`, чтобы при классе `yas-extension-enabled` на `<html>` вызов не передавал
  позицию и длительность (вызывать без аргументов или не вызывать — проверить, что YouTube от этого не ломается).
- При классе `yas-hide-video-titles` подменять `title` в `MediaMetadata` на `YouTube video`; при
  `yas-hide-video-previews` — убирать `artwork`. Перехват — через сеттер `metadata` у `MediaSession.prototype`.
- MAIN world не видит `chrome.storage`; источник правды — классы на `<html>`, которые ставит `content.js`.

## Чего не делать
- Не менять поведение порций 1–3, кроме подключения новых настроек.
- Не добавлять `permissions`/`host_permissions`.
- Простой код: прямой поток, без новых слоёв и общих фреймворков. Строки интерфейса — по-английски.
- Git не трогать.

## Гейты
- `npm test` зелёный; тесты на каждую функцию: F1 (обработчик команды переворачивает `extensionEnabled`; manifest
  содержит команду и не добавил разрешений), F2 (кнопки есть/нет по условиям, перемотка с ограничением по `seekable`),
  F3 (блюр + кнопка, сброс при смене видео), F4 (замена и восстановление заголовка), F5 (позиция не передаётся при
  включённой защите, метаданные подменяются по классам).
- Отчёт `docs/research/2026-11-05/portion4-report.md`: «сделано / не сделано» по пунктам + имена тестов, итог `npm test`
  числами, изменённые файлы, «Не сделано» с причинами, «Что проверить живьём».

## Уточнения главной сессии перед запуском F2–F5 (2026-11-05)

- F1 уже сделан и проверен — не трогать. Порция 3 тоже легла в `content.js`: селекторы раскадровки/глав в
  `VIDEO_PREVIEW_SELECTORS` / `VIDEO_TITLE_SELECTORS`, `stashHoveredTitleAttribute` / `restoreStashedTitleAttributes`
  и слушатель `mouseover` в `init()`. Сохранить как есть. Исходная точка: `npm test` — 169/169.
- Настройки: новые ключи `showSkipButtons` и `hideComments` (оба по умолчанию `true`) — в `DEFAULT_SETTINGS` и
  `normalizeSettings` (`src/shared/settings.js`), в `CLASS_BY_SETTING` (`content.js`) с классами
  `yas-show-skip-buttons` и `yas-hide-comments` (классы на `<html>` ставятся только при включённой защите — как сейчас),
  и чекбоксами в `popup/popup.html` по образцу соседних строк (`data-setting`). Обновить тесты `settings`/`popup`,
  которые перечисляют ключи.
- F2: кнопки — внутри плеера `#movie_player .ytp-left-controls`; клик не должен всплывать в плеер (иначе YouTube
  ставит паузу/перематывает по своему обработчику) — `stopPropagation`. Условие показа проверять по классам на
  `<html>`: `yas-extension-enabled` + `yas-hide-player-progress-bar` + `yas-show-skip-buttons` и нет
  `yas-live-start-obscured`. Проще всего: кнопки вставлять всегда, когда есть плеер, а видимость задать CSS по этим
  классам. Под live-guard кнопки не показываются.
- F3: `#comments` на `/watch`. Оверлей с кнопкой «Show comments» — по образцу чат-гарда (`renderChatGuardOverlay`),
  отдельный id `youtube-anti-spoiler-comments-guard`, класс-признак на `<html>` `yas-comments-obscured`. Нажатие —
  только для текущего видео (id из `shared.getLiveStartVideoId`). Повторная проверка раз в 1 с только на странице
  просмотра; вне `/watch` таймеров нет.
- F4: `MutationObserver` только на `<title>` (`childList`, `characterData`, `subtree`); свою запись не принимать за
  запись YouTube (сравнивать с подставленным значением). Shorts — `/shorts/…`.
- F5: в `live-player-bridge.js` (MAIN world). Если `setPositionState` без аргументов в Chrome бросает или ломает
  плеер — не вызывать оригинал вовсе. Позицию, которую Chrome берёт прямо из `<video>`, убрать нельзя — записать в
  отчёт как ограничение, не обходить.
- Порция примерно на 150k контекста; на 250k — сдать итог и остаток работы, не дочитывать. Файлы читать разделами
  (`content.test.js` — 4600 строк: читать только хелперы в начале и пару тестов чат-гарда как образец).
- Довести все пункты до конца; неготовое — в разделе «Не сделано» отчёта с причиной.
