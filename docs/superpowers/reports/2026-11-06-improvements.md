# Улучшения Anti-Spoiler for YouTube — сводка ревью 2026-11-06

Источники: Codex review (gpt-6-astra), Codex research (gpt-6.1-sol, живой поиск), Argon (gemini-4-argon-high).
Сырые отчёты: `E:\vt\work\research\2026-11-06-yas-improvements\out-review\round1.out.md`,
`...\out-research\round1.out.md`. База — 9a4bda4, v0.2.0, `npm test` 95/95.
Пометки: **[код]** — главная сессия сверила по коду; **[Codex-проба]** — воспроизведено Codex в памяти, мной не сверено;
**[браузер]** — нужна живая проверка.

## A. Ошибки и надёжность

| # | Что | Где | Статус | Объём |
|---|---|---|---|---|
| A1 | «Start from beginning» без DVR / при неудачной перемотке снимает blur и звук на live-краю. Результат проверки перемотки (`LIVE_START_SEEK_RESULT_EVENT`) никто не слушает. Поведение заложено тестом «fails open» | live-start-controller.js:872-888, live-player-bridge.js:372, content.test.js:1753 | [код]; продуктовое решение | M |
| A2 | Повторный заход на тот же стрим в той же вкладке — guard не появляется: `attemptedVideoIds` не сбрасывается | live-start-controller.js:438, :848 | [код] | S |
| A3 | До ответа `storage.sync.get` классы скрытия не стоят — окно без защиты при загрузке страницы. Пользователи конкурентов жалуются именно на «мелькание» | content.js:566-571 | [код]; длительность [браузер] | S |
| A4 | Popup показывает «Protection is on», хотя сохранение упало | popup.js:106, :136-140 | [код] | S |
| A5 | `.ytp-tooltip-text` скрыт везде — вероятно, пустые подсказки у кнопок плеера; широкие бейджи (`.ytBadgeShapeText`) могут прятать UPCOMING/PREMIERE | content.js:54-56, :70 | [браузер] | S |
| A6 | Оверлей live-guard смонтирован на `body` — в fullscreen плеера его кнопок не видно | live-start-controller.js:519 | [браузер] | M |
| A7 | Чат, появившийся позже 10 с, остаётся размытым без кнопки «Show comments» | content.js:527 | [Codex-проба] | M |
| A8 | Live-признак может приписаться другому видео (смесь старого `ytInitialPlayerResponse` и нового videoData) | live-player-bridge.js:183-202 | [Codex-проба] | S |
| A9 | Ответы из page world не сверяются по requestId | live-start-controller.js:704 | [Codex-проба]; низкий приоритет | S |

## B. Утечки спойлеров

| # | Что | Ценность | Объём |
|---|---|---|---|
| B1 | `.ytp-chapter-title` в панели плеера («Penalties», «Overtime», «Map 3») — рядом со скрытым временем | высокая | S |
| B2 | Комментарии и описание (счёт, таймкоды) — отдельная опция; у конкурентов есть, пользователи докупают Unhook | высокая | S–M |
| B3 | При «Hide video titles»: H1 на странице видео и заголовок вкладки | средняя | S–M |
| B4 | «Most replayed» (heatmap) при показанном прогресс-баре; список глав в описании | средняя | S |
| B5 | Shorts, `m.youtube.com`, embeds (`all_frames`, nocookie) — сейчас вне охвата; нужно решение о границе продукта | решение | M–L |

## C. Удобство

| # | Что | Основание | Объём |
|---|---|---|---|
| C1 | «Показать для этого видео» + горячая клавиша (`chrome.commands`) | конкуренты: Alt+H, Alt+Shift+U; отзывы — «приходится выключать всё» | M |
| C2 | Кнопки перемотки ±N (прогресс-бар некликабелен) | отзыв-похвала таким кнопкам у конкурента | M |
| C3 | Русская локализация (`_locales`) popup и оверлеев | владелец и аудитория | M |
| C4 | Защита только выбранных каналов | отзывы: «нужно для esports, мешает в остальном»; Argon против сложного движка правил | M–L |
| C5 | Раскрытие размытой карточки по наведению с задержкой / Alt | Argon, рассуждение | S |

## D. Выпуск и документы

- В магазине опубликована 0.1.0 (21.04.2026, 73 пользователя, 5,0 при 2 оценках); 0.2.0 не выпущена.
- Устарели: `store/listing.md`, `store/permissions.md`, `store/reviewer-notes.md`, `release-checklist.md` и
  `package-contents.md` (имя 0.1.0.zip), `manifest.json` description, README (нет «Hide video titles»). Объём S.
- Firefox: блокера для `world: "MAIN"` нет (Firefox 128+), но нужен `background.scripts` и `browser_specific_settings`.

## Не строить
Парсинг команд/счёта по ключевым словам, поддельный таймлайн, расписания, сложный движок правил в `storage.sync`.

## Открытые решения владельца
1. A1: без DVR — держать защиту и спросить «Начало недоступно — смотреть live?» или оставить fail-open?
2. A2: при возврате на стрим спрашивать снова (рекомендация) или помнить выбор до закрытия вкладки?
3. B5: охват Shorts / mobile / embeds.
4. B2: комментарии и описание — новой опцией или вместе с live-чатом?

---

## Перепроверка на 0.4.0 (2026-11-06)

Код: worktree `claude/project-overview-62c71a` = коммиты до `250a2fa` + незакоммиченные правки (версия 0.4.0);
`dist/youtube-anti-spoiler-extension-0.4.0.zip` совпадает с рабочим деревом (30/30 файлов без учёта CRLF);
`npm test` — 285/285. Отчёт Codex: `E:\vt\work\research\2026-11-06-yas-improvements\out-survey-040\round1.out.md`.
Ключевые пункты сверены главной сессией по коду.

| # | Статус в 0.4.0 | Где |
|---|---|---|
| A1 без DVR | исправлено: защита держится до фактического прыжка, кнопка скрыта без DVR | live-start-controller.js:1094-1310 |
| A2 возврат на стрим | исправлено: другое видео сбрасывает выбор | live-start-controller.js:1671-1706 |
| A3 старт | частично: защита по умолчанию сразу; сохранённые «blur previews / titles» (по умолчанию off) ждут storage | content.js:1172-1177 |
| A4 popup | исправлено | popup.js:125-166 |
| A5 `.ytp-tooltip-text` | открыто: скрыт глобально; бейджи UPCOMING/PREMIERE — [браузер] | content.js:119 |
| A6 fullscreen | исправлено | live-start-controller.js:608-759 |
| A7 поздний чат | исправлено | content.js:632-848 |
| A8 чужое видео | исправлено | live-player-bridge.js:211-262 |
| A9 requestId | открыто, низкий приоритет | live-start-controller.js:793-862 |
| B1 `.ytp-chapter-title` | открыто | нет селектора |
| B2 комментарии/описание | комментарии — есть (default on); описание — только вместе с titles | content.js:228-232, 466-491 |
| B3 H1 и вкладка | исправлено, кроме `/@name/live` | content.js:1000-1011 |
| B4 heatmap | скрыт вместе с previews | content.js:303-315 |
| B5 mobile/embeds | вне охвата (manifest) | manifest.json:37-56 |
| D release-checklist | открыто: `0.1.0.zip` | store/release-checklist.md:14-16 |
| Новое: чат до выбора live | «Show comments» открывает чат до выбора, README обещает иначе | content.js:743-751, README.md:92 |

Функции 0.4.0: глобальный хоткей Alt+Shift+S (переключает всю защиту), кнопки перемотки ±10с/1м/10м,
скрытие комментариев, описания (с titles), заголовка вкладки, media session, Shorts (desktop), 10 языков, тема.
Нет: «показать для этого видео», защита выбранных каналов, раскрытие карточки по наведению.

---

## «Показать для этого видео» + правки 1.0.0 — состояние (2026-11-06)

Ветка `claude/improve-quality-convenience-dce7b1` от `258b206` (Release 1.0.0), правки НЕ закоммичены.
План: `E:\vt\work\research\2026-11-06-yas-improvements\PLAN-reveal.md` (+ HANDOFF-portion2.md, LIVE-CHECK-reveal.md).
Решения владельца: раскрывать только открытое видео; до ухода с видео, перезагрузка сохраняет; хоткей + кнопка в плеере
+ кнопка в popup; реализация — Opus.
- Код: 2 порции Opus implementer; затем главная сессия: гонка popup (available без флага защиты) и bfcache (`pageshow`).
- `npm test`: 324/324 (база в этом checkout: 285, 1 падал из-за CRLF — исправлено F7).
- [codex] план: 5 находок, все приняты. [codex] код: #2 гонка — принято, исправлено; вопрос bfcache — принято,
  исправлено; #1 «после hide again guard не возвращается, если выбор уже сделан» — оспорено как продуктовое решение:
  сделанный выбор держится на этот визит (README). Решение за владельцем.
- Живая проверка: два агента (out-reveal/, out-reveal-popup/ в C:\Users\vtshk\AppData\Local\Temp\yas-audit2\);
  вычитка строк — argon-reviewer. Итоги — ниже, когда придут.
- Живая проверка (Chrome 156 headful), сводка: `E:\vt\work\research\2026-11-06-yas-improvements\LIVE-RESULTS.md`.
  Всё PASS после двух доработок по её итогам: F2 (`.ytp-tooltip-bottom-text`/`-duration` тоже только в превью
  перемотки) и хоткей Alt+Shift+R → **Alt+Shift+V** (R занят Reading mode, Chrome такой не назначает).
  Не проверено вживую: возврат из bfcache (YouTube не попадает в bfcache — no-store; путь покрыт unit-тестом).
  Известно: под оверлеем стрима кнопка-глаз не нажимается (оверлей сверху); хоткей и popup работают.
- Вычитка строк (argon): 7 правок в store/listing.{ru,ko,ja,id,tr,de,fr}.md приняты; строки интерфейса без замечаний.
- `npm test` финал: 324/324.
