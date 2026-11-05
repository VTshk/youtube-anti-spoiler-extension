# Порция 5 — отчёт исполнителя (2026-11-05)

План: `docs/superpowers/plans/2026-11-05-portion5.md`. Исполнитель — `implementer` (Opus 5.5). Живую проверку в
браузере исполнитель не делал и не заявляет; всё ниже проверено только unit-тестами и чтением кода.

## Гейты

| Гейт | Ожидание | Факт |
|---|---|---|
| `npm test` до правок | 206/206 | 206 tests, 206 pass, 0 fail |
| `npm test` после правок | зелёный, > 206 | **219 tests, 219 pass, 0 fail, 0 cancelled, 0 skipped**, exit 0 |
| `node --check src/content/content.js` | ok | ok |
| `node --check src/content/live-player-bridge.js` | ok | ok |
| `node --check` четырёх изменённых тест-файлов | ok | ok |
| Тест падает без фикса | хотя бы П2 и П4 | 9 мутаций на временной копии вне репозитория — каждая ловится (таблица ниже) |

Проверка «тест падает без фикса» (копия дерева во временной папке, по одной мутации, копия удалена):

| Мутация | Упало тестов |
|---|---|
| П2: убран обход панелей `querySelectorAll(COMMENTS_PANEL_SELECTOR)` | 5 |
| П2: id Shorts не берётся из `/shorts/<id>` | 3 |
| П2: снятие оверлеев только по id, а не по классу | 3 |
| П2: CSS-блюр `ytd-section-list-renderer` в панели | 1 |
| П4: мост не ставит атрибут | 2 |
| П4: мост не запускает проверку раз в секунду | 2 |
| П4: CSS без `:not([data-yas-seek-blocked])` | 1 |
| П1: убраны два селектора названия | 2 |
| П3: нет правила скрытия `.ytp-heat-map-container` | 1 |

## Что сделано

### П1. Название открытого видео и строка под ним — под «Hide video titles»
- `src/content/content.js:217–224` — в `VIDEO_TITLE_SELECTORS` добавлены `ytd-watch-metadata h1` и
  `ytd-watch-metadata ytd-watch-info-text` с комментарием. Попадают в общее правило `filter: blur(8px)` (клики не
  блокируются) и в `VIDEO_TITLE_SELECTOR_LIST`, поэтому нативная подсказка `title` у `h1 yt-formatted-string`
  уходит в `data-yas-title` уже существующим механизмом (`stashTitleAttribute`), без новой логики.

### П2. «Show comments» в панели комментариев (`/watch`) и на Shorts
- `content.js:26–36` — константы `COMMENTS_GUARD_OVERLAY_CLASS = "yas-comments-guard-overlay"` и
  `COMMENTS_PANEL_SELECTOR` (дословно из плана).
- CSS `content.js:442–499`:
  - `html.yas-comments-obscured PANEL > #content` — `position: relative`;
  - `html.yas-comments-obscured PANEL > #content > ytd-section-list-renderer` — `blur(18px)`, `pointer-events: none`;
  - внешний вид оверлея, заголовка и кнопки переведён с `#youtube-anti-spoiler-comments-guard` на общий класс
    `.yas-comments-guard-overlay` (те же свойства); `position: sticky; top: 80px` у внутренней панели осталось только
    для оверлея под видео (`#youtube-anti-spoiler-comments-guard .yas-comments-guard-panel`). В панели кнопка сверху
    по центру (`align-content: start`, `justify-items: center`, как было).
  - правила для тизера `ytd-comments-entry-point-header-renderer` и для `ytd-comments#comments` не менялись.
- JS `content.js:782–923`:
  - `removeCommentsGuard` (`:800`) — снимает все оверлеи по общему классу и класс `yas-comments-obscured`;
  - `renderCommentsGuardOverlay` (`:809`) — оверлей под видео, как раньше, с id `COMMENTS_GUARD_OVERLAY_ID`
    (экспорт сохранён) и общим классом;
  - `renderCommentsPanelOverlay` (`:828`) — оверлей дочерним элементом `PANEL > #content`, рядом с размытым
    `ytd-section-list-renderer`; второй в тот же `#content` не вставляется;
  - `createCommentsGuardOverlay` (`:842`) — сборка оверлея (без флагов), вынесена из прежнего
    `renderCommentsGuardOverlay`; клик «Show comments» в любом оверлее снимает все оверлеи и класс для текущего видео;
  - `getCommentsGuardVideoId` (`:875`) — на `/shorts/<id>` берёт `<id>`, иначе `shared.getLiveStartVideoId`
    (не менялся);
  - `syncCommentsGuard` (`:887`) — как раньше, плюс обход всех панелей (`:912`); та же проверка раз в секунду
    достраивает оверлей в панели, созданной или перерисованной позже. Смена id (другое видео / другой Short) сбрасывает
    решение «Show comments».

### П3. «Most replayed» — под «Blur previews»
- `content.js:294–302` — отдельное правило `html.yas-hide-video-previews .ytp-heat-map-container`:
  `visibility: hidden`, `opacity: 0`, `pointer-events: none`, с комментарием про пики на голах. В
  `VIDEO_PREVIEW_SELECTORS` не добавлялось.

### П4. Кнопки перемотки не показываются, когда плеер запрещает перемотку
- `src/content/live-player-bridge.js:27–32` — `SEEK_BLOCKED_ATTRIBUTE = "data-yas-seek-blocked"`,
  `SEEK_BLOCKED_CHECK_MS = 1000`.
- `live-player-bridge.js:287–297` — `syncSeekBlockedAttribute(doc)`:
  `player.toggleAttribute(SEEK_BLOCKED_ATTRIBUTE, getPlayerCanRewind(player) === false)`; `null` и `true` — атрибут
  снят; при неизменном состоянии мутаций нет.
- `live-player-bridge.js:697–702` — в `initLivePlayerBridge` `currentWindow.setInterval(..., 1000)`; при отсутствии
  `setInterval` в тестовом окне — пропуск. Экспортированы `SEEK_BLOCKED_ATTRIBUTE`, `SEEK_BLOCKED_CHECK_MS`,
  `syncSeekBlockedAttribute`.
- `content.js:38–40` — константа атрибута; `content.js:396–405` — правило показа кнопок дополнено
  `#movie_player:not([data-yas-seek-blocked])`, комментарий про эфир без DVR. `skip-buttons.js` не трогался.

### П5. Раскадровка
Не трогалась: `.ytp-tooltip-bg`, `.ytp-storyboard-framepreview-img` остаются в `VIDEO_PREVIEW_SELECTORS`; тест П3
это закрепляет.

### П6. README и тексты
- `README.md`: вводный список (превью — «Most replayed» скрыт; названия — над открытым видео; комментарии — панель и
  Shorts); «Skip buttons» — не показываются на эфирах, где плеер запрещает перемотку; «Blur previews» — скрытие
  «Most replayed»; «Hide video titles» — фраза «The title of the open video above the description stays visible»
  убрана, вместо неё размытие названия и строки под ним; «Hide comments» — панель и Shorts, шапка панели рабочая,
  решение на видео или Short; раздел «Live streams» — одна фраза про кнопки на эфире без перемотки (противоречий
  в нём не было).
- `store/listing.md`: три строки списка возможностей (комментарии, превью, названия). Короткое описание и версия не
  менялись.
- `popup/popup.html` — не менялся: подписи стали неполными, но не неверными («Blur comments under videos…»,
  «Apply a strong blur to previews», «Blur titles in lists…»).

## Тесты

Новые (13):
- `tests/comments-and-tab-title.test.js:412` — П2(а) гард на `/shorts/<id>`, оверлей в панели, шапка не закрыта.
- `:434` — П2(б) все панели на `/watch` (открытая и скрытая) получают по одному оверлею в `#content` после
  повторных вызовов; оверлей рядом со списком, не внутри.
- `:455` — панель, созданная позже и перерисованная, закрывается проверкой раз в секунду.
- `:479` — П2(в) клик в панели снимает все оверлеи (и под видео) и класс; тот же Short — решение держится;
  следующий Short — снова закрыт.
- `:508` — клик под видео снимает и оверлей в панели.
- `:521` — П2(г) выключение `hideComments` и всей защиты снимает оверлеи в панелях.
- `:544` — П2(д) CSS: `position: relative` у `PANEL > #content`, блюр `PANEL > #content > ytd-section-list-renderer`.
- `tests/content.test.js:4642` — П1 CSS: оба селектора в правиле `blur(8px)`.
- `:4655` — П1: `title` у элемента внутри `ytd-watch-metadata h1` уходит в `data-yas-title`.
- `:4678` — П3: правило скрытия `.ytp-heat-map-container`; не в блюр-правиле; раскадровка по-прежнему в блюре.
- `tests/live-player-bridge.test.js:858` — П4: интервал 1000 мс; `allowSeeking:false` с известным окном → атрибут;
  `true` → снят.
- `:885` — П4: неизвестное окно (`0–0`, нет состояния) → атрибут снят.
- `:905` — П4: без плеера проверка не падает.

Изменённые существующие:
- `tests/comments-and-tab-title.test.js:288` — CSS-утверждение `#youtube-anti-spoiler-comments-guard { position:
  absolute` заменено на `.yas-comments-guard-overlay { position: absolute; inset: 0` плюс проверка sticky у оверлея под
  видео (следствие перевода внешнего вида на общий класс).
- `tests/skip-buttons.test.js:225` — ожидаемый селектор показа теперь с `#movie_player:not([data-yas-seek-blocked])`
  (это и есть CSS-тест П4).
- Фейковый документ в `tests/comments-and-tab-title.test.js` расширен: `querySelectorAll` отвечает на селектор
  панели и на класс оверлея, у элементов есть `findAllByClass` и `querySelector(":scope > …")`. Утверждения прежних
  тестов комментариев не менялись; три из них без расширения фейка падали бы, потому что снятие оверлея теперь идёт
  через `querySelectorAll` по классу.

## Допущения
1. В CSS и в поиске `#content` — дочерний комбинатор (`PANEL > #content`, `> ytd-section-list-renderer`), а не
   потомок, как написано в плане (`PANEL #content`). Структура подтверждена деревом панели Shorts из
   `yas-audit2/out-p12b/probe-p5.json` (`#header`, `#content`, `#footer` — прямые дети панели; в шапке `#content`
   нет). Потомок задел бы вложенные `#content` внутри комментариев.
2. Внешний вид всех оверлеев — по общему классу `.yas-comments-guard-overlay`; id остался только у оверлея под
   видео (sticky-правило, защита от дубля, экспорт и прежние тесты). Снятие — только по классу.
3. id Shorts берётся из `pathname` `/shorts/<id>` как есть (без `decodeURIComponent`: id Shorts — `[A-Za-z0-9_-]`).
4. `popup/popup.html` не менялся (см. П6).

## Риски и что не проверено (только unit-тесты, браузер не открывался)
- `filter` на `ytd-watch-info-text` делает его содержащим блоком для подсказки `tp-yt-paper-tooltip` с точной
  датой: подсказка будет размыта, но может оказаться смещённой. Проверить по кадру.
- `allowSeeking: false` может приходить и во время рекламы: тогда кнопки перемотки на время рекламы тоже скрываются.
  Не замерялось.
- После клика «Show comments» на Short проверка раз в секунду останавливается (как и раньше под видео); новый Short
  закрывается при событии навигации (патч `history` в мосту / `yt-navigate-finish`). Что листание Shorts стрелкой
  вызывает это событие — не проверено.
- На `/shorts/` оверлей под видео вставляется и в оставшуюся в DOM скрытую страницу `/watch` — невидимо, вреда нет.
- Специфичность правил оверлея снизилась с id до класса; все объявления `!important`, поэтому конкурируют только
  `!important`-правила YouTube. Видимость кнопки и `z-index: 10` внутри `#content` панели не проверены.
- Структура панели на `/watch` взята из плана («одинаково на `/watch` и Shorts»); дерево сам я видел только для Shorts.

## Замечание по базе
План (строка 4) говорит, что порции 1–4 лежат незакоммиченными, но `git status` в начале сессии показывал только
неотслеживаемые `.playwright-mcp/` и файл плана — изменённых отслеживаемых файлов не было (последний коммит
`55ffa47 … release 0.3.0`). Сейчас в `git status --short` — только правки этой порции (8 файлов) и этот отчёт.
Git исполнитель не трогал.

## Не сделано
Пусто: все пункты П1–П6 и все тесты из плана выполнены. Живая проверка в браузере по плану остаётся главной сессии.
