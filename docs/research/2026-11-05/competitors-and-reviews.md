# Конкуренты и отзывы в магазинах: антиспойлеры для YouTube

Дата среза: 2026-11-05. Только факты, рекомендаций нет.

**Как собраны данные.**
- **Chrome Web Store (CWS).** Карточки и вкладка отзывов `…/detail/<id>/reviews` скачаны 2026-11-05 через curl с cookie согласия. С каждой страницы взяты первые ~10 отзывов в сортировке «Recent»; кнопку «Load more» не нажимали. Звёзды у отзыва — из `aria-label` разметки.
- **Firefox Add-ons (AMO).** Данные взяты 2026-11-05 из официального API: `api/v5/addons/addon/<slug>` и `api/v5/ratings/rating/?addon=<slug>`. Это все отзывы с текстом, до 50 на дополнение.
- **GitHub.** Публичный API `api.github.com/repos/<repo>`, плюс README.
- **Edge Add-ons.** Поиск открыт в браузере (Playwright).
- **Greasy Fork.** Страницы закрыты проверкой Cloudflare (403), данные по ним — «по сводке поиска».
- **Reddit.** Недоступен инструментам (см. «Противоречия и пробелы»).

«Пользователи» — это число из карточки магазина: для CWS «N users», для AMO — `average_daily_users`. Метрики CWS и AMO считаются по-разному, их нельзя сравнивать напрямую.

**Наш собственный листинг.** На CWS уже есть «Anti-Spoiler for YouTube» (`ofplbhckbbeohimppkfbcfjagcheiaia`): 87 users, 5.0 (2 ratings), v0.1.0, обновлён April 21, 2026. Разработчик — vtshkaa@gmail.com, это наше расширение. В таблицу конкурентов оно не входит.
Источник: https://chromewebstore.google.com/detail/ofplbhckbbeohimppkfbcfjagcheiaia (на 2026-11-05).

---

## 1. Таблица конкурентов

Сокращения:
- Д — длительность в списках;
- П — время и шкала в плеере;
- Пр — превью;
- Н — названия;
- К — комментарии;
- Р — рекомендации и end screen;
- L — live;
- Нав — кнопки перемотки без шкалы;
- Сч — авто-скрытие счёта;
- KW — ключевые слова;
- Кан — список каналов.

Все функции — со слов разработчика (вендор), из карточки или README.

### 1a. Прямые антиспойлеры по времени/длительности (спорт, киберспорт)

| # | Название | Магазин, ссылка | Пользователи | Рейтинг (оценок) | Обновлено | Ключевые функции (вендор) | Монетизация | Отличие от нашего (факт по описанию) |
|---|---|---|---|---|---|---|---|---|
| 1 | Hide video duration on YouTube by Denis | CWS, https://chromewebstore.google.com/detail/jkgpcmmhejecphgdnihjfgmdpdkhgpke | 2,000 | 4.0 (26) | Nov 3, 2025 (v1.0.5) | П; авто-скрытие по правилу «название совпадает»; ручное скрытие при старте видео. По отзыву Cresselix (Jun 12, 2025) — кнопки перемотки вперёд/назад | нет данных (платных функций в карточке нет) | Д в списках не скрывает: «search results and suggestions will still show durations» (отзыв Nov 4, 2024). Есть правила по названию |
| 2 | Twitch && Youtube spoiler-free (Adrián) | CWS, https://chromewebstore.google.com/detail/knllbjmieejiihihaecdhamhcfadaadc | 1,000 | 4.6 (20) | August 13, 2021 (v1.6.0) | YouTube и Twitch: шкала, длительность, превью похожих видео; «new video controls» | нет данных | Есть Twitch и свои кнопки навигации. Расширение не обновлялось с 2021 |
| 3 | YouTube Progress Bar Hider (lorenzolanglois.fr) | CWS, https://chromewebstore.google.com/detail/oijcookiachipbcjfimdahgaacmmkpea ; AMO `youtube-progress-bar-hider` | CWS 1,000; AMO 6 | CWS 4.6 (10); AMO 0 (0) | CWS Sep 22, 2026 (v1.3.1); AMO 2026-09-24 | Шкала и длительность; метки на превью включаются кликом по иконке; <15 KB | нет данных | Только шкала и метки времени; нет блюра, названий, live |
| 4 | Video spoilerless (treztreiz) | CWS, https://chromewebstore.google.com/detail/hkkpnepgmgeljhoiplhpoibfkjplbnia | 155 | 5.0 (2) | Sep 13, 2022 (v0.1.0) | П, Д в похожих видео; белый список каналов; свои кнопки навигации | нет данных | Белый список каналов, своя навигация |
| 5 | Youtube Time Hider (rbs.extention) | CWS, https://chromewebstore.google.com/detail/mfbppcookafalpghcgckckpfofadhcdm | 59 | 5.0 (2) | Oct 21, 2023 (v1.1) | Длительность и шкала, вкл/выкл | нет данных | Только время |
| 6 | Hide YouTube Time | CWS, https://chromewebstore.google.com/detail/lamohgmflgjjahpncbdbinocopikappa | 82 | 5.0 (1) | Feb 20, 2026 (v2.4) | Блюр длительности, шкалы и **меток времени в комментариях**; при наведении показывает время | нет данных | Скрывает таймкоды в комментариях; раскрытие при наведении |
| 7 | Youtube: No Spoilers (klop / sergeio) | AMO, https://addons.mozilla.org/firefox/addon/youtube-no-spoilers/ ; GitHub sergeio/yt-no-spoilers (3★) | 513 | 4.92 (12) | 2026-09-09 (v1.16.0) | Время, шкала, рекомендации, комментарии, названия, превью; выключает автовоспроизведение; иконка и Ctrl+Shift+Y — вкл/выкл; «(maybe) Twitch» | бесплатно, MIT (по сводке поиска) | Есть горячая клавиша и отключение автовоспроизведения; скрывает комментарии. Только Firefox |
| 8 | No Spoilers (0skater0 / lukas) | AMO, https://addons.mozilla.org/firefox/addon/no-spoilers-youtube/ ; CWS, https://chromewebstore.google.com/detail/hmklilohlfdjlhpmdlidpfklabdopahk ; GitHub 0skater0/no-spoiler (3★, push 2026-11-02) | AMO 30; CWS 1 | AMO 5.0 (1); CWS нет | AMO 2026-11-01 (v1.1.0); CWS Nov 2, 2026 (v1.1.0) | YouTube и Twitch, отдельный переключатель на каждый пункт (по README): время и шкала; название главы; end screen и end cards; автовоспроизведение; кнопки прыжка (5/10 мин в панели, 1/5/10 мин по центру); комментарии; описание и главы; рекомендации; live chat и chat replay; Д; полосы просмотра на превью; названия (опц.); tooltips; горячая клавиша Alt+Shift+U | бесплатно, open source | Ближайший по набору функций. Есть горячая клавиша, кнопки прыжка, Twitch (вкл. stream uptime), скрытие описания, глав, комментариев, chat replay |
| 9 | Anti Spoiler for Videos (Daniel Santana) | AMO, https://addons.mozilla.org/firefox/addon/anti-spoiler-for-videos/ | 56 | 4.16 (19) | 2024-04-26 (v5.1resigned1) | Время, шкала, длительность; YouTube, Netflix, AfreecaTV | нет данных | Есть Netflix и AfreecaTV; нет popup-переключателя (по отзывам) |
| 10 | Timeless (SUPERKO) | AMO, https://addons.mozilla.org/firefox/addon/timeless-video/ | 233 | 4.1 (10) | 2023-04-19 (v1.1.0) | Длительность и шкала на Twitch и YouTube | нет данных | Прошедшее время на YouTube не скрывает (отзывы 2024-05-12, 2024-06-23) |
| 11 | Youtube Spoiler Blocker (CGodiksen) | AMO, https://addons.mozilla.org/firefox/addon/youtube-spoiler-blocker/ ; GitHub CGodiksen/video-spoiler-blocker (1★) | 56 | 3.86 (7) | 2021-04-14 (v1.1) | Длительность только у выбранных каналов или у видео, чьё название подходит под фильтр; контекстное меню на канале | нет данных | Работает выборочно (каналы и названия), а не всегда |
| 12 | YT Spoiler Shield (Oscar) | AMO, https://addons.mozilla.org/firefox/addon/yt-spoiler-shield/ | 6 | 0 (0) | 2026-03-18 (v1.1) | Длительность, шкала, таймкоды; «sport highlights» | нет данных | Только время |
| 13 | YT Spoiler Blocker (eversoneder) | GitHub, https://github.com/eversoneder/Yt-Spoiler-Blocker-Extension (0★, создан 2026-10-18) | нет данных (не в магазине, «load unpacked») | — | push 2026-10-19 | Переключатели: шкала; время; hover preview; главы в плеере; график «Most replayed»; skip animation; полосы просмотра и длительность на превью; список глав и key moments; комментарии; рекомендации. Скрытое не появляется при наведении и клавишах M/C/K/Space/стрелки; Alt+Shift+S; синхронизация | бесплатно | Скрывает «Most replayed», главы, key moments, анимацию перемотки; есть горячая клавиша |
| 14 | Spoiler Shield — Hide Video Durations (merttdikmen) | GitHub, https://github.com/merttdikmen/spoiler-shield (0★, 2026-06-22) | нет данных (load unpacked) | — | 2026-06-22 | YouTube и Twitch: шкала, heatmap, главы, время; время в hover-превью; Д везде, включая end screen; полоса «watched»; длины глав; таймкоды транскрипта; таймкоды в описании и комментариях заменяются на ▶ | бесплатно | Скрывает таймкоды в описании, комментариях и транскрипте, длины глав |
| 15 | anti-spoiler-extension (pingu-codes) | GitHub, https://github.com/pingu-codes/anti-spoiler-extension (0★, 2026-10-24) | нет данных | — | 2026-10-24 | YouTube и Twitch: превью заменяются пустыми; названия — «канал · #хэш»; прогресс и таймкоды; кнопки ±10 с / 1 мин / 10 мин; своя «home»-страница с RSS любимых каналов; загрузка VOD через yt-dlp и плеер без шкалы | бесплатно | Своя лента каналов и офлайн-плеер, названия заменяются хэшем |
| 16 | no-spoilers (jameshoffmann) | GitHub, https://github.com/jameshoffmann/no-spoilers (0★, 2026-10-19) | нет данных | — | 2026-10-19 | Шкала и таймкоды на SOOP и YouTube; кнопки перемотки | бесплатно | Есть SOOP |
| 17 | Spoiler Alert (philipbkemp) | GitHub, https://github.com/philipbkemp/spoiler-alert (0★) | нет данных | — | push 2024-11-21 | Превью F1TV и канала Formula 1 на YouTube | бесплатно | Узко под F1 |
| 18 | F1TV Spoiler Shield (Reedo) | AMO, https://addons.mozilla.org/firefox/addon/f1tv-spoiler-shield/ | 16 | 0 (0) | 2024-07-25 (v1.0.0) | Блокирует изображения на F1TV | нет данных | Только сайт F1TV, не YouTube |
| 19 | Anticipation for YouTube and Twitch | CWS, https://chromewebstore.google.com/detail/anticipation-for-youtube/gnijgfamanlebomemfebpndnnbbpcijl | нет данных (2026-11-05 страница пустая, вероятно снята) | нет данных | нет данных | По сводке поиска: время и шкала на YouTube и Twitch VOD, время похожих видео | нет данных | — |
| 20 | Open End (snowwits) | GitHub, https://github.com/snowwits/openend ; CWS `bgajbplcmfhpfebhiigohjannldlolpf` | нет данных (2026-11-05 страница CWS пустая) | нет данных | нет данных | По сводке поиска: Twitch; режим без спойлеров, своя панель навигации | нет данных | Twitch-ориентирован |
| 21 | Greasy Fork: Youtube video anti-spoiler (z0nx, #427427) | https://greasyfork.org/en/scripts/427427 | ~31 установка (по сводке поиска) | нет данных | 2023-04-14 (v2.2), по сводке поиска | Время и длительность для каналов из списка в коде | бесплатно | Каналы задаются правкой скрипта |
| 22 | Greasy Fork: Youtube Anti Spoiler (krisantuswanandi, #480298); GitHub krisantuswanandi/youtube-anti-spoiler | https://greasyfork.org/en/scripts/480298 | нет данных | нет данных | 2023-11-22 (v0.0.3), по сводке поиска; GitHub push 2023-12-24 | Шкала и таймкоды | бесплатно | Только время |
| 23 | Greasy Fork: YouTube Auto-Hide Progress Bar (#548136); Hide Youtube player controls (#441800); (YouTube Videos & Shorts) Elements Hider (#517695) | https://greasyfork.org/en/scripts/548136 , /441800 , /517695 | нет данных | нет данных | #548136 создан 2025-09-02 (v1.3), по сводке поиска | Скрывают панель или шкалу (по паузе, по клавише h, до наведения) | бесплатно | Не антиспойлеры по назначению (по описанию #548136 — чтобы шкала не закрывала кадр) |

### 1b. Антиспойлеры по счёту и ключевым словам (заголовки и превью)

| # | Название | Магазин, ссылка | Пользователи | Рейтинг (оценок) | Обновлено | Ключевые функции (вендор) | Монетизация | Отличие от нашего |
|---|---|---|---|---|---|---|---|---|
| 24 | ScoreBlur — Hide Football Score Spoilers | CWS, https://chromewebstore.google.com/detail/blkbooepcilfejmilklgpejkdedallii ; сайт https://scoreblur.app/ | 24 | 5.0 (2) | Nov 1, 2026 (v2.0.0) | Автораспознавание счёта: футбол «2-1», баскетбол «102-98». Блюрит текст и превью со счётом на любых сайтах, в т.ч. в видео-лентах и end screens. Ctrl+наведение — подсмотреть; пауза на 1 ч / 1 день / 1 неделю | **платно**: $2.99/мес, $19.99/год, $59.99 навсегда; триал 10 дней без карты + 2 ч после установки; Freemius (scoreblur.app, 2026-11-05) | Распознаёт счёт и работает на всех сайтах. Длительность не скрывает (в описании нет) |
| 25 | YouTube Spoiler Blocker (ledangtuanbk) | CWS, https://chromewebstore.google.com/detail/biebcephpodngpmklmpelbpmefpgpeea | 12 | нет оценок | Aug 31, 2026 (v1.0.2) | Блюр всех превью; hover-превью не играет; tooltip с названием скрыт; **в названии скрыт счёт, названия команд видны**; клик по названию раскрывает | бесплатно | Частичное скрытие названия (только счёт). Длительность не упомянута |
| 26 | Spoiler Shield (bariskoklu) | CWS, https://chromewebstore.google.com/detail/enafghmicnjmnebfmcnklceanlbpfolo | 29 | нет оценок | March 26, 2026 (v1.0.0) | Оверлей на карточку (превью, название, hover). Regex счёта «3-1», «4:0», «2–2»; встроенный список слов (wins, eliminated, champion…); свои слова; блок-лист каналов; «Show» раскрывает | бесплатно | Скрывает выборочно (счёт, слова, каналы), а не всё подряд |
| 27 | Football Spoiler Blocker (rrmunda) | CWS, https://chromewebstore.google.com/detail/ebadfeeidhnahjigfkafdjbmmdlijhfk | 44 | нет данных (на странице нет) | April 7, 2026 (v1.3.0) | Счёт заменяется на «[SCORE HIDDEN]», команды видны; превью — зелёная заглушка с названиями команд (по сводке поиска); работает на выбранных сайтах | нет данных | Многосайтовый, футбол |
| 28 | Spoiler Shield (berkinduz) | CWS, https://chromewebstore.google.com/detail/ggpachbmkdbhebnilfcoldipkpbncpko | 29 | нет оценок | January 18, 2026 (v1.0.0) | Удаляет посты и видео по ключевым словам: Twitter, Reddit, YouTube | бесплатно | По словам, несколько сайтов |
| 29 | No Spoilers (grayhathacks10) | CWS, https://chromewebstore.google.com/detail/kfbhhaallccnekmpojknfjblchllocgb | 1,000 | 4.7 (18) | November 4, 2026 (v1.0.9) | Блюр карточек по ключевым словам, ручное раскрытие | нет данных | По словам (фильмы и игры по отзывам) |
| 30 | SpoilerProtection / Spoiler Protection 2.0 (Gold Lion Development) | CWS, https://chromewebstore.google.com/detail/eelacikjiplnmdingehjfdjcfegclmkg ; AMO, https://addons.mozilla.org/firefox/addon/spoiler-protection-2-0/ | CWS 10,000; AMO 900 | CWS 3.9 (159); AMO 3.07 (42) | CWS v3.0.11, Sep 25, 2026 (по сводке поиска; на странице 2026-11-05 версия не выписана); AMO 2019-04-21 (v2.6.0) | Скрывает по словам на Facebook, Twitter, YouTube, Google, новостных сайтах; «movie, series or sport event» | бесплатно (по сводке поиска) | Общий многосайтовый фильтр по словам |
| 31 | No YouTube Spoilers (TheWisestGuy) | CWS, https://chromewebstore.google.com/detail/pdcocbmidjifbikkgfedadbemddmpnek ; AMO `no-youtube-spoilers` | CWS 288; AMO 156 | CWS 5.0 (1); AMO 5.0 (1) | CWS April 27, 2026 (v2.0.0); AMO 2026-04-24 | Blur Rules: название меняется на «SPOILER FOR: {keyword}», превью размыто. Block Rules удаляют видео. Правила по словам и каналам | нет данных | По словам и каналам |
| 32 | SpoilerCub (ARBOFF) | CWS, https://chromewebstore.google.com/detail/nljhkjgljaihdfgohaippbpigjoicied | 48 | 5.0 (2) | January 4, 2026 (v1.1.3) | По словам: превью, видео, подсказки поиска, комментарии | «Free Core Features» (обрезано на странице), детали — нет данных | По словам (кино, сериалы, игры) |
| 33 | Hide Spoilers: Block & Blur Spoilers (Coffee & Fun LLC) | CWS, https://chromewebstore.google.com/detail/dglgbepdhdpfihbiklibdcecpadcdcln ; App Store (Safari), https://apps.apple.com/us/app/hide-spoilers/id6740436834 | CWS 189 | CWS 5.0 (4) | CWS April 13, 2026 (v2026.4.10) | Блюр текста и изображений по словам; динамические страницы | CWS бесплатно; iOS/Safari $2.99 разово (по сводке поиска) | Есть Safari и iOS |
| 34 | Spoilerproof (spoilerproof.dev) | CWS, https://chromewebstore.google.com/detail/hmijoeophhplodchameaogmgdcphnode | 564 | 4.1 (16) | January 17, 2024 (v1.0.10) | Выбор тайтла из базы, блок спойлеров, в т.ч. превью YouTube | нет данных (по отзыву — нужен вход в аккаунт) | База тайтлов, не спорт |
| 35 | SpoilerBlocker (nuttapongsaen) | CWS, https://chromewebstore.google.com/detail/gkebfkhjdeggiobehdifkkphcnhdonnm ; Edge (поиск) | 15 | 1.0 (1) | October 29, 2026 (v1.3.0) | Блюр слов и изображений: YouTube, Facebook, X, Reddit | нет данных | По словам |
| 36 | Youtube Spoiler Shield (that human) | AMO, https://addons.mozilla.org/firefox/addon/youtube-spoiler-shield/ | 15 | 1.0 (2) | 2024-01-17 (v2.1.0) | Блок видео по словам в названии | нет данных | Оба отзыва: «не работает» |
| 37 | SpoilerSafe; Spoiler Blocker: TV, Movie & Game Spoilers | Edge Add-ons (поиск «youtube spoiler», 2026-11-05) | нет данных | SpoilerSafe (2 оценки), Spoiler Blocker (1) — значение звёзд не выписано | нет данных | По словам, YouTube, Twitter, X, Reddit, Google | нет данных | По словам |

### 1c. Смежные (функции пересекаются, но цель другая)

| # | Название | Магазин, ссылка | Пользователи | Рейтинг (оценок) | Обновлено | Пересекающиеся функции (вендор) | Монетизация |
|---|---|---|---|---|---|---|---|
| 38 | Unhook | CWS, https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid ; есть Firefox и Edge (по карточке) | 1,000,000 | 4.9 (4.6K) | March 22, 2026 (v1.6.9) | Скрытие: рекомендаций; End Screen Videowall; End Screen Cards; комментариев; Live Chat; Video Info; описания; отключение автовоспроизведения. Длительность и шкалу в описании не упоминает | донаты (PayPal.me/unhook) |
| 39 | Enhancer for YouTube™ | CWS, https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle | 1,000,000 | 4.5 (17.6K) | July 15, 2026 (v3.0.19) | «Hide end screens, info cards, recommendations, related videos, chat, or comments». Скрытие длительности в описании не найдено | нет данных |
| 40 | DeArrow | CWS, https://chromewebstore.google.com/detail/enamippconapkdmgfgjchkhakpfinmaj ; GitHub ajayyy/DeArrow (2344★) | 80,000 | 4.2 (319) | July 14, 2026 (v2.3.10) | Краудсорсинг названий и превью; при отсутствии заявок — кадр из случайного момента видео как превью | «paid (if you want)»: лицензия $1 или кнопка «I can't/don't want to pay» |
| 41 | BlockTube | CWS, https://chromewebstore.google.com/detail/bbeaicapbccfllodepmimpkgecanonai ; GitHub amitbl/blocktube (1415★) | 100,000 | 3.9 (825) | February 9, 2026 (v0.4.8) | Блок видео и каналов по имени, комментариев по словам, видео по длительности (runtime); скрытие просмотренных | нет данных |
| 42 | Tweaks for YouTube (InzkDev) | CWS, https://chromewebstore.google.com/detail/ogkoifddpkoabehfemkolflcjhklmkge ; AMO `tweaks-for-youtube` | CWS 60,000; AMO 7,982 | CWS 4.3 (642); AMO 4.58 (201) | Oct 21, 2026 (v3.94.0) | Панель плеера скрыта, по наведению или только тонкая шкала; свой формат времени по шаблону; Clean Player (end screen, heatmap, title, cards); скрытие комментариев и сайдбара; Zen Mode (dim/blur) | нет данных |
| 43 | Hide YouTube Thumbnails (domdomegg) | AMO, https://addons.mozilla.org/firefox/addon/hide-youtube-thumbnails/ ; Edge (поиск, 5 оценок); GitHub domdomegg/hideytthumbnails-extension (71★) | AMO 2,156 | 4.53 (43) | 2026-02-16 (v2.6.3) | Скрытие или блюр превью; показ при наведении; временное отключение; исключения для поиска, плейлиста, страницы просмотра. Спойлеры — как один из сценариев | нет данных |
| 44 | Control Panel for YouTube | AMO `control-panel-for-youtube` | 65,952 | 4.54 (195) | 2026-11-05 (v1.38.1) | Найден в выдаче AMO по запросу «youtube progress bar hide»; конкретные функции — нет данных (карточку не открывали) | нет данных |
| 45 | Hide YouTube title (Martin Petersson) | CWS, https://chromewebstore.google.com/detail/lbhefhicendlbcjaokibgkdfafdblaeb | 339 | 1.8 (5) | March 24, 2022 | Меняет заголовок вкладки на «YouTube» по клику на иконку | нет данных |

Иные сервисы: Don't Spoil (https://dontspoil.tv/guide) — веб-плеер, не расширение. По сводке поиска он встраивает официальные плееры YouTube, Twitch и Kick и накладывает CSS-оверлеи на шкалу, таймкоды, длительность и hover-превью; целевые виды спорта — футбол, баскетбол, MMA, F1.

---

## 2. Отзывы: темы жалоб и просьб

**Корпус.** Тексты отзывов собраны с 17 карточек:
- **CWS:** Denis, Twitch&&YT, No Spoilers (grayhathacks10), SpoilerProtection, Video spoilerless, Progress Bar Hider, Youtube Time Hider, SpoilerCub, Spoilerproof;
- **AMO:** Youtube: No Spoilers, Youtube Spoiler Blocker, Anti Spoiler for Videos, Timeless, Spoiler Protection 2.0, Hide YouTube Thumbnails, Youtube Spoiler Shield;
- **GitHub:** issue sergeio/yt-no-spoilers.

У остальных карточек отзывов с текстом нет. Один отзыв может входить в несколько тем. Числа — это отзывы, которые я нашёл и прочитал, а не все отзывы в магазинах.

**Ключ к источникам:**
- [D] Denis, https://chromewebstore.google.com/detail/jkgpcmmhejecphgdnihjfgmdpdkhgpke/reviews
- [NS] No Spoilers grayhathacks10, https://chromewebstore.google.com/detail/kfbhhaallccnekmpojknfjblchllocgb/reviews
- [SP] SpoilerProtection CWS, https://chromewebstore.google.com/detail/eelacikjiplnmdingehjfdjcfegclmkg/reviews
- [TY] Twitch&&YT, https://chromewebstore.google.com/detail/knllbjmieejiihihaecdhamhcfadaadc/reviews
- [VS] Video spoilerless, https://chromewebstore.google.com/detail/hkkpnepgmgeljhoiplhpoibfkjplbnia/reviews
- [PB] Progress Bar Hider, https://chromewebstore.google.com/detail/oijcookiachipbcjfimdahgaacmmkpea/reviews
- [SPF] Spoilerproof, https://chromewebstore.google.com/detail/hmijoeophhplodchameaogmgdcphnode/reviews
- [YNS] AMO youtube-no-spoilers, https://addons.mozilla.org/firefox/addon/youtube-no-spoilers/reviews/
- [CG] AMO youtube-spoiler-blocker, https://addons.mozilla.org/firefox/addon/youtube-spoiler-blocker/reviews/
- [ASV] AMO anti-spoiler-for-videos, https://addons.mozilla.org/firefox/addon/anti-spoiler-for-videos/reviews/
- [TL] AMO timeless-video, https://addons.mozilla.org/firefox/addon/timeless-video/reviews/
- [SP2] AMO spoiler-protection-2-0, https://addons.mozilla.org/firefox/addon/spoiler-protection-2-0/reviews/
- [HYT] AMO hide-youtube-thumbnails, https://addons.mozilla.org/firefox/addon/hide-youtube-thumbnails/reviews/
- [YSS] AMO youtube-spoiler-shield, https://addons.mozilla.org/firefox/addon/youtube-spoiler-shield/reviews/
- [GH7] https://github.com/sergeio/yt-no-spoilers/issues/7

### 2a. Жалобы

| Тема | Отзывов | В каких расширениях | Цитаты (дословно, звёзды, дата, источник) |
|---|---|---|---|
| Ж1. Перестало работать или сломалось после обновления (YouTube или самого расширения) | 21 | D 3; NS 1; SP 2; TY 1; TL 1; HYT 6; CG 1; YSS 2; SP2 4 | «Used to work perfectly now every time I click the bar it switches to showing how much time is left in the video» — 1★, Oct 31, 2025 [D] (разработчик ответил Nov 3, 2025: «This is now fixed!»). «it seems with each update it's getting worse… no longer blocked the thumbnails in the suggestion side bar» — 1★, Dec 23, 2025 [SP]. «Seems to have stopped working on the sidebar?… Does it have to do with YouTube updates?» — 3★, 2026-01-24 [HYT] |
| Ж2. Производительность (тормоза, CPU, память) | 19 (все — Spoiler Protection 2.0 на AMO, 2017-12-19 … 2024-06-14) | SP2 19 | «it caused YouTube to become awfully slow and unresponsive» — 1★, 2020-05-23 [SP2]. «MASSIVE Memory Leak» — 1★, 2024-06-14 [SP2]. «slows down the browser to a crawl» — 3★, 2019-04-28 [SP2] |
| Ж3. Покрытие неполное: спойлер остаётся в части интерфейса (поиск и подсказки, сайдбар, уведомления, названия, прошедшее время, превью) | 12 | D 2; NS 1; SP 2; SP2 1; CG 1; TL 2; HYT 1; ASV 1; SPF 1 | «search results and suggestions will still show durations» — 2★, Nov 4, 2024 [D]. «If the entire thumbnail and video entry isn't removed, you still get spoilers via the video title» — 1★, 2023-12-19 [CG]. «it doesn't censor videos in my notification feed» — 5★, May 17, 2026 [NS] |
| Ж4. Нет быстрого вкл/выкл (только отключать расширение целиком) | 11 | PB 2; ASV 6; YNS 1; HYT 2 | «It permanently hides the bar, so there is no way to get it back without uninstalling the extension» — 1★, Mar 29, 2024 [PB]. «it could be MUCH more convenient if it had just a simple barebones pop up menu… so you can toggle it on/off» — 3★, 2024-10-21 [ASV] |
| Ж5. Побочные эффекты: ломает вёрстку и шрифты других сайтов, скрывает лишнее (строку поиска, эмодзи), автовоспроизведение выключено всегда | 8 | SP 3; SP2 1; HYT 1; YNS 2; GH7 1 | «you are injecting global CSS styles that conflicts with other classes» — 1★, Feb 7, 2026 [SP]. «removes all emojis in the comment section» — 3★, 2025-06-09 [HYT]. «Search bar missing» — issue, 2025-12-21 [GH7] |
| Ж6. Не работает на Twitch, хотя заявлено | 6 | ASV 4; TL 2 | «Said to work with Twitch, but it's not» — 2★, 2022-10-31 [ASV] |
| Ж7. Ключевые слова: ложные срабатывания, частичное скрытие, слова не сохраняются, нет нужного тайтла | 6 | SP2 3; SP 1; SPF 2 | «blocking "GoT"… also blocks "got"» — 3★, 2019-04-26 [SP2]. «if I search for "Sq"… it only hides Sq but shows uid game» — 1★, Jun 24, 2025 [SP]. «Cannot add a lot of shows… very hit-or-miss» — 1★, Feb 28, 2025 [SPF] |
| Ж8. Мелькание: спойлер виден до скрытия | 3 (1 прямая жалоба и 2 сравнения «у других мелькало») | ASV 1; CG 1; VS 1 | «When you reload a page, the time appears for a second» — 4★, 2023-07-30 [ASV]. «Other extensions I've tried have shown the progress bar for a split second when loading» — 5★, 2022-12-20 [CG]. «Loads fast, so you don't accidentally see it before it's hidden» — 5★, Mar 7, 2025 [VS] |
| Ж9. Страница настроек пустая или непонятная | 3 | SP2 3 | «the settings page is always completely blank for me» — 4★, 2025-06-04 [SP2]. «the UI is pretty confusing» — 3★, 2019-04-28 [SP2] |
| Ж10. Не работает на мобильном (Firefox Android) | 1 | SP2 1 | «Does not work on Firefox for Android» — 3★, 2019-04-27 [SP2] |
| Ж11. Нужен вход в аккаунт / не входит | 1 | SPF 1 | «I cant login at all» — 2★, Oct 19, 2023 [SPF] |

### 2b. Просьбы о функциях

| Тема | Отзывов | Цитаты |
|---|---|---|
| П1. Переключатель вкл/выкл: кнопка на панели, popup, горячая клавиша | 11 (как Ж4) | «Please add shortcut key option to toggle on or off this extension» — 5★, 2024-11-23 [YNS]. «I do wish there was some sort of way to toggle the feature on/off without having to disable it» — 5★, Sep 20, 2026 [PB]. «On/off keyboard shortcut» — 4★, 2022-11-17 [HYT] |
| П2. Отдельные настройки по элементам и сайтам (свои переключатели, показать комментарии, режим блюра или цвета) | 6 | «one toggle for hiding the elapsed time and one for hiding the total time for each Youtube and Twitch separatly» — 4★, 2024-05-12 [TL]. «no option to show comments other than disabling the addon» — 4★, 2023-07-30 [ASV]. «Blur thumbnail instead of hiding option» — 4★, 2022-11-17 [HYT] |
| П3. Скрывать больше мест: длительность в поиске и подсказках, лента уведомлений, прошедшее время, название | 6 | «on youtube i don't even want to see how much time as elapsed» — 5★, 2024-06-23 [TL]. «all resulting videos from the search bar and suggestions are still shown» — 5★, Jun 12, 2025 [D] |
| П4. Свои ключевые слова / пополнение базы тайтлов | 3 | «would really love to have an option to add my own text to block» — 4★, Oct 6, 2024 [SPF] |
| П5. Показывать длительность при скрытом превью (противоположно нашей цели) | 3 | «Show the video duration while blurring thumbnail» — 4★, 2022-11-17 [HYT]. «I would also love if video length was displayed somehow even when thumbnails are hidden» — 5★, 2025-07-17 [HYT] |
| П6. Кнопки перемотки без шкалы (±5 мин) | 1 просьба и 1 похвала | «Wish there was a +/-5mn on twitch» — 5★, Oct 31, 2026 [TY]. Похвала: «It also adds forward and backward time skips, so we can skip the preparation of competitive sports» — 5★, Jun 12, 2025 [D] |
| П7. Защита прямого эфира: при заходе на канал остановить, заглушить и скрыть live | 1 | «when you arrive on a channel, it stop (or mute & hide) the live at the top (for twitch)? Also a major source of spoiler if you arrive late on a match» — 4★, Jan 15, 2026 [TY] |
| П8. Отметка «уже смотрел» без полосы прогресса | 1 | «i would like to know which twitch videos i have already seen» — 5★, 2026-10-08 [TL] |
| П9. Скрыть сам список ключевых слов (он напоминает о спойлере) | 1 | «Include a way to hide the list of keywords that are being blocked» — 4★, Jun 16, 2025 [SP] |
| П10. Отключать автовоспроизведение только при включённой защите | 1 | «would be better if it only disabled autoplay when the addon is hiding spoilers» — 4★, 2021-03-01 [YNS] |
| П11. Работа сквозь рекламные паузы (похвала, не просьба) | 1 | «Works through ad breaks unlike the last extension I tried» — 5★, Dec 20, 2025 [VS] |

Сценарии, названные в отзывах, по одному упоминанию на отзыв:
- киберспорт и турниры — ASV 2018-10-03, 2024-04-17; YNS 2024-06-01;
- VOD спортивных матчей — YNS 2026-06-18;
- бадминтон в прямом эфире — YNS 2025-10-28;
- волейбол — Youtube Time Hider, Nov 22, 2025;
- rogue-like Let's Play — описание Denis.

---

## 3. Есть у конкурентов — нет у нас

Наш набор взят из брифа. Плюс по `manifest.json` и `popup/popup.html` в этой ветке: popup с общим переключателем и 4 строками настроек, ключа `commands` (горячих клавиш) в manifest нет. Каждый пункт ниже — функция по описанию конкурента (вендор).

1. **Горячая клавиша вкл/выкл.** Youtube: No Spoilers — Ctrl+Shift+Y; No Spoilers (0skater0) — Alt+Shift+U; YT Spoiler Blocker (eversoneder) — Alt+Shift+S.
2. **Кнопки перемотки без шкалы.** No Spoilers (0skater0) — 5/10 мин в панели, 1/5/10 мин по центру; Twitch&&YT; Video spoilerless; Denis (по отзыву); pingu-codes — 10 с / 1 мин / 10 мин; jameshoffmann.
3. **Скрытие комментариев.** Youtube: No Spoilers; No Spoilers (0skater0); YT Spoiler Blocker (eversoneder); Unhook; Enhancer; Tweaks. Комментарии по словам: SpoilerCub, BlockTube.
4. **Скрытие описания, списка глав и key moments.** No Spoilers (0skater0), YT Spoiler Blocker (eversoneder), Unhook (описание).
5. **Скрытие графика «Most replayed» (heatmap) и глав в плеере.** YT Spoiler Blocker (eversoneder), Spoiler Shield (merttdikmen), Tweaks (Clean Player: heatmap). У нас в content.js есть селектор `chapters-container`, а скрытие heatmap по брифу не заявлено — нужна проверка по коду.
6. **Скрытие таймкодов в описании, комментариях и транскрипте, длин глав.** Spoiler Shield (merttdikmen): таймкод заменяется на ▶. Hide YouTube Time: метки в комментариях.
7. **Скрытие рекомендаций рядом с видео (сайдбар), а не только их блюр.** Youtube: No Spoilers, No Spoilers (0skater0), Unhook, Enhancer, Tweaks.
8. **Отключение автовоспроизведения.** Youtube: No Spoilers; No Spoilers (0skater0) — включается обратно при выключении защиты; Unhook.
9. **Скрытие live chat и chat replay целиком.** No Spoilers (0skater0), Unhook, Enhancer. У нас чат под оверлеем «Show comments» — это другой механизм.
10. **Автораспознавание счёта в названиях и на превью, частичное скрытие названия (команды видны).** ScoreBlur, YouTube Spoiler Blocker (ledangtuanbk), Spoiler Shield (bariskoklu), Football Spoiler Blocker.
11. **Фильтры по ключевым словам.** Spoiler Shield (bariskoklu) — свои и встроенные слова; No Spoilers (grayhathacks10); No YouTube Spoilers; SpoilerCub; SpoilerProtection; Hide Spoilers и др.
12. **Списки каналов.** Белый список (защита только для выбранных): Video spoilerless. Выборочная защита по каналам и названиям: CGodiksen, z0nx (Greasy Fork). Чёрный список: Spoiler Shield (bariskoklu), No YouTube Spoilers.
13. **Правила по названию видео (авто-скрытие длительности).** Denis, CGodiksen.
14. **Раскрытие по наведению или Ctrl+наведение.** Hide YouTube Time — время; ScoreBlur — счёт; Hide YouTube Thumbnails — превью.
15. **Пауза защиты по таймеру (1 ч / 1 день / 1 неделя).** ScoreBlur.
16. **Скрытие tooltip с полным названием.** YouTube Spoiler Blocker (ledangtuanbk), No Spoilers (0skater0).
17. **Скрытие названия во вкладке браузера.** No Spoilers (0skater0), Hide YouTube title.
18. **Скрытие анимации перемотки (skip animation).** YT Spoiler Blocker (eversoneder).
19. **Замена названия на «канал · #хэш» или «SPOILER FOR: {keyword}».** pingu-codes, No YouTube Spoilers.
20. **Работа на других сайтах.**
    - Twitch: Twitch&&YT, No Spoilers (0skater0), Timeless, pingu-codes, Open End, merttdikmen.
    - SOOP / AfreecaTV: jameshoffmann, Anti Spoiler for Videos.
    - Netflix: Anti Spoiler for Videos.
    - F1TV: F1TV Spoiler Shield, philipbkemp.
    - Любые сайты: ScoreBlur, SpoilerProtection.
21. **Firefox-версия.** Firefox: Youtube: No Spoilers, No Spoilers (0skater0), Timeless, CGodiksen, Anti Spoiler for Videos и др. Safari и iOS: Hide Spoilers ($2.99, по сводке поиска).
22. **Своя лента любимых каналов и офлайн-плеер без шкалы (yt-dlp).** pingu-codes.
23. **Локализация.** ScoreBlur — 7 языков, Hide Spoilers — 49, DeArrow — 47. Наш листинг: English.

---

## 4. Противоречия и пробелы

- **Число пользователей в разных источниках расходится.**
  - Youtube Time Hider: в сводке поиска 72 users, на странице CWS 2026-11-05 — 59.
  - Video spoilerless: в сводке 142, на странице 155.
  - Twitch&&YT: в сводке 4.5 (19 оценок), на странице 4.6 (20).
  - В таблицу везде поставлены значения со страницы от 2026-11-05.
- **Tweaks for YouTube.** Сторонний листинг (по сводке поиска) даёт 70,000+ users, v3.91.0. CWS на 2026-11-05 — 60,000 users, v3.94.0. В таблице — CWS.
- **SpoilerProtection CWS.** Дату обновления (Sep 25, 2026, v3.0.11) я взял из сводки поиска. Страницу я загрузил, но версию из неё не выписал.
- **Spoiler Protection 2.0 и браузеры.** Tom's Guide пишет, что расширение работает в Chrome, Edge и Firefox. Android Infotech (May 2026) — что только в Chrome (по сводке поиска). Факт: на AMO карточка есть (900 users, последнее обновление 2019-04-21).
- **Мелькание.** Прямая жалоба одна (ASV, 2023). Ещё два отзыва упоминают мелькание у «других расширений», без названий.
- **Длительность при скрытом превью.** П5 (3 отзыва на Hide YouTube Thumbnails) противоположна цели антиспойлера. Это аудитория «меньше кликбейта», а не болельщики.
- **Производительность.** Все 19 жалоб относятся к одному расширению (Spoiler Protection 2.0, AMO, в основном 2019–2021). У других расширений жалоб на скорость я не нашёл.
- **Не открылись или недоступны:**
  - Greasy Fork — 403 Cloudflare и через WebFetch, и через curl, и в браузере. Метрики скриптов — только по сводке поиска; отзывов Greasy Fork нет.
  - Reddit — домен закрыт для инструментов поиска. Отзывы и просьбы из r/formula1, r/soccer, r/nba и т.п. не собраны.
  - Windows Central (статья про антиспойлер-расширение) — текст не загрузился, только заголовок.
  - CWS: Anticipation for YouTube and Twitch (`gnijgfamanlebomemfebpndnnbbpcijl`) и Open End (`bgajbplcmfhpfebhiigohjannldlolpf`) — страница пустая, вероятно сняты.
- **Не найдено:**
  - «TimeOff YouTube» и «No Spoiler Skip» — только упоминания в блоках «Related» на CWS, без ссылки и ID. По сводке поиска у TimeOff YouTube 4.4–4.5★.
  - Расширение с названием «Sports Spoiler Blocker» не найдено.
  - Spoiler Protection 2.0 как отдельная карточка CWS — на CWS сейчас карточка «SpoilerProtection» того же издателя.
- **Edge Add-ons.** По запросам «youtube spoiler» и «hide video duration» (2026-11-05) нет ни одного расширения, скрывающего длительность или шкалу. Есть Hide YouTube Thumbnails, SpoilerSafe, Spoiler Blocker: TV, Movie & Game, SpoilerBlocker. Число пользователей на Edge не собрано.
- **Safari.** Специализированного расширения для длительности не найдено (по сводке поиска).
- **Ограничение выборки CWS.** Отзывы — только первые ~10 «Recent» на карточку. Для Unhook, Enhancer, DeArrow, BlockTube и Tweaks отзывы не собирались: тысячи оценок, тема спойлеров в них не выделяется.
- **Монетизация.** Видна только у ScoreBlur (подписка), DeArrow ($1 по желанию), Unhook (донаты) и Hide Spoilers (iOS/Safari $2.99). У остальных — «нет данных» или бесплатно по README.
- **Временные файлы.** Playwright оставил в `.playwright-mcp/` рабочего дерева 6 файлов от этого исследования:
  - `console-2026-11-05T13-30-04-318Z.log`
  - `console-2026-11-05T13-30-27-055Z.log`
  - `console-2026-11-05T13-34-29-720Z.log`
  - `page-2026-11-05T13-30-07-650Z.yml`
  - `page-2026-11-05T13-30-27-708Z.yml`
  - `page-2026-11-05T13-34-31-630Z.yml`

  Удаление отклонил классификатор разрешений. Файл `console-2026-11-05T13-15-40-060Z.log` не мой.

---

## 5. Источники (дата обращения — 2026-11-05)

### Chrome Web Store

Карточки и вкладки `/reviews`:
- https://chromewebstore.google.com/detail/ofplbhckbbeohimppkfbcfjagcheiaia (наш листинг)
- https://chromewebstore.google.com/detail/jkgpcmmhejecphgdnihjfgmdpdkhgpke (Denis)
- https://chromewebstore.google.com/detail/knllbjmieejiihihaecdhamhcfadaadc (Twitch&&YT)
- https://chromewebstore.google.com/detail/oijcookiachipbcjfimdahgaacmmkpea (Progress Bar Hider)
- https://chromewebstore.google.com/detail/hkkpnepgmgeljhoiplhpoibfkjplbnia (Video spoilerless)
- https://chromewebstore.google.com/detail/mfbppcookafalpghcgckckpfofadhcdm (Youtube Time Hider)
- https://chromewebstore.google.com/detail/lamohgmflgjjahpncbdbinocopikappa (Hide YouTube Time)
- https://chromewebstore.google.com/detail/hmklilohlfdjlhpmdlidpfklabdopahk (No Spoilers, 0skater0)
- https://chromewebstore.google.com/detail/blkbooepcilfejmilklgpejkdedallii (ScoreBlur)
- https://chromewebstore.google.com/detail/biebcephpodngpmklmpelbpmefpgpeea (YouTube Spoiler Blocker)
- https://chromewebstore.google.com/detail/enafghmicnjmnebfmcnklceanlbpfolo (Spoiler Shield, bariskoklu)
- https://chromewebstore.google.com/detail/ggpachbmkdbhebnilfcoldipkpbncpko (Spoiler Shield, berkinduz)
- https://chromewebstore.google.com/detail/ebadfeeidhnahjigfkafdjbmmdlijhfk (Football Spoiler Blocker)
- https://chromewebstore.google.com/detail/kfbhhaallccnekmpojknfjblchllocgb (No Spoilers, grayhathacks10)
- https://chromewebstore.google.com/detail/eelacikjiplnmdingehjfdjcfegclmkg (SpoilerProtection)
- https://chromewebstore.google.com/detail/pdcocbmidjifbikkgfedadbemddmpnek (No YouTube Spoilers)
- https://chromewebstore.google.com/detail/nljhkjgljaihdfgohaippbpigjoicied (SpoilerCub)
- https://chromewebstore.google.com/detail/dglgbepdhdpfihbiklibdcecpadcdcln (Hide Spoilers)
- https://chromewebstore.google.com/detail/hmijoeophhplodchameaogmgdcphnode (Spoilerproof)
- https://chromewebstore.google.com/detail/gkebfkhjdeggiobehdifkkphcnhdonnm (SpoilerBlocker)
- https://chromewebstore.google.com/detail/lbhefhicendlbcjaokibgkdfafdblaeb (Hide YouTube title)
- https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid (Unhook)
- https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle (Enhancer)
- https://chromewebstore.google.com/detail/enamippconapkdmgfgjchkhakpfinmaj (DeArrow)
- https://chromewebstore.google.com/detail/bbeaicapbccfllodepmimpkgecanonai (BlockTube)
- https://chromewebstore.google.com/detail/ogkoifddpkoabehfemkolflcjhklmkge (Tweaks)

Карточки, которые оказались пустыми:
- https://chromewebstore.google.com/detail/anticipation-for-youtube/gnijgfamanlebomemfebpndnnbbpcijl
- https://chromewebstore.google.com/detail/bgajbplcmfhpfebhiigohjannldlolpf

### Firefox Add-ons

Через API `https://addons.mozilla.org/api/v5/addons/addon/<slug>/` и `https://addons.mozilla.org/api/v5/ratings/rating/?addon=<slug>`. Slug'и:
- youtube-no-spoilers
- youtube-spoiler-blocker
- anti-spoiler-for-videos
- timeless-video
- spoiler-protection-2-0
- no-spoilers-youtube
- hide-youtube-thumbnails
- youtube-spoiler-shield
- yt-spoiler-shield
- f1tv-spoiler-shield

Плюс поиск `https://addons.mozilla.org/api/v5/addons/search/?q=…` — для no-youtube-spoilers, youtube-progress-bar-hider, tweaks-for-youtube, control-panel-for-youtube.

### GitHub

Через `https://api.github.com/repos/…`, README:
- https://github.com/0skater0/no-spoiler
- https://github.com/eversoneder/Yt-Spoiler-Blocker-Extension
- https://github.com/merttdikmen/spoiler-shield
- https://github.com/pingu-codes/anti-spoiler-extension
- https://github.com/jameshoffmann/no-spoilers
- https://github.com/sergeio/yt-no-spoilers и https://github.com/sergeio/yt-no-spoilers/issues/7 (2025-12-21)
- https://github.com/philipbkemp/spoiler-alert
- https://github.com/CGodiksen/video-spoiler-blocker
- https://github.com/AdamSpannbauer/youtube_time_block (push 2018-08-22)
- https://github.com/krisantuswanandi/youtube-anti-spoiler
- https://github.com/domdomegg/hideytthumbnails-extension
- https://github.com/ajayyy/DeArrow
- https://github.com/lawrencehook/remove-youtube-suggestions (587★, push 2026-11-05)
- https://github.com/amitbl/blocktube
- https://github.com/NicolaiThorup/Chrome-Hide-Youtube-Progress-Bar (push 2016-03-03)
- https://github.com/snowwits/openend (по сводке поиска)

### Edge Add-ons

Поиск открыт в браузере 2026-11-05:
- https://microsoftedge.microsoft.com/addons/search/youtube%20spoiler
- https://microsoftedge.microsoft.com/addons/search/hide%20video%20duration

### Прочее

- https://scoreblur.app/ — цены, 2026-11-05.
- По сводке поиска: Greasy Fork https://greasyfork.org/en/scripts/427427 , /480298 , /466165 , /517695 , /548136 , /441800 (страницы — 403).
- App Store, Hide Spoilers: https://apps.apple.com/us/app/hide-spoilers/id6740436834 (по сводке поиска).
- https://dontspoil.tv/guide (по сводке поиска).
- Отзывы о Spoiler Protection 2.0 (по сводке поиска):
  - https://www.resetera.com/threads/spoiler-protection-2-0-is-a-great-way-to-shield-against-spoilers-supported-on-chrome-firefox.195738/
  - https://www.tomsguide.com/how-to/how-to-avoid-spoilers-on-social-media
  - https://www.androidinfotech.com/hide-spoiler-contents-chrome-extension/ (May 2026)
- https://www.windowscentral.com/gaming/youtube-just-spoiled-one-of-2025s-biggest-games-for-me-so-i-downloaded-this-cool-browser-extension-to-make-sure-it-never-happens-again — не загрузилась.
