# Аудит селекторов на живом youtube.com — 2026-11-05

## Как проверял

- **Дата и время:** 2026-11-05, 13:15–13:58 (UTC+3). Без входа в аккаунт; IP в России (в шапке YouTube — «RU»); на новом профиле YouTube показал страницу согласия (gl=FI), нажато «Reject all». Интерфейс — английский (`PREF=hl=en&gl=US`, `locale: en-US`).
- **Источник селекторов:** `src/content/content.js:43–138` (6 групп: `THUMBNAIL_DURATION_SELECTORS` с суффиксом `LIVE_THUMBNAIL_BADGE_EXCLUSION`, `PLAYER_TIME_SELECTORS`, `PLAYER_PROGRESS_SELECTORS`, `THUMBNAIL_PROGRESS_SELECTORS`, `VIDEO_PREVIEW_SELECTORS`, `VIDEO_TITLE_SELECTORS`). Скрытие в `content.js` делается только через CSS (`buildSpoilerCss`); в `live-start-controller.js` селекторы служебные (meta `itemprop`, `#movie_player`, чат) и спойлеры не прячут.
- **Два прогона:**
  1. *Playwright MCP, без расширения* (13:15–13:30): правила CSS собраны из тех же списков селекторов и вставлены на страницу. Прогон прервался: браузер MCP общий, другая сессия открыла в этой же вкладке свою страницу, а потом перезапустила браузер. У chrome-devtools MCP профиль был занят («browser is already running»).
  2. *Основной прогон — своё расширение, настоящий CSS* (13:42–13:58): отдельный Playwright 1.65 (npx-кэш) + Chromium 1248 headless; **расширение загружено распакованным** (`--load-extension`, копия репозитория во временной папке). Все настройки включены через `chrome.storage.sync` (`hideVideoPreviews` и `hideVideoTitles` тоже); на каждой странице `ext=true`, у `<html>` есть все классы `yas-*`.
- **Метод:** на каждом шаге — (а) `querySelectorAll` по каждому селектору (вместе с суффиксом исключения LIVE); (б) поиск видимых узлов, которые не скрыты расширением: текст по шаблону `\d{1,2}:\d{2}(:\d{2})?`; элементы с `progress/resume/watched/heat-map/scrubber/role=slider`; картинки `i.ytimg.com/vi/` (`<img>` и вычисленный `background-image`); заголовки; «Streamed…/watching/LIVE». Узел считается скрытым, если у него или у предка `display:none`, `opacity:0`, собственный `visibility:hidden` или `blur ≥ 6px`. Отдельно записано, если время размыто только картинкой превью (`time-blur-only`): при выключенной настройке превью оно будет видно.
- **Сценарии (снимки):** главная; поиск «F1 highlights», «Champions League highlights», «NBA highlights», поиск с фильтром Live; просмотр `RwB09qzaNdU` (с главами): старт, воспроизведение с панелью управления, наведение на таймлайн, `→` и `5`, раскрытое описание и комментарии, панель глав, расшифровка; конец видео `FfocLPf6-g0` (−20 с, −1 с, полноэкранный режим `f`); мини-плеер (`i`); вкладки канала `@NBA` Videos / Live / Shorts; страница Shorts; живой эфир `dD1jAjrBedI` (с заслонкой расширения и после «continue»); запись эфира `RgJjvZzTkJc`; наведение на превью в поиске (встроенный проигрыватель).
- Сырые данные — `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\out\results.json` (29 снимков), скрипты — там же (`run.mjs`, `lib.js`). В репозитории ничего не менялось.

## 1. Селектор → страница → число совпадений

В клетке — максимум по снимкам страницы (элементы в DOM, в том числе скрытые). Столбцы: «просмотр» — 8 снимков страницы просмотра; «конец видео» — −20 с, −1 с, полноэкранный режим; «эфир» — живой эфир.

Плеер `#movie_player` есть в DOM и на главной/поиске/канале (свёрнутый плеер), поэтому `ytp-*` там дают 1 и без видео. В мини-плеере 2 — основной и встроенный проигрыватели.

| группа | селектор | главная | поиск | просмотр | конец видео | канал | Shorts | мини | эфир | запись эфира |
|---|---|---|---|---|---|---|---|---|---|---|
| `thumbDuration` | `ytd-thumbnail-overlay-time-status-renderer` | 0 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `yt-thumbnail-overlay-time-status-renderer` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `ytm-thumbnail-overlay-time-status-renderer` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `.ytd-thumbnail-overlay-time-status-renderer` | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `.ytm-thumbnail-overlay-time-status-renderer` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `.ytp-videowall-still-info-duration` | 0 | 0 | 0 | 12 | 0 | 0 | 0 | 4 | 0 |
| `thumbDuration` | `.ytp-ce-video-duration` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `.video-time` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `[class*="thumbnail-overlay-time-status"]` | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `.badge-shape-wiz--thumbnail-overlay-time-status` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `.badge-shape-wiz--thumbnail-overlay-badge` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `yt-thumbnail-overlay-badge-view-model` | 0 | 1 | 25 | 20 | 0 | 0 | 14 | 16 | 0 |
| `thumbDuration` | `.ytBadgeShapeText` | 0 | 72 | 75 | 45 | 30 | 0 | 35 | 33 | 21 |
| `thumbDuration` | `ytd-compact-video-renderer .badge-shape-wiz--thumbnail-overlay-badge` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `yt-lockup-view-model .badge-shape-wiz--thumbnail-overlay-badge` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbDuration` | `ytm-video-with-context-renderer .badge-shape-wiz--thumbnail-overlay-badge` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `playerTime` | `.ytp-time-display` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerTime` | `.ytp-time-current` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerTime` | `.ytp-time-separator` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerTime` | `.ytp-time-duration` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerTime` | `.ytp-tooltip-text` | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 |
| `playerTime` | `.ytp-tooltip-bottom-text` | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 |
| `playerTime` | `.ytp-tooltip-duration` | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 |
| `playerTime` | `.ytp-tooltip-progress-bar-pill-time-stamp` | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 |
| `playerTime` | `.ytPlayerStoryboardTimestamp` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `playerProgress` | `.ytp-progress-bar-container` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytp-progress-bar` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytp-progress-list` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytp-scrubber-container` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytp-chapters-container` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytp-chapter-hover-container` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytp-timed-markers-container` | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| `playerProgress` | `.ytPlayerProgressBarHost` | 0 | 0* | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| `playerProgress` | `.ytPlayerProgressBarHostBottomInset` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbProgress` | `.ytThumbnailOverlayProgressBarHostWatchedProgressBar` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbProgress` | `.ytThumbnailOverlayProgressBarHostUseLegacyBar` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbProgress` | `ytd-thumbnail-overlay-resume-playback-renderer #progress` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `thumbProgress` | `ytm-thumbnail-overlay-resume-playback-renderer #progress` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `a#thumbnail img` | 0 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `a#thumbnail video` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `ytd-thumbnail img` | 0 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `ytd-thumbnail video` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `ytd-thumbnail yt-image` | 2 | 22 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| `preview` | `ytd-thumbnail .yt-core-image` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `yt-thumbnail-view-model img` | 0 | 18 | 40 | 20 | 45 | 0 | 20 | 20 | 20 |
| `preview` | `yt-thumbnail-view-model video` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `yt-thumbnail-view-model .yt-core-image` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `ytm-thumbnail img` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `ytm-thumbnail video` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `.ytp-ce-covering-image` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `.ytp-ce-expanding-image` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `preview` | `.ytp-videowall-still-image` | 0 | 0 | 0 | 12 | 0 | 0 | 0 | 4 | 0 |
| `preview` | `.ytp-autonav-endscreen-upnext-thumbnail` | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 1 |
| `title` | `#video-title` | 0 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `a#video-title-link` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `yt-lockup-metadata-view-model h3` | 0 | 1 | 40 | 20 | 30 | 0 | 20 | 20 | 20 |
| `title` | `.yt-lockup-metadata-view-model-wiz__title` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `.yt-lockup-metadata-view-model__title` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `.media-item-headline` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `.ytp-title-link` | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 | 1 |
| `title` | `.ytp-title-text` | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 | 1 |
| `title` | `.ytp-ce-video-title` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `.ytp-ce-playlist-title` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `title` | `.ytp-videowall-still-info-title` | 0 | 0 | 0 | 12 | 0 | 0 | 0 | 4 | 0 |
| `title` | `.ytp-autonav-endscreen-upnext-title` | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 1 |

\* `.ytPlayerProgressBarHost` есть во встроенном проигрывателе при наведении на превью в поиске (снимок `search_hover_inline_preview`); там он скрыт (`visibility:hidden`).

Главная без входа пустая («История YouTube отключена» / «Try searching to get started»): 0 карточек, поэтому её столбец ничего не говорит о карточках.

### Селекторы с 0 совпадений на всех страницах (кандидаты в мёртвые)

Разбиты по причине; «мёртвым» уверенно можно считать только первую группу.

**а) Старые классы — замены в текущей вёрстке уже работают:**
- `.badge-shape-wiz--thumbnail-overlay-time-status`, `.badge-shape-wiz--thumbnail-overlay-badge`, `ytd-compact-video-renderer .badge-shape-wiz--thumbnail-overlay-badge`, `yt-lockup-view-model .badge-shape-wiz--thumbnail-overlay-badge` — классы `-wiz--` не встретились ни разу; бейджи теперь `badge-shape.ytBadgeShapeHost` > `.ytBadgeShapeText`.
- `yt-thumbnail-overlay-time-status-renderer` (тег без `d`), `.video-time`.
- `.yt-lockup-metadata-view-model-wiz__title`, `.yt-lockup-metadata-view-model__title` — заголовок карточки теперь `a.ytLockupMetadataViewModelTitle` внутри `h3.ytLockupMetadataViewModelHeadingReset`, его ловит `yt-lockup-metadata-view-model h3`.
- `a#video-title-link`, `.media-item-headline`.
- `ytd-thumbnail .yt-core-image`, `yt-thumbnail-view-model .yt-core-image` — картинка теперь `img.ytCoreImageHost` (класса `.yt-core-image` нет); её ловит `yt-thumbnail-view-model img`.

**б) Мобильная вёрстка `ytm-*` — для расширения мёртвые:** `ytm-thumbnail-overlay-time-status-renderer`, `.ytm-thumbnail-overlay-time-status-renderer`, `ytm-video-with-context-renderer .badge-shape-wiz--…`, `ytm-thumbnail-overlay-resume-playback-renderer #progress`, `ytm-thumbnail img`, `ytm-thumbnail video`. В `manifest.json` `matches` и `host_permissions` — только `https://www.youtube.com/*`; на `m.youtube.com` скрипт не запускается.

**в) Не встретились из-за условий проверки — не удалять без проверки под аккаунтом:**
- Полоски «просмотрено»: `.ytThumbnailOverlayProgressBarHostWatchedProgressBar`, `.ytThumbnailOverlayProgressBarHostUseLegacyBar`, `ytd-thumbnail-overlay-resume-playback-renderer #progress`. Без входа и с выключенной историей полосок нет.
- Конечные заставки (end cards): `.ytp-ce-video-duration`, `.ytp-ce-covering-image`, `.ytp-ce-expanding-image`, `.ytp-ce-video-title`, `.ytp-ce-playlist-title`. На 4 проверенных видео (UEFA, Grab SPORT, NBA ×2) за 20 с до конца `.ytp-ce-element` было 0.
- `.ytPlayerStoryboardTimestamp`, `.ytPlayerProgressBarHostBottomInset`, `a#thumbnail video`, `ytd-thumbnail video`, `yt-thumbnail-view-model video`. Видео при наведении сейчас монтируется не в превью, а в отдельный `ytd-video-preview` (см. таблицу 2, № 9), поэтому эти три `video`-селектора скорее всего мёртвые.

## 2. Непокрытые спойлеры (с включённым расширением, все настройки вкл.)

«Обяз.» — нарушение обязательного скрытия времени/прогресса; «опц.» — нарушение опциональных настроек «превью» / «названия».

| № | непокрытый спойлер | страница (снимок) | тег / классы / путь | предлагаемый селектор | серьёзность |
|---|---|---|---|---|---|
| 1 | **Длительность в новой сетке после видео** («31:59», «25:26»), 12 шт. | конец видео: полноэкранный режим (`end_fullscreen`, с расширением); в прогоне MCP 13:28 — и в обычном режиме после «Cancel» у автоперехода (3 видимых) | `div.ytp-fullscreen-grid-main-content > div.ytp-fullscreen-grid-stills-container > a.ytp-modern-videowall-still.ytp-suggestion-set > div.ytp-modern-videowall-still-image > span.ytp-modern-videowall-still-info-duration` (`opacity:.75`, видима) | `.ytp-modern-videowall-still-info-duration` (в `THUMBNAIL_DURATION_SELECTORS`) | обяз. |
| 2 | Превью в той же сетке (фон `i.ytimg.com/vi/…/hqdefault.jpg`), 12 шт. | там же | `a.ytp-modern-videowall-still > div.ytp-modern-videowall-still-image` (вычисленный `background-image`) | `.ytp-modern-videowall-still-image` (в `VIDEO_PREVIEW_SELECTORS`) | опц. |
| 3 | Названия в той же сетке, 12 шт. | там же | `span.ytp-modern-videowall-still-info-bg > span.ytp-modern-videowall-still-info-content > span.ytp-modern-videowall-still-info-title` | `.ytp-modern-videowall-still-info-title` (в `VIDEO_TITLE_SELECTORS`) | опц. |
| 4 | Название текущего видео поверх плеера в полноэкранном режиме | `end_fullscreen` | `yt-player-overlay-video-details-renderer.ytPlayerOverlayVideoDetailsRendererHost > div.ytPlayerOverlayVideoDetailsRendererTextContainer > h2.ytPlayerOverlayVideoDetailsRendererTitle` | `.ytPlayerOverlayVideoDetailsRendererTitle` | опц. |
| 5 | Длительность следующего видео на экране «Up next» («15:08») — прячется только размытием превью; при выключенной настройке превью будет видна | конец видео, автопереход (прогон MCP 13:27, `time-blur-only`) | `div.ytp-autonav-endscreen-upnext-container > a.ytp-autonav-endscreen-link-container > div.ytp-autonav-endscreen-upnext-thumbnail > div.ytp-autonav-timestamp` | `.ytp-autonav-timestamp` (в `THUMBNAIL_DURATION_SELECTORS`) | обяз. |
| 6 | Таймкоды в описании («00:07», «13:25», «13:50») | просмотр, описание (`watch_initial`, `watch_description_comments`) | `ytd-text-inline-expander div#expanded > yt-attributed-string > span.ytAttributedStringHost > span.ytAttributedStringLinkInheritColor > a.ytAttributedStringLink.ytAttributedStringLinkCallToActionColor`; на втором видео — `div#content.ytd-expander > yt-attributed-string > … > a.ytAttributedStringLink` («2:13») | `ytd-watch-metadata a.ytAttributedStringLink[href*="t="]` (что в `href` есть `t=`, не проверено — сверить) | обяз. (по последнему таймкоду видна длина) |
| 7 | Таймкоды глав в панели «Key moments» («0:07», «13:25»…) | просмотр, панель глав (`watch_chapters_panel`) | `ytd-macro-markers-list-renderer div#contents > ytd-macro-markers-list-item-renderer > a#endpoint > div#details > div#time` | `ytd-macro-markers-list-item-renderer #time` | обяз. |
| 8 | Таймкоды в расшифровке, 111 шт. | просмотр, «Show transcript» (`watch_transcript`) | `macro-markers-panel-item-view-model > timeline-item-view-model > div.ytwTimelineItemViewModelContentItems > transcript-segment-view-model.ytwTranscriptSegmentViewModelHost > div.ytwTranscriptSegmentViewModelTimestamp` | `.ytwTranscriptSegmentViewModelTimestamp` | обяз. (панель открывает сам пользователь) |
| 9 | **Видео при наведении на превью играет без размытия** | поиск «NBA highlights», наведение 5 с (`search_hover_inline_preview`): `video` 363 px, играет, `filter` у видео и всех предков — нет | `ytd-video-preview > … > ytd-player > div#inline-preview-player.html5-video-player > div.html5-video-container > video` | `ytd-video-preview video` (или `#inline-preview-player video`) в `VIDEO_PREVIEW_SELECTORS` | опц. |
| 10 | Таймкоды глав в фрагменте описания в результатах поиска («[00:07] Highlights [13:25] Table standings…», «0:00 Mavericks at Spurs 3:18 Heat at Clippers 6:35») | поиск (`search_cl`, `search_hover_inline_preview`) | `ytd-video-renderer > div#dismissible > div.text-wrapper > div.metadata-snippet-container-one-line > yt-formatted-string.metadata-snippet-text > span` | `ytd-video-renderer .metadata-snippet-container-one-line` (таймкоды идут внутри строки вместе с текстом — прятать только целиком) | обяз. |
| 11 | Превью «ключевых моментов» в результатах поиска, 3 шт. | поиск «NBA highlights» | `ytd-expandable-metadata-renderer div#thumbnail > yt-img-shadow > img#img` | `ytd-expandable-metadata-renderer #thumbnail img` | опц. |
| 12 | Превью глав в панели «Key moments», 3 шт. | `watch_chapters_panel` | `ytd-macro-markers-list-item-renderer > a#endpoint > div#thumbnail > yt-img-shadow > img#img` | `ytd-macro-markers-list-item-renderer #thumbnail img` | опц. |
| 13 | Превью в большой карточке турнира/команды в поиске | поиск CL, NBA (`search_cl`) | `ytd-universal-watch-card-renderer > ytd-watch-card-hero-video-renderer > div#hero-image > ytd-single-hero-image-renderer > yt-img-shadow#image > img#img` | `ytd-watch-card-hero-video-renderer #hero-image img` | опц. |
| 14 | Название в той же карточке («HIGHLIGHTS \| FC BARCELONA 3 vs 0 ASTON VILLA», «Game Recap: Lakers 116, Kings 103») | там же | `ytd-watch-card-hero-video-renderer div.title-fade > a#watch-card-title > yt-formatted-string#watch-card-title` | `ytd-watch-card-hero-video-renderer #watch-card-title` | опц. (счёт в названии) |
| 15 | Названия Shorts в полках поиска и на вкладке Shorts канала (15–45 шт. на странице) | поиск, `channel_shorts` | `ytm-shorts-lockup-view-model.shortsLockupViewModelHost > div.shortsLockupViewModelHostOutsideMetadata > div > h3.shortsLockupViewModelHostMetadataTitle` | `.shortsLockupViewModelHostMetadataTitle` | опц. |
| 16 | Название на странице Shorts | `shorts_page` | `yt-reel-metapanel-view-model > div.ytReelMetapanelViewModelMetapanelItem > yt-shorts-video-title-view-model > h1.ytShortsVideoTitleViewModelShortsVideoTitle` | `yt-shorts-video-title-view-model` | опц. |
| 17 | Обложка текущего видео до старта воспроизведения | просмотр без автозапуска (прогон MCP 13:21) | `#movie_player > div.ytp-cued-thumbnail-overlay > div.ytp-cued-thumbnail-overlay-image` (фон `…/maxresdefault…`) | `.ytp-cued-thumbnail-overlay-image` | опц. |
| 18 | Название текущего видео под плеером | все страницы просмотра | `ytd-watch-metadata > div#above-the-fold > div#title-row > div#title > h1` | `ytd-watch-metadata #title h1` — **вопрос продукта**: открытое видео пользователь выбрал сам; сейчас скрываются только названия в списках и на плеере | опц. |
| 19 | Пустые «пилюли» длительности: текст скрыт, а тёмная подложка `badge-shape` видна; по ширине видно `m:ss` или `h:mm:ss` | просмотр (20–40 шт.), канал (30), поиск (5–16) | `yt-thumbnail-view-model > yt-thumbnail-bottom-overlay-view-model > div.ytThumbnailBottomOverlayViewModelBadgeContainer > yt-thumbnail-badge-view-model.ytThumbnailBadgeViewModelHost > badge-shape.ytBadgeShapeHost.ytBadgeShapeThumbnailDefault` | `yt-thumbnail-badge-view-model:not(:has(.ytBadgeShapeThumbnailLive))` | обяз., слабая утечка |
| 20 | «Started streaming 2 hours ago» — сколько уже идёт эфир | живой эфир (`live_watch_*`) | `ytd-watch-info-text > div#info-container > yt-formatted-string#info > span` | при необходимости — `ytd-watch-info-text #info` (там же дата и просмотры) — вопрос продукта | — |

**Подсчёт по страницам** (уникальные типы непокрытых спойлеров; без №20, который информационный):
- поиск: 6 (№ 9, 10, 11, 13, 14, 15);
- просмотр (плеер, описание, панели, колонка рекомендаций): 7 (№ 6, 7, 8, 12, 17, 18, 19);
- конец видео / полноэкранный режим: 5 (№ 1, 2, 3, 4, 5);
- канал: 2 (№ 15, 19);
- Shorts: 1 (№ 16) + низкий приоритет: фоновые кадры следующих Shorts `div.reel-video-in-sequence-thumbnail` (9 шт., `frame0.jpg`, в основном за пределами экрана);
- мини-плеер: 0;
- живой эфир: 0 спойлеров времени/прогресса (только № 20 как информация);
- запись эфира: 0, кроме общих № 18/19.

Обязательное скрытие (время/прогресс) нарушают: № 1, 5, 6, 7, 8, 10 и слабо — 19.

## 3. Что покрыто и работает (проверено с расширением)

- Плеер: `.ytp-time-display` и прогресс скрыты при воспроизведении, наведении на таймлайн, перемотке `→` и `5`, в мини-плеере, на Shorts (`.ytPlayerProgressBarHost`), в живом эфире и записи эфира. «Most replayed» (`.ytp-heat-map-container`) и главы лежат внутри `.ytp-progress-bar-container` и скрыты вместе с ним.
- Подсказка над таймлайном: из-за `pointer-events:none` она не появляется; в прогоне без расширения разметка такая: `div.ytp-tooltip.ytp-tooltip-progress-bar-style > div.ytp-tooltip-progress-bar-pill > div.ytp-tooltip-progress-bar-pill-time-stamp` — покрыта селектором `.ytp-tooltip-progress-bar-pill-time-stamp`.
- Бейджи длительности: в поиске (`ytd-thumbnail-overlay-time-status-renderer`), на канале, в колонке рекомендаций и во встроенном проигрывателе текст скрыт через `.ytBadgeShapeText`. Бейдж LIVE (`badge-shape.ytBadgeShapeThumbnailLive`) остаётся видимым — исключение работает.
- Старая сетка `.ytp-videowall-still-*` и `.ytp-autonav-endscreen-upnext-*` есть в DOM (12 и 1). В проверенных состояниях на экране была новая сетка `ytp-modern-videowall-*` (№ 1–3).
- Превью карточек (`yt-thumbnail-view-model img`, `ytd-thumbnail img`) и названия (`#video-title`, `yt-lockup-metadata-view-model h3`) размыты, включая полку Shorts.

## 4. Попутные наблюдения

- `.ytBadgeShapeText` прячет текст всех бейджей, а не только длительности: например, «New» (15–30 шт. на поиске). Это перекрытие, а не утечка.
- «Streamed 17h ago», «Streamed 1mo ago», «N watching», «Live» есть в карточках, в результатах фильтра Live (35) и на вкладке Live канала (30). Длительность они не раскрывают, расширение их не прячет. Указаны, потому что их просили проверить.
- Заслонка живого эфира: на `dD1jAjrBedI` появилась (`liveGuard=true`); после «continue» эфир пошёл, время и прогресс скрыты.

## 5. Что не удалось проверить и почему

- **Полоски «просмотрено» на превью** — без входа и с выключенной историей их нет; 4 селектора `thumbProgress` нельзя ни подтвердить, ни назвать мёртвыми.
- **Конечные заставки (`.ytp-ce-*`)** — ни на одном из 4 видео их не было.
- **Экран «Up next» и обычная сетка после конца видео с расширением** — в headless Chromium видео не доходило до `ended` (стояло на 853/856 с и 540/541 с). Поэтому № 1–3 в обычном режиме и № 5 найдены только в прогоне MCP с теми же правилами CSS, но без расширения. С расширением новая сетка проверена только в полноэкранном режиме.
- **Таймкоды в комментариях** — комментарии загрузились (11 шт.), но таймкодов в них не было; селектор не проверен.
- **Главная** — без входа пустая.
- **Канал F1**: `@Formula1/videos` и `/streams` с российского IP пустые (в сетке только `ytd-continuation-item-renderer`); вместо него проверен `@NBA`. Один спортивный канал проверен, разные варианты вёрстки каналов — нет.
- **Визуально скриншотами не сверял**: проверка шла по DOM и вычисленным стилям. Сохранить скриншоты из MCP не дала файловая песочница, а скрипт работал headless.
- **Плейлисты, «Смотреть позже», история, подписки, m.youtube.com, встроенный плеер (embed)** — не входили в задачу или недоступны без входа.
- Формат `href` у таймкодов описания (`&t=`) не проверен — селектор в № 6 нужно сверить.
