# Ход работ по исследованию 2026-11-05 — точка входа для следующей сессии

Владелец 2026-11-05: «посмотрите с агентами как мы можем его улучшить … проведите исследование», затем
«давай сразу порция за порцией». Ветка `claude/project-overview-62c71a` (worktree). Порции 1–2 и F1 закоммичены (`6c9bc74`); порции 3–4 и финал — не закоммичены.
Порядок порций — `SUMMARY.md` §7.

| Порция | Состояние | Где |
|---|---|---|
| 1. Обязательное скрытие времени, селекторы, защита до чтения storage (B1) | **готово**: `npm test` 100/100; живой прогон на YouTube с расширением — 20 снимков, утечек TIME/PROGRESS/PREVIEW 0, пустых бейджей 0 | `src/content/content.js`, `tests/content.test.js` |
| 2. Защита эфиров (B2–B16) | **готово**: R1–R13 + правки главной сессии по живой проверке (мост передаёт `canRewind` из `allowSeeking`; перемотка доступна только когда плеер знает окно; подтверждение перемотки — по `seeked`/`loadeddata`/`canplay` и на **новом** `<video>`, который YouTube подставляет уже у начала). `npm test` 165/165. Живьём (стенд, `live-p2.mjs`): эфир с DVR `H2SgImoLMdU` — «Start from beginning» снимает защиту через ~1,25 с на t=0, звук и play; эфир без DVR `uLWEssCrXYc` — «This stream can't be rewound»; повторное открытие спрашивает снова; уход на главную держит защиту; запись эфира и обычное видео — без guard. Регресс порции 1 на финальной сборке — 0 утечек. **Не проверено живьём:** настоящий мини-плеер (в headless не открылся), реклама перед эфиром, полноэкранный режим, `/@channel/live` | план §R12, §R13; `portion2-report.md` |
| 3. Попап и мелочи | **готово**. Попап (A12, A13, C20). B15: `title` снимается с наведённого названия (`mouseover` в capture, копия в `data-yas-title`, возврат при выключении «Hide video titles»; свежий `title` от YouTube не затирается). B17: кадры раскадровки `.ytp-tooltip-bg`, `.ytp-storyboard-framepreview-img` — под «Blur previews»; название главы в подсказке (`.ytp-tooltip.ytp-preview .ytp-tooltip-title`, `.ytp-tooltip-progress-bar-pill-title`) — под «Hide video titles». `npm test` 169/169. Живьём (`probe-p3.mjs`, `out-p9`): после наведения `a#video-title` `title=null`, копия в `data-yas-title`; `.ytp-tooltip-bg` `blur(24px)`, названия глав `blur(8px)` | `src/content/content.js` |
| 4. Функции F1–F5 | **код готов** (F1 — ранее; F2–F5 — `implementer`, отчёт `portion4-report.md`). `npm test` 202/202. Живьём (`features-p4.mjs`, сборка `ext-p10`, лог `out-p10-features.log`): F2 — 6 кнопок в `.ytp-left-controls`, «+1m» 9→69 с без паузы, пробел после клика ставит паузу (не перематывает), «−10m» упирается в 0, при показанной шкале `display:none`; F3 — `#contents` `blur(18px)` с оверлеем, «Show comments» снимает, на следующем видео (SPA) снова скрыто, выключение опции снимает; F4 — вкладка `YouTube` на /watch и после SPA, выключили «Hide video titles» — вернулось название, включили — снова `YouTube`; F5 — `mediaSession.metadata.title` = `YouTube video`, artwork 0; ошибок страницы 0 | `src/content/skip-buttons.js`, `content.js`, `live-player-bridge.js` |
| Финал | **готово**: README, версия 0.3.0, store-тексты; ревью `[cross]` Astra — 7 находок, 6 исправлено с тестами, 1 отозвана; `npm test` 206/206; живые прогоны на `ext-p10`/`ext-p11` (регресс порции 1, эфиры DVR и без DVR, F2–F5, фиксы ревью). Итог и вопросы владельцу — `release-0.3.0-report.md`. **Ничего не закоммичено** после `6c9bc74` | `release-0.3.0-report.md` |

Решения главной сессии (допущения, владелец не подтверждал):
- `h1` открытого видео и «Streamed X ago» не скрываем (вопрос продукта, вынесен владельцу).
- Пустые бейджи «New» на Shorts не скрываем (`.ytBadgeShapeText:not(.shortsLockupViewModelHost *)`).
- Порция 2: показанный оверлей эфира сам не исчезает (R3); пока он показан — чат-гард не снимается.
- Порция 4: горячая клавиша Alt+Shift+S; кнопки перемотки и скрытие комментариев включены по умолчанию.
- Порция 3 (B17): отдельной опции нет. Раскадровка подчиняется «Blur previews», главы в подсказке — «Hide video titles». Обе по умолчанию выключены, но при настройках по умолчанию шкала скрыта и подсказка не появляется. Атрибуты `title` встречаются у `a#video-title` (поиск), `h3.ytLockupMetadataViewModelHeadingReset` (рекомендации), ссылок Shorts и у `h1` открытого видео (его не трогаем — вопрос владельцу).

Живой стенд (вне репозитория): `C:\Users\vtshk\AppData\Local\Temp\yas-audit2\` — `run.mjs` (Playwright + Chromium 1248
с `--load-extension`, профиль `profile2` с принятыми cookie), детектор утечек `lib.js`. Для прогона новой сборки:
скопировать `manifest.json src popup icons` в новую папку `ext-*`, сделать копию `run.mjs` с этой папкой и своей `out-*`.
Сценарии: `search watch endscreen hover channel shorts live miniplayer paststream`.

## Решения владельца 2026-11-05 по вопросам отчёта `release-0.3.0-report.md` → порция 5 (не начата)

1. Название открытого видео (`h1` над описанием) и «Streamed X ago» — **«Размывать при Hide titles»**: под
   `yas-hide-video-titles` размывать `h1` открытого видео и строку «Streamed X ago».
2. Раскадровка при показанной шкале — **«Оставить под Blur previews»** (как сделано в порции 3, без новой опции).
3. Комментарии — **«Защитить панель и Shorts»**: та же кнопка «Show comments» в панели комментариев на `/watch`
   (узкая вёрстка, открывается из тизера `ytd-comments-entry-point-header-renderer`) и в комментариях Shorts.
4. «Most replayed» (`.ytp-heat-map-container`) при показанной шкале — **«Под Blur previews»**.
5. Кнопки перемотки на эфирах без DVR — **«Скрывать»**: когда плеер говорит, что перемотка запрещена
   (тот же признак, что `canRewind`/`allowSeeking` в мосту порции 2), кнопки не показываются.

Перед порцией 5 нужен живой замер разметки: панель комментариев на узком окне, комментарии Shorts, `h1` и
«Streamed X ago» (`ytd-watch-metadata`, `#info`), `.ytp-heat-map-container`. Стенд и скрипты — выше; свежие сборки
`ext-p10`/`ext-p11`, прогоны `features-p4.mjs`, `final-p11.mjs`, `probe-p3.mjs` в `yas-audit2`.
