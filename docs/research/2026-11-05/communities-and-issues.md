# Сообщества, GitHub и поведение YouTube: что спойлерит болельщиков и что ломает антиспойлер-расширения

Дата сбора: 2026-11-05. Срез: GitHub (репозитории и issues), Reddit и форумы, изменения вёрстки YouTube 2025–2026, live/повторы.
Магазины расширений и их отзывы сюда не входят — это другой срез.

## Как собирались данные и чего они стоят

- **GitHub:** поиск через REST API `search/repositories` и `search/issues` без авторизации. Полные списки issues выгружены
  по 14 нишевым репозиториям. Отдельно — счётчики совпадений по заголовкам issues в 8 крупных расширениях «для настройки
  YouTube». Лимит API (60 запросов в час) исчерпан к 16:55 2026-11-05, поэтому часть issues прочитана через веб-страницу.
- **Reddit:** прямой доступ (reddit.com, old.reddit.com, JSON API) закрыт: HTTP 403; WebSearch и WebFetch Reddit не пускают.
  Поиск в архиве Arctic Shift по большим сабреддитам отвечал «Timeout». Поэтому треды находились через DuckDuckGo HTML,
  а текст постов и комментариев (дата, счёт, id) брался из архива Arctic Shift по id треда.
  **Выборка не случайная и не полная**: «как часто упоминают» ниже — число найденных тредов и issues, а не доля в сообществе.
- Пометка «по сводке поиска» — факт взят из выдачи WebSearch без открытия первоисточника.

---

## 1. Источник спойлера → как часто упоминают → ссылки

Счёт — число найденных тредов и issues, где этот источник прямо назван спойлером. Даты — даты публикации.

| # | Источник спойлера | Reddit / форумы | GitHub | Ссылки (дата) |
|---|---|---|---|---|
| 1 | **Длительность видео / VOD** | 12 | 5 | r/aoe2 [110etot](https://reddit.com/comments/110etot) (2023-02-12, 66 голосов, 84 комм.); r/OverwatchLeague [y4tqao](https://reddit.com/comments/y4tqao) (2022-10-15, 93); r/starcraft [193m9lf](https://reddit.com/comments/193m9lf) (2024-01-10); r/smashbros [bwpm4l](https://www.reddit.com/r/smashbros/comments/bwpm4l/) (2019-06-04); r/smitepro [suslfp](https://reddit.com/comments/suslfp) (2022-02-17); r/LoLeventVoDs [1me8o5](https://www.reddit.com/r/LoLeventVoDs/comments/1me8o5/), r/aoe2 [auhexd](https://www.reddit.com/r/aoe2/comments/auhexd/), r/PleX [1blbs2h](https://www.reddit.com/r/PleX/comments/1blbs2h/), r/broodwar [nm678j](https://www.reddit.com/r/broodwar/comments/nm678j/), r/starcraft [64hi37](https://www.reddit.com/r/starcraft/comments/64hi37/), [n0q8vc](https://www.reddit.com/r/starcraft/comments/n0q8vc/) (эти пять — только по заголовку и сниппету); r/F1TV [1388xoz](https://reddit.com/comments/1388xoz) (2023-05-05, комментарий «tells the runtime of the broadcast»). GitHub: [YouTube-Enhancer#1153](https://github.com/YouTube-Enhancer/extension/issues/1153) (2026-01-25), [code-charity/youtube#1392](https://github.com/code-charity/youtube/issues/1392) (2022-08-04), [DeArrow#453](https://github.com/ajayyy/DeArrow/issues/453) (2026-03-03, мотив не спойлер), [NicolaiThorup#2](https://github.com/NicolaiThorup/Chrome-Hide-Youtube-Progress-Bar/issues/2) (2024-09-03), [cis3296…#9](https://github.com/cis3296-F26-Applebaum-Nguyen/project-proposal/issues/9) (комментарий, 2026-10) |
| 2 | **Превью (счёт, лицо победителя, подиум, авария)** | 10 | 4 | r/nba [1850m2e](https://reddit.com/comments/1850m2e) (2023-11-27, 40); r/nfl [y2z871](https://reddit.com/comments/y2z871) (2022-10-13); r/F1TV [uzbc5x](https://reddit.com/comments/uzbc5x) (2022-05-28, 105); r/F1TV [1d852qi](https://reddit.com/comments/1d852qi) (2024-06-04, 102); r/F1TV [1388xoz](https://reddit.com/comments/1388xoz); r/Competitiveoverwatch [n7mhvq](https://reddit.com/comments/n7mhvq) (2021-05-08); r/LeedsUnited [16qd9d0](https://reddit.com/comments/16qd9d0) (2023-09-23); r/motogp [15vf2hp](https://reddit.com/comments/15vf2hp) (2023-08-19); r/userscripts [15wn2n3](https://reddit.com/comments/15wn2n3) (2023-08-20); r/tennis [1u4muaw](https://reddit.com/comments/1u4muaw) (2026-06-13). GitHub: [DeArrow#434](https://github.com/ajayyy/DeArrow/issues/434) (2025-12-11), [philipbkemp/spoiler-alert#1, #2](https://github.com/philipbkemp/spoiler-alert/issues) (2024-11-20), [Despoilerize#3](https://github.com/AnthonyPWatts/Despoilerize/issues/3) (2026-08-22), репозиторий [EspoilerBlocker](https://github.com/originalnicodr/EspoilerBlocker) целиком |
| 3 | **Название («X wins», счёт, «comeback»)** | 7 | 2 | r/football [z2tkxg](https://reddit.com/comments/z2tkxg) (2022-11-23); r/ValorantCompetitive [ywr7yc](https://reddit.com/comments/ywr7yc) (2022-11-16, 309 голосов); r/LeedsUnited [16qd9d0](https://reddit.com/comments/16qd9d0); r/tennis [1d3g27g](https://reddit.com/comments/1d3g27g) (2024-05-29, названия в поиске); r/nba [1850m2e](https://reddit.com/comments/1850m2e) (комментарий kb2or31); r/motogp [15vf2hp](https://reddit.com/comments/15vf2hp); r/userscripts [15wn2n3](https://reddit.com/comments/15wn2n3). GitHub: [DeArrow#434](https://github.com/ajayyy/DeArrow/issues/434), [anjerodev/score-no-more](https://github.com/anjerodev/score-no-more) (описание репозитория) |
| 4 | **Полоса прогресса / позиция перемотки** | 6 | 3 | r/youtubetv [16f4eu4](https://reddit.com/comments/16f4eu4) (2023-09-10); r/youtubetv [b9cykj](https://reddit.com/comments/b9cykj) (2019-04-04, 34); r/csgo [13c4i9v](https://reddit.com/comments/13c4i9v) (2023-05-08, стрелки + полоса; обновлённый букмарклет 2026-02-23); r/starcraft [64hi37](https://www.reddit.com/r/starcraft/comments/64hi37/), [5ubc88](https://www.reddit.com/r/starcraft/comments/5ubc88/), [2hq22j](https://www.reddit.com/r/starcraft/comments/2hq22j/) (по сниппету). GitHub: [CGodiksen#1](https://github.com/CGodiksen/video-spoiler-blocker/issues/1) (2021-04-13), [yt-no-spoilers#2](https://github.com/sergeio/yt-no-spoilers/issues/2) (PiP, 2023-12-01), [yt-no-spoilers#5](https://github.com/sergeio/yt-no-spoilers/issues/5) (красная полоса просмотра на превью, 2025-09-17) |
| 5 | **Рекомендации (главная, сайдбар, «стена» после видео)** | 5 | 4 | r/tennis [1u4muaw](https://reddit.com/comments/1u4muaw) (2026-06-13); r/Competitiveoverwatch [n7mhvq](https://reddit.com/comments/n7mhvq) (комментарий gxehz99: «suggested videos sidebar still ruined the match»); r/NoStupidQuestions [18ivi3g](https://reddit.com/comments/18ivi3g) (2023-12-15); r/youtube [8ej3ja](https://reddit.com/comments/8ej3ja) (2018-04-24, будущие загрузки канала); r/F1TV [1d852qi](https://reddit.com/comments/1d852qi). GitHub: [EspoilerBlocker#12](https://github.com/originalnicodr/EspoilerBlocker/issues/12), [#26](https://github.com/originalnicodr/EspoilerBlocker/issues/26), [Despoilerize#3](https://github.com/AnthonyPWatts/Despoilerize/issues/3), [Nova#71](https://github.com/raingart/Nova-YouTube-extension/issues/71) (end-screen suggestions) |
| 6 | **Комментарии (особенно верхний комментарий под видео на мобильном)** | 3 | 3 репо | r/Schmoedown [ivs5tt](https://reddit.com/comments/ivs5tt) (2020-09-19: «top comment displays directly under the video and is always a spoiler»); r/mildlyinfuriating [oowpns](https://reddit.com/comments/oowpns) (2021-07-21); r/nba [1850m2e](https://reddit.com/comments/1850m2e) (комм. kaynfbu). GitHub-репозитории: [ONDAAA/spoilerie](https://github.com/ONDAAA/spoilerie), [willnjohnson/youtube-comment-spoiler-shield](https://github.com/willnjohnson/youtube-comment-spoiler-shield), [Dearest/plotveil](https://github.com/Dearest/plotveil); Greasy Fork: [Hide Youtube Mobile Top Comment](https://greasyfork.org/scripts/507579-hide-youtube-mobile-top-comment) (28 установок, обновлён 2025-03-18) |
| 7 | **Уведомления** | 2 | 1 | r/AEWOfficial [x33ltt](https://reddit.com/comments/x33ltt) (2022-09-01, 121 голос: уведомление YouTube с результатом главного боя); r/youtubetv [z6jti1](https://reddit.com/comments/z6jti1) (2022-11-28; по ответам — уведомление устройства, не YouTube). GitHub: [cis3296…#9](https://github.com/cis3296-F26-Applebaum-Nguyen/project-proposal/issues/9), комментарий samuel-kritz |
| 8 | **Описание видео** | 2 | 2 | r/userscripts [15wn2n3](https://reddit.com/comments/15wn2n3); r/Schmoedown [ivs5tt](https://reddit.com/comments/ivs5tt) (обход: «dropping the description down»). GitHub: [EspoilerBlocker#36](https://github.com/originalnicodr/EspoilerBlocker/issues/36) (2025-11-14, голы в описании); [relive-2#21](https://github.com/SilverLinings89/relive-2/issues/21) (2026-08-22, описания загрузчика TI 2022 раскрывают сетку) |
| 9 | **Экран «Up next» / end screen / кнопка «следующее видео» при наведении** | 1 | 4 | r/appletv [1c1f2ys](https://reddit.com/comments/1c1f2ys) (2024-04-11; комментарий 2026-09-22: «still no way to disable»). GitHub: [EspoilerBlocker#25](https://github.com/originalnicodr/EspoilerBlocker/issues/25), [#26](https://github.com/originalnicodr/EspoilerBlocker/issues/26), [#12](https://github.com/originalnicodr/EspoilerBlocker/issues/12); [relive-2#3](https://github.com/SilverLinings89/relive-2/issues/3) (end screens в последние 5–20 с) |
| 10 | **Выбор трансляции / кто в кадре** (хоккей: в нарезке — трансляция команды-победителя; NBA и NFL: на превью игрок или QB победителя) | 3 | 0 | r/hockey [f4ohbf](https://reddit.com/comments/f4ohbf) (2020-02-16); r/nba [1850m2e](https://reddit.com/comments/1850m2e) (kayn0ng); r/nfl [y2z871](https://reddit.com/comments/y2z871) (is5sq5r) |
| 11 | **Названия и состав следующих матчей / будущие загрузки** | 2 | 0 | r/DotA2 [y0e3oh](https://reddit.com/comments/y0e3oh) (2022-10-10, «saw Na'vi is playing Tempest so I knew they lost»); r/youtube [8ej3ja](https://reddit.com/comments/8ej3ja) |
| 12 | **Превью при наведении (inline) и заставка перед загрузкой** | 0 | 2 | [EspoilerBlocker#5](https://github.com/originalnicodr/EspoilerBlocker/issues/5) (2025-02-17), [#29](https://github.com/originalnicodr/EspoilerBlocker/issues/29) (2025-05-01) |
| 13 | **Раскадровка при наведении на таймлайн** | 0 явно (1 тред по заголовку, не о спортe) | 2 | r/answers [6bb3ax](https://www.reddit.com/r/answers/comments/6bb3ax/) (только заголовок). GitHub: [code-charity/youtube#2695](https://github.com/code-charity/youtube/issues/2695) «Hide Progress Bar Previews» (2024-11-28); [relive-2#3](https://github.com/SilverLinings89/relive-2/issues/3) |
| 14 | **«Most replayed» (тепловая карта)** | 0 в спортивном контексте; 2 треда — неудобство перемотки | 3 | r/youtube [1af45rd](https://reddit.com/comments/1af45rd) (2024-01-31), [18q8u8w](https://reddit.com/comments/18q8u8w) (2023-12-25). GitHub: [code-charity/youtube#2638](https://github.com/code-charity/youtube/issues/2638) (2024-10-30, «Hide Most Clicked Progress Bar Overlay», 10 комм.), [#1951](https://github.com/code-charity/youtube/issues/1951), [stripped-yt#6](https://github.com/johnjago/stripped-yt/issues/6) (2022-06-08) |
| 15 | **Главы** | 0 | 1 | [relive-2#21](https://github.com/SilverLinings89/relive-2/issues/21) (текст глав в описании, п. 13); отдельно просят скрывать автоглавы ИИ: [CPfY#342](https://github.com/insin/control-panel-for-youtube/issues/342), [#344](https://github.com/insin/control-panel-for-youtube/issues/344) (2026-09-30, 2026-10-07; мотив не спойлер) |
| 16 | **Заголовок вкладки, история, OG-превью** | 0 | 2 | [relive-2#21](https://github.com/SilverLinings89/relive-2/issues/21) (п. 6); [EspoilerBlocker#27](https://github.com/originalnicodr/EspoilerBlocker/issues/27) (title пуст при смене маршрута — сбой, а не жалоба) |
| 17 | **Shorts** | 0 о спорте (2 — о фильмах и аниме) | 1 | r/AskReddit [12ffzjo](https://www.reddit.com/r/AskReddit/comments/12ffzjo/), r/KimetsuNoYaiba [13tx9bu](https://www.reddit.com/r/KimetsuNoYaiba/comments/13tx9bu/) (по сниппету). Расширение из r/chrome_extensions [1x8xggm](https://reddit.com/comments/1x8xggm) (2026-10-18) прячет карточки и Shorts по ключевым словам |
| 18 | **Число просмотров** | 0 | 0 | Нет данных из сообществ. Косвенно: «unexpected crashes, shock winners… cause spikes» в просмотрах F1-хайлайтов — [Alan Dove, Substack](https://alandove.substack.com/p/f1-youtube-stats-suggest-all-isnt) (2025-08, по сводке поиска, статья платная); «Counts of things» в [relive-2#21](https://github.com/SilverLinings89/relive-2/issues/21) |
| 19 | Подсказки поиска (autocomplete) | 0 | 0 | Нет данных: найденные треды ([xp0na3](https://www.reddit.com/r/youtube/comments/xp0na3/), [15j496e](https://www.reddit.com/r/youtube/comments/15j496e/)) не о спойлерах |
| 20 | Число лайков, вкладка канала (кроме п. 11) | 0 | 0 | Нет данных |

### Короткие цитаты

- «I am always spoiled by these Fantastic Finishes videos as they post the ending score on the thumbnail» — r/nba, 2023-11-27, [1850m2e](https://reddit.com/comments/1850m2e).
- «without fail whichever team is shown on the thumbnail wins that game» — r/nfl, 2022-10-13, [y2z871](https://reddit.com/comments/y2z871).
- «I see it a bo3 thats 1 hour long. Based on this info I now know its a 3-0» — r/aoe2, 2023-02-12, [110etot](https://reddit.com/comments/110etot).
- «the vod was 1 hour 32 minutes and the game ends at 58 minutes» — r/OverwatchLeague, 2022-10-15, [y4tqao](https://reddit.com/comments/y4tqao) (комм. isfxdm8): длина записи трансляции не равна длине игры.
- «you know how many OTs the game goes based on how long the recording is» — r/youtubetv, 2024-04-27, [16f4eu4](https://reddit.com/comments/16f4eu4) (комм. l1kcidg).
- «use your arrow keys to skip through videos without wanting the YouTube progress bar to spoil the length» — r/csgo, 2023-05-08, [13c4i9v](https://reddit.com/comments/13c4i9v).
- «the top comment displays directly under the video and is always a spoiler for the winner» — r/Schmoedown, 2020-09-19, [ivs5tt](https://reddit.com/comments/ivs5tt).
- «I effectively did this (used history to go the vod) and the suggested videos sidebar still ruined the match» — r/Competitiveoverwatch, 2021-05-08, [n7mhvq](https://reddit.com/comments/n7mhvq).
- «I can't count the number of times I've had the suspense ruined … by accidentally coming across a sport highlight video in my Home Page» — GitHub, 2025-12-11, [DeArrow#434](https://github.com/ajayyy/DeArrow/issues/434).
- «Knowing how much time is left can sometimes spoil a video … a channel-based blacklist would be useful» — GitHub, 2026-01-25, [YouTube-Enhancer#1153](https://github.com/YouTube-Enhancer/extension/issues/1153).

### Чем пользуются (по тем же тредам)

| Способ | Где упомянут (дата) |
|---|---|
| Расширение, ставящее превью из случайного кадра (Clickbait Remover for YouTube) | r/nba [1850m2e](https://reddit.com/comments/1850m2e) (2023-11-27); r/tennis [1d3g27g](https://reddit.com/comments/1d3g27g) (2024-05-29); r/nfl [y2z871](https://reddit.com/comments/y2z871) |
| Расширения, скрывающие длительность и прогресс: «Anticipation», «Hide video duration», «Twitch && Youtube spoiler-free» (Adrián Arbizu) | r/starcraft [193m9lf](https://reddit.com/comments/193m9lf) (комм. 2025-03-05); r/smashbros [bwpm4l](https://www.reddit.com/r/smashbros/comments/bwpm4l/); r/OverwatchLeague [y4tqao](https://reddit.com/comments/y4tqao); r/smitepro [suslfp](https://reddit.com/comments/suslfp) |
| Самописные букмарклеты и CSS (`.ytp-progress-bar`, `.ytp-time-display`) | r/csgo [13c4i9v](https://reddit.com/comments/13c4i9v) (2023 и 2026-02-23); r/starcraft [2hq22j](https://www.reddit.com/r/starcraft/comments/2hq22j/) (по сниппету) |
| Блокировка по ключевым словам и каналам (BlockTube, Spoiler Slayer и др.) | r/TwoBestFriendsPlay [16iqui5](https://www.reddit.com/r/TwoBestFriendsPlay/comments/16iqui5/) (по сниппету); r/chrome_extensions [1x8xggm](https://reddit.com/comments/1x8xggm) (2026-10-18) |
| Ручные приёмы: полноэкранный режим против комментариев, отписка и отключение уведомлений, отключение истории просмотров, закладка на плейлист хайлайтов, голосовая перемотка на ТВ, «закрыть глаза» | r/mildlyinfuriating [oowpns](https://reddit.com/comments/oowpns); r/AEWOfficial [x33ltt](https://reddit.com/comments/x33ltt); r/NoStupidQuestions [18ivi3g](https://reddit.com/comments/18ivi3g); r/hockey [f4ohbf](https://reddit.com/comments/f4ohbf); r/youtubetv [b9cykj](https://reddit.com/comments/b9cykj); r/LeedsUnited [16qd9d0](https://reddit.com/comments/16qd9d0); r/starcraft [193m9lf](https://reddit.com/comments/193m9lf) |
| Сторонние спойлер-фри сайты и плееры: dtmts.com, No Spoiler Tennis, sc2casts, F1 MultiViewer | r/hockey [1npufq](https://www.reddit.com/r/hockey/comments/1npufq/) (по сниппету); r/tennis [13y9s5q](https://reddit.com/comments/13y9s5q) (2023-06-02, 299); r/starcraft [193m9lf](https://reddit.com/comments/193m9lf); r/F1TV [1388xoz](https://reddit.com/comments/1388xoz) |

**Чего не хватает (дословные просьбы):** скрытие по каналу или списку каналов
([yt-no-spoilers#9](https://github.com/sergeio/yt-no-spoilers/issues/9), 2026-04-06; [YouTube-Enhancer#1153](https://github.com/YouTube-Enhancer/extension/issues/1153); [code-charity#1392](https://github.com/code-charity/youtube/issues/1392)); работа на мобильном и Android
([yt-no-spoilers#8](https://github.com/sergeio/yt-no-spoilers/issues/8); r/starcraft, iPhone, [193m9lf](https://reddit.com/comments/193m9lf));
приложение и ТВ (r/motogp [15vf2hp](https://reddit.com/comments/15vf2hp); r/F1TV [uzbc5x](https://reddit.com/comments/uzbc5x): «No good ideas for my android tv app»);
открывать результат постепенно и «по истечении срока» ([EspoilerBlocker#16](https://github.com/originalnicodr/EspoilerBlocker/issues/16), [#21](https://github.com/originalnicodr/EspoilerBlocker/issues/21);
[cis3296…#9](https://github.com/cis3296-F26-Applebaum-Nguyen/project-proposal/issues/9): таймер «spoil me»); спойлер-сегмент в SponsorBlock
([SponsorBlock#546](https://github.com/ajayyy/SponsorBlock/issues/546), открыт с 2020-11-20, 35 👍, 14 комм.; похожие закрытые [#1439](https://github.com/ajayyy/SponsorBlock/issues/1439), [#2156](https://github.com/ajayyy/SponsorBlock/issues/2156), [#1779](https://github.com/ajayyy/SponsorBlock/issues/1779));
поиск, не открывающий результат (r/tennis [1d3g27g](https://reddit.com/comments/1d3g27g); [yt-no-spoilers#7](https://github.com/sergeio/yt-no-spoilers/issues/7): расширение прятало строку поиска).

---

## 2. Типичные баги антиспойлер-расширений (GitHub)

### 2a. Нишевые антиспойлер-репозитории — ручная классификация

Корпус: все issues 7 репозиториев (67 шт.): [EspoilerBlocker](https://github.com/originalnicodr/EspoilerBlocker/issues) — 27,
[spoiler-slayer](https://github.com/brettp/spoiler-slayer/issues) — 23, [Despoilerize](https://github.com/AnthonyPWatts/Despoilerize/issues) — 7,
[yt-no-spoilers](https://github.com/sergeio/yt-no-spoilers/issues) — 6, [NicolaiThorup/Chrome-Hide-Youtube-Progress-Bar](https://github.com/NicolaiThorup/Chrome-Hide-Youtube-Progress-Bar/issues) — 2,
[Andrew1175/No-YouTube-Spoilers](https://github.com/Andrew1175/No-YouTube-Spoilers/issues) — 1, [CGodiksen/video-spoiler-blocker](https://github.com/CGodiksen/video-spoiler-blocker/issues) — 1.
Остальные найденные нишевые репозитории (около 140 по поиску «youtube spoiler» и смежным) почти без issues: у большинства 0
открытых; [dricholm/hide-duration](https://github.com/dricholm/hide-duration) — 0 issues и 24 PR. Одно issue может попасть в два типа.

| Тип бага | Число issues | Ссылки |
|---|---|---|
| SPA-навигация, переиспользование DOM-узлов YouTube, подгрузка при прокрутке — скрытие не применяется или применяется не к тому видео | 7 | [EspoilerBlocker#27](https://github.com/originalnicodr/EspoilerBlocker/issues/27) (смена маршрута), [#24](https://github.com/originalnicodr/EspoilerBlocker/issues/24) (открыт: остаётся название прошлого видео), [#20](https://github.com/originalnicodr/EspoilerBlocker/issues/20), [#14](https://github.com/originalnicodr/EspoilerBlocker/issues/14) (открыт: «YouTube updates previous "slots" for videos with new ones»); [spoiler-slayer#22](https://github.com/brettp/spoiler-slayer/issues/22) (открыт: при прокрутке новые видео не скрыты), [#20](https://github.com/brettp/spoiler-slayer/issues/20); [Despoilerize#3](https://github.com/AnthonyPWatts/Despoilerize/issues/3) (2026-08-22: карточки F1 видны при включённой защите) |
| Непокрытые поверхности (описание, панель плейлиста, страница плейлиста, «стена» после видео, кнопка «далее», поиск) | 8 | [EspoilerBlocker#36](https://github.com/originalnicodr/EspoilerBlocker/issues/36), [#33](https://github.com/originalnicodr/EspoilerBlocker/issues/33), [#31](https://github.com/originalnicodr/EspoilerBlocker/issues/31), [#26](https://github.com/originalnicodr/EspoilerBlocker/issues/26), [#25](https://github.com/originalnicodr/EspoilerBlocker/issues/25), [#12](https://github.com/originalnicodr/EspoilerBlocker/issues/12), [#9](https://github.com/originalnicodr/EspoilerBlocker/issues/9); [Andrew1175#1](https://github.com/Andrew1175/No-YouTube-Spoilers/issues/1) (2026-09-08: в плейлисте размыто превью, но не название) |
| Мерцание до скрытия (оригинальное превью на долю секунды, заставка перед загрузкой) | 2 | [EspoilerBlocker#5](https://github.com/originalnicodr/EspoilerBlocker/issues/5) («a glimpse of the original thumbnail»), [#29](https://github.com/originalnicodr/EspoilerBlocker/issues/29) («splash screen showing the thumbnail»). Предложение внедрять скрытие на `document_start` — [cis3296…#9](https://github.com/cis3296-F26-Applebaum-Nguyen/project-proposal/issues/9) |
| Ложные срабатывания и избыточное скрытие | 3 | [Despoilerize#5](https://github.com/AnthonyPWatts/Despoilerize/issues/5) (2026-09-26: размыты не связанные с F1 рекомендации), [EspoilerBlocker#18](https://github.com/originalnicodr/EspoilerBlocker/issues/18) (баскетбол), [yt-no-spoilers#7](https://github.com/sergeio/yt-no-spoilers/issues/7) (спрятана строка поиска) |
| Расширение ломает вёрстку или другие функции страницы | 3 | [Despoilerize#4](https://github.com/AnthonyPWatts/Despoilerize/issues/4) (2026-09-12: размытая карточка растягивается на всю ширину ленты), [yt-no-spoilers#1](https://github.com/sergeio/yt-no-spoilers/issues/1) (меню и всплывающие окна), [spoiler-slayer#23](https://github.com/brettp/spoiler-slayer/issues/23) (YouTube Studio пустой, 2026-01-03) |
| Элементы, которые YouTube дорисовывает позже (ленивая загрузка) | 1 (+1 в смежных) | [EspoilerBlocker#34](https://github.com/originalnicodr/EspoilerBlocker/issues/34) (полоса прогресса превью инициализируется позже); смежное: [Control Panel for YouTube#264](https://github.com/insin/control-panel-for-youtube/issues/264) (2026-04-25: «progress bars must be coming in later now») |
| Мобильная версия, Android | 1 | [yt-no-spoilers#8](https://github.com/sergeio/yt-no-spoilers/issues/8) (2025-12-21) |
| Картинка в картинке (PiP) показывает прогресс | 1 | [yt-no-spoilers#2](https://github.com/sergeio/yt-no-spoilers/issues/2) |
| Полоса «уже просмотрено» на превью | 1 | [yt-no-spoilers#5](https://github.com/sergeio/yt-no-spoilers/issues/5) |
| Перестало работать после обновления сайта | 1 (Twitch) | [ky-is/twitch-vod-unspoiler#1](https://github.com/ky-is/twitch-vod-unspoiler/issues/1) (2020-05-09) |
| Shorts, m.youtube.com, embed на других сайтах, YouTube Music, полноэкранный режим, клавиши 0–9 и стрелки, главы, «Most replayed» | **0** в нишевых репозиториях | Нет данных. Клавиши 0–9 описаны как утечка в исследовании [relive-2#3](https://github.com/SilverLinings89/relive-2/issues/3) и [#21](https://github.com/SilverLinings89/relive-2/issues/21) (2026-08-22): «1 jumps to the point 10% into the video…» |

### 2b. Крупные расширения «для настройки YouTube» — совпадения по заголовкам issues

Корпус: [Control Panel for YouTube](https://github.com/insin/control-panel-for-youtube), [DeArrow](https://github.com/ajayyy/DeArrow), [BlockTube](https://github.com/amitbl/blocktube),
[ImprovedTube (code-charity/youtube)](https://github.com/code-charity/youtube), [YouTube-Enhancer](https://github.com/YouTube-Enhancer/extension), [hide-youtube-shorts](https://github.com/Vulpelo/hide-youtube-shorts),
[yt-neuter](https://github.com/mchangrh/yt-neuter), [YouTubeRedux](https://github.com/omnidevZero/YouTubeRedux). Поиск 2026-11-05 по `in:title`, вручную не размечено.
**Это счёт ключевых слов, а не баги**: туда входят и запросы функций. Около половины совпадений даёт ImprovedTube.

| Тема (ключевые слова в заголовке) | Всего | Из них ImprovedTube | Примеры |
|---|---|---|---|
| Изменения вёрстки, «перестало работать» (`new layout`, `new ui`, `stopped working`, `no longer works`, `broken`) | 169 | 33 | [YouTube-Enhancer#526](https://github.com/YouTube-Enhancer/extension/issues/526) (2024-06-17: расширение не грузится на новой вёрстке, 15 комм.) |
| Полноэкранный режим, театр | 153 | 63 | [code-charity#4283](https://github.com/code-charity/youtube/issues/4283) (главы в полноэкранном) |
| Shorts | 152 | 50 | [code-charity#1779](https://github.com/code-charity/youtube/issues/1779) |
| Клавиатура, горячие клавиши | 128 | 89 | [code-charity#2406](https://github.com/code-charity/youtube/issues/2406) (стрелки перестали перематывать, 2024-06-22) |
| Наведение, превью (`hover`, `preview`, `inline playback`) | 111 | 49 | [CPfY#278](https://github.com/insin/control-panel-for-youtube/issues/278) (2026-05-17: «Disabling video previews stopped working») |
| Live, стримы | 99 | 61 | [CPfY#249](https://github.com/insin/control-panel-for-youtube/issues/249) |
| SPA-навигация, перезагрузка | 54 | 35 | [code-charity#4055](https://github.com/code-charity/youtube/issues/4055) (2026-06-30: «Hide Thumbnails breaks after page reload»), [#4308](https://github.com/code-charity/youtube/issues/4308) |
| Полоса прогресса | 53 | 41 | [code-charity#2622](https://github.com/code-charity/youtube/issues/2622) (2024-10-22: новый прогресс-бар YouTube, 20 комм.) |
| Длительность, таймкоды | 50 | 31 | [code-charity#3413](https://github.com/code-charity/youtube/issues/3413) (2025-12-02: «Video Duration Box Disappearing») |
| Мини-плеер, PiP | 46 | 37 | — |
| Embed, iframe | 42 | 32 | [code-charity#366](https://github.com/code-charity/youtube/issues/366) (мигание embed) |
| Мобильная версия, m.youtube.com | 30 | 3 (BlockTube — 12, CPfY — 9) | — |
| Главы | 28 | 17 | [code-charity#2324](https://github.com/code-charity/youtube/issues/2324) (2024-05-31: новая вёрстка ломает главы) |
| YouTube Music | 10 | 5 | — |
| Мерцание, вспышка | 8 | 6 | [DeArrow#153](https://github.com/ajayyy/DeArrow/issues/153) |
| «Most replayed», heatmap | 2 | 2 | [code-charity#1951](https://github.com/code-charity/youtube/issues/1951), [#4147](https://github.com/code-charity/youtube/issues/4147) |

Метка `youtube-change` («Related to or caused by YouTube itself changing something») в Control Panel for YouTube:
**66 issues, из них 16 в 2025 и 34 в 2026** (остальные 16 — 2024 и раньше; поиск 2026-11-05,
[список](https://github.com/insin/control-panel-for-youtube/issues?q=label%3Ayoutube-change)).

---

## 3. Изменения вёрстки и поведения YouTube в 2025–2026, ломавшие расширения

| Дата | Что изменилось | Источник |
|---|---|---|
| 2024-09-09 | Во внутреннем API появился рендерер `shortsLockupViewModel` | [lighttube-org/InnerTube#58](https://github.com/lighttube-org/InnerTube/issues/58) (по заголовку) |
| 2024-10-22 | Новый вид прогресс-бара (красно-розовый градиент) перекрыл пользовательский цвет | [code-charity#2622](https://github.com/code-charity/youtube/issues/2622) |
| 2025-07-15 | Метаданные `lockupViewModel` потребовали доработки парсеров | [NewPipeExtractor#1336](https://github.com/TeamNewPipe/NewPipeExtractor/issues/1336) (по заголовку) |
| 2025-09-09 | Новая вёрстка блока `#related` на десктопе | [CPfY#120](https://github.com/insin/control-panel-for-youtube/issues/120) (по заголовку) |
| 2025-09-16 | Страница «Подписки» на десктопе переведена на превью `yt-lockup-view-model` (раньше — только главная); сломались скрытие «Notify Me» и отслеживание заменённых превью | [CPfY#125](https://github.com/insin/control-panel-for-youtube/issues/125) |
| ~2025-09-25 | Зрителю дали кнопку «Hide» для end screen (действует на одно видео); убрана подписка при наведении на водяной знак | [Techweez](https://techweez.com/2025/09/25/youtube-option-clear-end-screens/), [The Tech Portal](https://thetechportal.com/2025/09/25/youtube-brings-new-hide-button-for-users-to-dismiss-recommendation-screens-at-the-end/) (2025-09-25, по сводке поиска) |
| 2025-10-13/14 | Редизайн плеера на всех платформах: полупрозрачные скруглённые элементы, новый двойной тап для перемотки | [9to5Google](https://9to5google.com/2025/10/14/youtube-video-player-redesign-more/) (2025-10-14) |
| 2025-10 — 2025-11 | Тематическая подсветка при наведении на превью и описание; метаданные похожих видео перенесены под увеличенные превью; снова изменился бейдж «Members only» | [CPfY#133](https://github.com/insin/control-panel-for-youtube/issues/133), [#138](https://github.com/insin/control-panel-for-youtube/issues/138), [#154](https://github.com/insin/control-panel-for-youtube/issues/154), [#159](https://github.com/insin/control-panel-for-youtube/issues/159) (по заголовкам) |
| 2026-01-23 | Изменение рендеринга главной и «Подписок» | [CPfY#199](https://github.com/insin/control-panel-for-youtube/issues/199) (по заголовку) |
| 2026-02-02 — 02-06 | Тест: сильно увеличенные превью в правом сайдбаре страницы просмотра | [PiunikaWeb](https://piunikaweb.com/2026/04/13/youtube-sidebar-thumbnails-bigger-ui-test/) (2026-02-04), [The News](https://www.thenews.com.pk/latest/1391323-youtube-experiments-with-new-desktop-layout) (2026-02-06), оба по сводке поиска; [YouTubeRedux#337](https://github.com/omnidevZero/YouTubeRedux/issues/337) (по заголовку) |
| 2026-03-26/27 | Редизайн embed-плеера: play/pause в центре, громкость, субтитры и настройки — вверху справа, «More videos» под прогресс-баром, кнопка полноэкранного режима над ним | [Android Authority](https://www.androidauthority.com/youtube-embed-player-redesign-3652875/) (2026-03-27) |
| 2026-04-04 | Сломалось скрытие прошедших стримов («Streamed») — «YouTube markup change» | [CPfY#249](https://github.com/insin/control-panel-for-youtube/issues/249) |
| 2026-04-07 | Переход классов на camelCase: `.yt-spec-touch-feedback-shape__hover-effect` → `.ytSpecTouchFeedbackShapeHoverEffect`; сломались четыре функции | [CPfY#253](https://github.com/insin/control-panel-for-youtube/issues/253) |
| 2026-04-11 | Расширение видит 0 видео на главной: нужны селекторы `ytd-rich-item-renderer` для lockup | [akrentsel/yt-donotrec#2](https://github.com/akrentsel/yt-donotrec/issues/2) (по заголовку) |
| 2026-04-25 | Полосы просмотра на превью стали отрисовываться асинхронно, позже карточки | [CPfY#264](https://github.com/insin/control-panel-for-youtube/issues/264) |
| 2026-04-29 | Тест разных размеров превью в мобильной ленте Android и iOS | [Android Authority](https://www.androidauthority.com/youtube-home-feed-thumbnail-test-3662288/) (по сводке поиска) |
| 2026-05-17 | Отключение превью при наведении перестало работать | [CPfY#278](https://github.com/insin/control-panel-for-youtube/issues/278) (по заголовку) |
| 2026-07-07 | Удалён атрибут `is-slim-media`, переименован внутренний компонент Shorts | [youtube-row-fixer#100](https://github.com/sapondanaisriwan/youtube-row-fixer/issues/100) (по заголовку) |
| 2026-09-30 — 10-07 | Автоглавы ИИ | [CPfY#342](https://github.com/insin/control-panel-for-youtube/issues/342), [#344](https://github.com/insin/control-panel-for-youtube/issues/344) |
| 2026-10-07 | Тест страницы просмотра: комментарии и описание — в правой панели, рекомендации — сеткой под плеером, раздельная прокрутка, в части аккаунтов нет театрального режима | [Techdows](https://techdows.com/how-to-revert-youtube-new-layout-october-2026.html) (2026-10-08); [CPfY#343](https://github.com/insin/control-panel-for-youtube/issues/343) (исправлено в v1.37.0 2026-10-11) |
| 2026-10-09 | Лента «Подписок» на `yt-lockup-view-model`; старые `ytd-badge-supported-renderer` и `#metadata-line` не совпадают; тип видео определяется по тексту бейджа (live, upcoming, premiere) и строке «Streamed» | [remove-youtube-suggestions PR#242](https://github.com/lawrencehook/remove-youtube-suggestions/pull/242) |
| 2026-10-17 | `ytm-shorts-lockup-view-model` вложен в `ytm-shorts-lockup-view-model-v2`; **после SPA-перехода прежняя страница остаётся в DOM скрытой** (`ytd-watch-flexy[hidden]` на главной, `ytd-browse[hidden]` на просмотре); класс названия `lockup-metadata-view-model__title` → `ytLockupMetadataViewModelTitle`; у Mix бейдж с текстом «Mix» вместо длительности; канал в сайдбаре — простой текст без `<a>` | [paulgsc/some-ui#1848](https://github.com/paulgsc/some-ui/issues/1848) |
| 2026-10-20 | Полки Shorts рендерятся как `grid-shelf-view-model` / `ytm-shorts-lockup-view-model` | [aliraza944/sodium PR#5](https://github.com/aliraza944/sodium/pull/5) (по сводке поиска) |
| 2026 (дата не установлена) | Бейдж длительности: класс `ytBadgeShapeText`; «Members only» — `badge-shape.ytBadgeShapeCommerce` | [youtube-better-subscriptions PR#279](https://github.com/OsaSoft/youtube-better-subscriptions/pull/279) (по сводке поиска) |
| — | Класс текста бейджа переименовывается без предупреждения (`.badge-shape-wiz__text` / `.yt-badge-shape__text` / `ytBadgeShapeTypography`); у «12:34», «LIVE», «4K», «MEMBERS» один и тот же класс | README [merttdikmen/spoiler-shield](https://github.com/merttdikmen/spoiler-shield) (по сводке поиска) |
| — | yt-dlp читает длительность в лентах из двух мест: `thumbnailBottomOverlayViewModel` и `thumbnailOverlayBadgeViewModel` | [коммит yt-dlp 1d2f0ed](https://github.com/yt-dlp/yt-dlp/commit/1d2f0edaf978a5541cfb8f7e83fec433c65c1011), исправление #14668 (по сводке поиска) |

**Live DVR, превью при наведении, «Most replayed».** Изменений в 2025–2026 не найдено.
- DVR включает автор стрима; если он выключен, перемотка во время эфира недоступна —
  [TeamYouTube в X](https://x.com/TeamYouTube/status/1995717373043626068) (декабрь 2025, по сводке поиска).
- Окно перемотки — около 4 часов — [Itechguides](https://www.itechguides.com/youtube-live-dvr-rewind-replay-features/)
  (август 2026, по сводке поиска).
- «Most replayed» появился 2022-05-18; по наблюдению скрейпера Apify от 2026-09-14, у видео бывает от 0 до 3 меток
  ([Apify](https://apify.com/neverempty/youtube-most-replayed-scraper), [vidIQ](https://vidiq.com/blog/post/most-replayed-scenes-youtube-video/); по сводке поиска).

---

## 4. Live-эфиры и записи: чего хотят болельщики

| Запрос или проблема | Источник (дата) |
|---|---|
| Начать эфир с начала и не видеть live-точку («who's playing» уже спойлер) | r/DotA2 [y0e3oh](https://reddit.com/comments/y0e3oh) (2022-10-10); F1 TV спрашивает «с начала или к live» — r/F1TV [1d852qi](https://reddit.com/comments/1d852qi), комм. l76b2np (2024-06-05) |
| Длина записи трансляции и время до конца раскрывают овертайм, тай-брейк или «камбэка не будет» | r/youtubetv [16f4eu4](https://reddit.com/comments/16f4eu4) (2023-09-10; гольф и плей-офф, комм. 2023-09-11 и 2024-04-27), [b9cykj](https://reddit.com/comments/b9cykj) (2019-04-04); r/OverwatchLeague [y4tqao](https://reddit.com/comments/y4tqao) |
| Многочасовые записи стримов (10 ч) смотрят по частям и прячут оставшееся время | r/smitepro [suslfp](https://reddit.com/comments/suslfp) (2022-02-17) |
| Счёт и уведомления во время отложенного просмотра | r/youtubetv [z6jti1](https://reddit.com/comments/z6jti1) (2022-11-28) |
| Штатные средства YouTube TV: «Hide all scores for this team/league» (по команде или лиге, на всех устройствах); Key Plays со статистикой на момент просмотра; задержка трансляции против live-спойлеров (2024) | [BGR](https://www.bgr.com/2239547/how-to-hide-sports-scores-on-youtube-tv/), [Pocket-lint](https://www.pocket-lint.com/hide-sports-scores-roku-youtube-tv-apple-tv-espn/), [YouTube Blog](https://blog.youtube/news-and-events/more-updates-to-sports-youtube-tv/) — по сводке поиска; на обычном youtube.com аналога нет — [HideScore](https://hidescore.com/how-to-avoid-sports-spoilers) (по сводке поиска, сайт продаёт свой инструмент) |
| Embed: `controls=0` убирает полосу, время, главы и превью наведения; `disablekb=1` нужен из-за цифр 0–9 (перемотка по процентам). End screens (последние 5–20 с) и похожие видео выключить нельзя; `rel=0` даёт видео того же канала. Developer Policies §III.I.6 запрещают «block any portion or functionality of a YouTube player» | [relive-2#3](https://github.com/SilverLinings89/relive-2/issues/3) (2026-08-22; ссылается на [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), обновлены 2026-06-24) |
| Скрывать «Streamed X ago» и прошедшие стримы — такая функция есть в CPfY и Remove YouTube Suggestions и ломается при смене вёрстки | [CPfY#249](https://github.com/insin/control-panel-for-youtube/issues/249) (2026-04-04), [PR#242](https://github.com/lawrencehook/remove-youtube-suggestions/pull/242) (2026-10-09); мотив пользователей — нет данных |
| Скрытие бейджа «LIVE», длительности записи эфира отдельно от обычных видео, чат реплея | **Нет данных** из сообществ. Найден только тред о чате реплея, который не появился у автора стрима: r/youtube [uvygbn](https://www.reddit.com/r/youtube/comments/uvygbn/) (по сниппету) |

---

## Противоречия и пробелы

- **Спор о длине записи.** Одни: видеть длину VOD — «disaster for sports fans»
  ([16f4eu4](https://reddit.com/comments/16f4eu4), комм. k05ncic). Другие: «I've literally never had a sporting event spoiled by the progress bar»
  (там же, jzzhfmm). Авторы против искусственного удлинения записей: алгоритм YouTube наказывает за низкое удержание
  ([110etot](https://reddit.com/comments/110etot), j88gkuk, 236 голосов). Ещё один довод: VOD трансляции длиннее самой игры
  ([y4tqao](https://reddit.com/comments/y4tqao)) — это одновременно ослабляет спойлер и делает его предсказуемым («game ends at around 58 minutes»).
- **Источник уведомлений.** r/youtubetv [z6jti1](https://reddit.com/comments/z6jti1): автор винит YouTube TV, отвечающие —
  телевизор LG или приложение Google. Не проверено.
- **Сколько у видео меток «Most replayed»:** одна (vidIQ) или до трёх (Apify). Обе цифры — наблюдения, а не документация.
- **Reddit недоступен напрямую**, поиск по большим сабреддитам в архиве не сработал. Нет данных за 2025–2026 по r/formula1, r/soccer,
  r/nfl, r/cycling, r/peloton (там правило «no spoilers» —
  [1cfufzk](https://www.reddit.com/r/peloton/comments/1cfufzk/), по сниппету), r/chrome_extensions (кроме одного поста 2026-10-18).
  Большинство найденных тредов — 2019–2024.
- **Не найдено** обсуждений спойлеров от: подсказок поиска, заголовка вкладки, числа лайков и просмотров, глав, Shorts в спорте,
  подсказок при наведении на таймлайн, «Most replayed» именно как спойлера.
- **Не найдено** багов в нишевых антиспойлер-репозиториях про embed, m.youtube.com, YouTube Music, полноэкранный режим, клавиши 0–9 и главы.
  Возможная причина — мало пользователей и issues у этих проектов. Это гипотеза, она не проверялась.
- **Не прочитаны полностью** (только заголовки): CPfY #120, #133, #138, #154, #159, #199, #278; yt-donotrec#2; youtube-row-fixer#100;
  YouTubeRedux#337; InnerTube#58; NewPipeExtractor#1336; code-charity#2695, #2324.
- **Не открыты первоисточники:** PR#279 в youtube-better-subscriptions, PR#5 в sodium, README spoiler-shield, коммит yt-dlp,
  Apify, vidIQ, YouTube TV (BGR, Pocket-lint, YouTube Blog), Techweez — факты взяты из сводки поиска.
- **Не сделано по брифу:** поиск в форумах вне Reddit (Steam, официальные форумы лиг); точная разметка 2b вручную; выгрузка всех
  1000+ issues ImprovedTube и BlockTube по типам; проверка, повлиял ли редизайн плеера 2025-10 на `.ytp-progress-bar` и `.ytp-time-display`.

## Источники

GitHub — issues и PR (дата создания):
- [SponsorBlock#546](https://github.com/ajayyy/SponsorBlock/issues/546) 2020-11-20; [#1439](https://github.com/ajayyy/SponsorBlock/issues/1439) 2022; [#2156](https://github.com/ajayyy/SponsorBlock/issues/2156) 2024; [#1779](https://github.com/ajayyy/SponsorBlock/issues/1779) 2023
- [DeArrow#434](https://github.com/ajayyy/DeArrow/issues/434) 2025-12-11; [#353](https://github.com/ajayyy/DeArrow/issues/353) 2025-03-24; [#453](https://github.com/ajayyy/DeArrow/issues/453) 2026-03-03; [#153](https://github.com/ajayyy/DeArrow/issues/153) 2023
- [YouTube-Enhancer#1153](https://github.com/YouTube-Enhancer/extension/issues/1153) 2026-01-25; [#526](https://github.com/YouTube-Enhancer/extension/issues/526) 2024-06-17
- [code-charity/youtube #1392](https://github.com/code-charity/youtube/issues/1392) 2022-08-04; [#2638](https://github.com/code-charity/youtube/issues/2638) 2024-10-30; [#2622](https://github.com/code-charity/youtube/issues/2622) 2024-10-22; [#2695](https://github.com/code-charity/youtube/issues/2695) 2024-11-28; [#1951](https://github.com/code-charity/youtube/issues/1951) 2024-01-19; [#4147](https://github.com/code-charity/youtube/issues/4147) 2026-07-06; [#4055](https://github.com/code-charity/youtube/issues/4055) 2026-06-30; [#2324](https://github.com/code-charity/youtube/issues/2324) 2024-05-31; [#3413](https://github.com/code-charity/youtube/issues/3413) 2025-12-02
- Control Panel for YouTube: [#120](https://github.com/insin/control-panel-for-youtube/issues/120) 2025-09-09; [#125](https://github.com/insin/control-panel-for-youtube/issues/125) 2025-09-16; [#249](https://github.com/insin/control-panel-for-youtube/issues/249) 2026-04-04; [#253](https://github.com/insin/control-panel-for-youtube/issues/253) 2026-04-07; [#264](https://github.com/insin/control-panel-for-youtube/issues/264) 2026-04-25; [#278](https://github.com/insin/control-panel-for-youtube/issues/278) 2026-05-17; [#342](https://github.com/insin/control-panel-for-youtube/issues/342) 2026-09-30; [#343](https://github.com/insin/control-panel-for-youtube/issues/343) 2026-10-07
- Нишевые репозитории: [EspoilerBlocker issues](https://github.com/originalnicodr/EspoilerBlocker/issues) 2025-02 — 2025-11; [spoiler-slayer issues](https://github.com/brettp/spoiler-slayer/issues) 2018–2026; [Despoilerize issues](https://github.com/AnthonyPWatts/Despoilerize/issues) 2026-06 — 2026-10; [yt-no-spoilers issues](https://github.com/sergeio/yt-no-spoilers/issues) 2023–2026; [Andrew1175#1](https://github.com/Andrew1175/No-YouTube-Spoilers/issues/1) 2026-09-08; [NicolaiThorup#1, #2](https://github.com/NicolaiThorup/Chrome-Hide-Youtube-Progress-Bar/issues) 2024-09-03; [CGodiksen#1](https://github.com/CGodiksen/video-spoiler-blocker/issues/1) 2021-04-13; [ky-is#1](https://github.com/ky-is/twitch-vod-unspoiler/issues/1) 2020-05-09; [philipbkemp#1, #2](https://github.com/philipbkemp/spoiler-alert/issues) 2024-11-20
- [relive-2#21](https://github.com/SilverLinings89/relive-2/issues/21), [#3](https://github.com/SilverLinings89/relive-2/issues/3) 2026-08-22; [cis3296…#9](https://github.com/cis3296-F26-Applebaum-Nguyen/project-proposal/issues/9) 2026-10-21; [paulgsc/some-ui#1848](https://github.com/paulgsc/some-ui/issues/1848) 2026-10-17
- [remove-youtube-suggestions PR#242](https://github.com/lawrencehook/remove-youtube-suggestions/pull/242) 2026-10-09; [code-charity PR#4402](https://github.com/code-charity/youtube/pull/4402) (дата не проверена); [sodium PR#5](https://github.com/aliraza944/sodium/pull/5) 2026-10-20; [youtube-better-subscriptions PR#279](https://github.com/OsaSoft/youtube-better-subscriptions/pull/279) (2026); [yt-dlp 1d2f0ed](https://github.com/yt-dlp/yt-dlp/commit/1d2f0edaf978a5541cfb8f7e83fec433c65c1011)
- [akrentsel/yt-donotrec#2](https://github.com/akrentsel/yt-donotrec/issues/2) 2026-04-11; [youtube-row-fixer#100](https://github.com/sapondanaisriwan/youtube-row-fixer/issues/100) 2026-07-07; [YouTubeRedux#337](https://github.com/omnidevZero/YouTubeRedux/issues/337) 2026-02-02; [InnerTube#58](https://github.com/lighttube-org/InnerTube/issues/58) 2024-09-09; [NewPipeExtractor#1336](https://github.com/TeamNewPipe/NewPipeExtractor/issues/1336) 2025-07-15; [stripped-yt#6](https://github.com/johnjago/stripped-yt/issues/6) 2022-06-08

Reddit — id треда, дата поста; текст из архива Arctic Shift, кроме помеченных «по сниппету»:
- r/nba 1850m2e 2023-11-27; r/nfl y2z871 2022-10-13; r/F1TV uzbc5x 2022-05-28, 1388xoz 2023-05-05, 1d852qi 2024-06-04
- r/aoe2 110etot 2023-02-12; r/OverwatchLeague y4tqao 2022-10-15; r/starcraft 193m9lf 2024-01-10; r/smitepro suslfp 2022-02-17; r/smashbros bwpm4l 2019-06-04
- r/csgo 13c4i9v 2023-05-08; r/youtubetv 16f4eu4 2023-09-10, b9cykj 2019-04-04, z6jti1 2022-11-28
- r/hockey f4ohbf 2020-02-16; r/motogp 15vf2hp 2023-08-19; r/userscripts 15wn2n3 2023-08-20; r/tennis 1u4muaw 2026-06-13, 1d3g27g 2024-05-29, 13y9s5q 2023-06-02
- r/Competitiveoverwatch n7mhvq 2021-05-08; r/LeedsUnited 16qd9d0 2023-09-23; r/NoStupidQuestions 18ivi3g 2023-12-15; r/Schmoedown ivs5tt 2020-09-19
- r/mildlyinfuriating oowpns 2021-07-21; r/AEWOfficial x33ltt 2022-09-01; r/ValorantCompetitive ywr7yc 2022-11-16; r/football z2tkxg 2022-11-23
- r/youtube 8ej3ja 2018-04-24, 1af45rd 2024-01-31, 18q8u8w 2023-12-25; r/DotA2 y0e3oh 2022-10-10; r/appletv 1c1f2ys 2024-04-11; r/chrome_extensions 1x8xggm 2026-10-18
- Ссылка на любой тред: `https://reddit.com/comments/<id>`.

Новости и статьи:
- [9to5Google, редизайн плеера](https://9to5google.com/2025/10/14/youtube-video-player-redesign-more/) 2025-10-14
- [Android Authority, embed-плеер](https://www.androidauthority.com/youtube-embed-player-redesign-3652875/) 2026-03-27
- [Techdows, макет октября 2026](https://techdows.com/how-to-revert-youtube-new-layout-october-2026.html) 2026-10-08
- [PiunikaWeb](https://piunikaweb.com/2026/04/13/youtube-sidebar-thumbnails-bigger-ui-test/) 2026-02-04 / обновл. 2026-04; [The News](https://www.thenews.com.pk/latest/1391323-youtube-experiments-with-new-desktop-layout) 2026-02-06
- [Android Authority, мобильная лента](https://www.androidauthority.com/youtube-home-feed-thumbnail-test-3662288/) (2026-04-29, по сводке)
- [Techweez](https://techweez.com/2025/09/25/youtube-option-clear-end-screens/) 2025-09-25; [The Tech Portal](https://thetechportal.com/2025/09/25/youtube-brings-new-hide-button-for-users-to-dismiss-recommendation-screens-at-the-end/) 2025-09-25
- [BGR](https://www.bgr.com/2239547/how-to-hide-sports-scores-on-youtube-tv/), [Pocket-lint](https://www.pocket-lint.com/hide-sports-scores-roku-youtube-tv-apple-tv-espn/), [YouTube Blog](https://blog.youtube/news-and-events/more-updates-to-sports-youtube-tv/) — даты не проверены
- [TeamYouTube в X](https://x.com/TeamYouTube/status/1995717373043626068) 2025-12; [Itechguides DVR](https://www.itechguides.com/youtube-live-dvr-rewind-replay-features/) 2026-08
- [Apify Most Replayed](https://apify.com/neverempty/youtube-most-replayed-scraper) 2026-09-14; [vidIQ](https://vidiq.com/blog/post/most-replayed-scenes-youtube-video/); [Alan Dove](https://alandove.substack.com/p/f1-youtube-stats-suggest-all-isnt) 2025-08
- [HideScore](https://hidescore.com/how-to-avoid-sports-spoilers) — дата не указана

Greasy Fork, API 2026-11-05: скрипты по запросу «youtube spoiler» — не больше 31 установки
([427427](https://greasyfork.org/scripts/427427-youtube-video-anti-spoiler) 31, [507579](https://greasyfork.org/scripts/507579-hide-youtube-mobile-top-comment) 28, [480298](https://greasyfork.org/scripts/480298-youtube-anti-spoiler) 22).
