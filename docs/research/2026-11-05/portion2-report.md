# Порция 2: отчёт исполнителя (ПРОМЕЖУТОЧНЫЙ, сдан на пороге контекста 250k)

План: `docs/superpowers/plans/2026-11-05-live-guard-hardening.md` (R1–R11 приоритетнее B2–B19).
Остановился по правилу брифа («контекст подходит к 250k — сдай сделанное и остаток»). Git не трогал.

## Итог `npm test`

| Момент | Ожидание | Факт |
|---|---|---|
| До порции 2 | 100/100 | 104/104 (тесты порции 1 и popup уже были в дереве) |
| После моста (B5/B9/R8) | всё зелёное | 112/112 |
| После контроллера (сейчас) | всё зелёное | **112 тестов: 101 pass, 11 fail** |

Все 11 падений — старые тесты, которые закрепляют поведение, отменённое планом. Новые тесты на контроллер ещё не написаны.

| Падающий тест (`tests/content.test.js`) | Почему падает | Что сделать |
|---|---|---|
| does not show for regular videos with transient infinite duration (~549) | R2: через 10 с без статуса — оверлей «Couldn't tell…» | шаг до таймаута: `now = LIVE_START_TIMEOUT_MS - LIVE_START_POLL_MS` |
| does not show for regular videos with false live metadata (~598) | то же (meta без videoId = статус неизвестен) | то же |
| ignores player live control templates on regular videos (~651) | то же | то же |
| ignores watch live attributes without matching live metadata (~704) | то же | то же |
| ignores stale true live metadata for another video (~757) | то же | то же |
| ignores a stale player live class after regular duration is known (~967) | то же | то же |
| shows for the active YouTube player live class (~845) | R3: слабый признак — только щит на `LIVE_START_NOT_LIVE_GRACE_MS`, оверлей после | `now`/таймеры в options; до grace — щит без оверлея, после — оверлей; + случай с `endDate` → guard нет |
| shows when YouTube exposes the live chat frame (~880) | то же | то же; + случай с мостом `isLive:false` → guard нет |
| keeps a live stream paused until the user chooses an action (~496) | R6: перехват теперь на `document` (capture), не на `video` | диспетчить `{type:"play", target: video}` через `doc.dispatchEvent`; у фейкового player добавить `contains(node)` |
| start from beginning performs one user-triggered seek and resumes (~1687) | R1: снятие защиты только после `seeked` + кадра | дать video `addEventListener/removeEventListener`, `seeking`, `requestVideoFrameCallback`; клик → защита держится; `seeked` → держится; вызвать rVFC-колбэк → снято |
| start from beginning fails open when DVR is unavailable (~1753) | B2.4: тест закрепляет ошибку | заменить тестами R7 (см. ниже) |

## Пункты плана

| Пункт | Статус | Чем проверено |
|---|---|---|
| B5 + R8 (мост: true/false/null) | сделано | `tests/live-player-bridge.test.js`: «reports an unknown live state while no source names a video», «keeps a bare videoData isLive:false as unknown», «reports a regular video as not live from isLiveContent:false», «lets a live-now marker win over a not-live marker of the same video», старый «reports a finished-stream VOD as not live» |
| B9 + R8 (только источники с тем же ID; порядок ID) | сделано | «ignores a stale initial player response for another video», «ignores player response markers for another video», «ignores a player response that names no video», «takes the video id from the player response when videoData has none» |
| R8 приёмник (`parseLiveStateResult` принимает null; снимок сбрасывается при чужом ID) | код сделан | тестов нет |
| R2 (10 с без статуса → оверлей «Couldn't tell…», кнопки Start/Play) | код сделан | тестов нет (6 старых тестов падают именно из-за R2) |
| R3/B8 (оверлей сам не исчезает; слабые признаки → щит на grace; явный «не эфир» побеждает слабые) | код сделан | тестов нет; старые ~845/~880 падают из-за R3 |
| R4/B3/B6 (отмена только по: выкл., другой ID по URL / по мосту вне watch, нет `#movie_player`, мост молчит 3 с; решения сбрасываются при другом ID; мини-плеер; компакт < 480 px) | код сделан | тестов нет |
| R5/B4 (реклама: блюр+mute, без паузы, снять свою паузу и `play`; подпись вместо панели, click-through; клик во время рекламы не выбор) | код сделан | тестов нет |
| R6/B7 (capture-слушатели `play/playing/loadeddata` на document, только внутри `#movie_player`) | код сделан | тестов нет; ~496 падает |
| R1/B2 (seeked → !seeking и ±5 с → кадр rVFC/rAF → снять; таймаут 3 с → «Couldn't jump to the beginning.»; отмена при смене видео/рекламе/выкл./новом нажатии) | код сделан | тестов нет; ~1687 падает |
| R7/B2.3 (DVR «проверяется» ≠ «нет»; «can't be rewound» только при readyState ≥ 1 и > 3 с; обновление без пересоздания) | код сделан | тестов нет; ~1753 падает |
| B10 (fullscreen: монтаж внутрь `fullscreenElement`, позиция от его угла; обратно на body) | код сделан | тестов нет |
| R9/B12 (`/@x/live`, `/channel/<id>/live`, `/c/<x>/live`, `/user/<x>/live` → `ytd-watch-flexy:not([hidden])[video-id]`, запасной canonical) | код сделан в `getLiveStartVideoId(win, doc)` | тестов нет; чат-гард ещё не передаёт `doc` (см. B14) |
| R10/B14 (чат: медленная проверка 1 с, ремонтаж; снятие по `isKnownNotLive`) | **не сделано** | — |
| B16 (блюр `.ytp-cued-thumbnail-overlay-image`) | **не сделано** | — |
| B19 | не делать (по плану «если просто»): изолированный мир не видит объектный `event.detail` из MAIN (C14) | — |

## Изменённые файлы

- `src/content/live-player-bridge.js` — `getLiveState`, новые `getPlayerResponseNotLiveSignal`, `getPlayerApiResponse` (старый `getPlayerResponse` с фолбэком на `ytInitialPlayerResponse` убран).
- `src/content/live-start-controller.js` — константы, `getChannelLiveVideoId`, `getLiveStartVideoId(win, doc)`, `getLiveStartTarget(..., doc)`, `hasStrongLiveSignal` / `hasExplicitNotLiveSignal` / `hasWeakLiveSignal` / `isAdShowing` (убран `isClearlyNotLivePlayback`), контроллер целиком (`holdGuard`, `holdGuardDuringAd`, `renderAdNote`, `updateLiveGuardOverlay`, `getRewindState`, `startFromBeginning` с подтверждением, `bindPlaybackLock`, `playerLeftGuardedVideo`, `runTick`, `sync`, метод `isKnownNotLive`).
- `tests/live-player-bridge.test.js` — +8 тестов.
- `src/content/content.js`, `tests/content.test.js` — порцией 2 не тронуты.

## Остаток работы (для следующей сессии, по порядку)

1. Экспорт из `live-start-controller.js` (в объекте `return` модуля) для тестов: `LIVE_GUARD_AD_NOTE_ID`, `LIVE_START_SEEK_CONFIRM_TIMEOUT_MS`, `LIVE_GUARD_NO_REWIND_MS`, `LIVE_GUARD_PLAYER_GONE_MS` (тесты берут их из `globalThis.YouTubeAntiSpoiler`, `content.js` не трогать).
2. Починить 11 старых тестов по таблице выше.
3. Новые тесты контроллера (R11): R2 (>10 с без сигнала → «Couldn't tell…», Start+Play, пауза; Play → снято, attempted); R3 (оверлей показан → пришёл `endDate`/мост `false` → оверлей, пауза, блюр остаются, `play` не вызван); R1 («currentTime у цели, но seeking=true / кадра нет → защита держится»; «seeked после смены видео → игнор, guard нового видео не снят»; выключение защиты во время ожидания; таймаут 3 с → строка и кнопки доступны, attempted пуст); R7 (empty → nonempty: кнопка неактивна + «Checking…» → активна; readyState 1 и 3 с без DVR → кнопка скрыта + «This stream can't be rewound…»); R5 (реклама → live: без паузы, подпись, `pointerEvents: "none"`; поздний `ad-showing`: оверлей → подпись, `play` один раз, клик по старой кнопке ничего не помечает; конец рекламы → пауза + кнопки); R6 (новый `<video>` внутри плеера → пауза+mute; превью вне плеера не трогается; в фазе щита — только mute; после выбора слушатели сняты); R4/B3/B6 (мини-плеер: уход → защита и оверлей остаются, ширина < 480 → `copy.hidden`; закрытие плеера / чужой ID от моста / мост молчит 3 с → cancel; временное отсутствие `<video>` → не cancel; решение держится при возврате на то же видео, сбрасывается после другого видео); B10 (fullscreen до и после guard; выход — обратно на body; fullscreen-элемент в тесте добавить в `body`, иначе фейковый `getElementById` его не видит); R9 (`getLiveStartVideoId` для 4 видов путей + canonical; guard на `/@x/live`).
4. `content.js`, R10/B14: `const CHAT_GUARD_SLOW_CHECK_MS = 1000`; `getChatGuardVideoId(doc)` → `shared.getLiveStartVideoId(root, doc)`; в `syncChatGuard` условие снятия `|| liveStartController.isKnownNotLive(videoId)`; после рендера всегда ставить таймер: 100 мс пока `!mounted && retriesLeft > 0`, иначе 1000 мс; обновить комментарий у `CHAT_GUARD_MAX_RETRIES`. Тест «stops retrying when no chat frame ever appears» заменить: быстрые повторы ≤ бюджета, затем таймер 1000 мс, поздний чат монтируется, пересозданный чат получает оверлей снова; тест B14.2 через `refreshProtection` с мостом `isLive:false`. **Обязательно** `test.after(...)` в конце `tests/content.test.js`, выключающий чат-гард (`applySettings({startLiveFromBeginning:false}, …)`): иначе медленная проверка держит процесс `node --test` живым бесконечно.
5. `content.js`, B16: в правило блюра под `html.${LIVE_START_OBSCURED_CLASS}` добавить `#movie_player .ytp-cued-thumbnail-overlay-image`; тест на наличие селектора.
6. Финальный `npm test`, заполнить этот отчёт именами тестов.

## Допущения (план молчал)

- R4 «другой videoId по ответу моста» применяется только вне страницы просмотра. На странице просмотра источник истины — URL: при SPA-переходе плеер ещё секунду держит старое видео, и отмена по мосту снимала бы guard нового видео.
- B3: при переходе к другому видео сбрасывается и `shieldAttemptedVideoIds` (не только решения пользователя), чтобы при возврате на эфир снова был ранний щит.
- R6 в фазе раннего щита только глушит звук, не ставит паузу: щит по R3 = блюр + mute; пауза — только после решения показать guard.
- Guard «залипает» с момента решения показать его (пауза), а не с момента монтажа оверлея — иначе при неготовых границах плеера пропажа сигнала снимала бы блюр с поставленного на паузу кадра.
- Режим «Couldn't tell…» фиксируется при показе; если статус позже стал известен, кнопка остаётся «Play».
- Зона «окно перемотки нулевое» = `seekable.end <= seekable.start`; порога «несколько секунд» в плане нет — не вводил.
- После таймаута без `<video>` контроллер продолжает опрос раз в 1 с (раньше — отмена).
- Неактивная кнопка — `disabled` + inline `opacity: 0.5`; подпись рекламы и её позиция — inline-стили (CSS-блок в `content.js` вне списка разрешённых правок).

## Открытые вопросы

- B14.2 и R3: если эфир закончился при показанном оверлее, мост вернёт `isLive:false` и чат-гард снимется (по B14.2), хотя live-оверлей остаётся (по R3). Чат законченного эфира может раскрыть итог. Оставить так или не снимать чат, пока live-guard показан?
- Решение пользователя переживает закрытие мини-плеера: после выбора guard не активен, закрытие плеера без навигации не видно; повторное открытие того же видео — без guard (R4 сбрасывает только при другом ID).

## Что проверить живьём (unit-тесты не моделируют)

- Срабатывает ли `requestVideoFrameCallback`, зарегистрированный после `seeked` на поставленном на паузу видео. Если нет — «Start from beginning» всегда будет кончаться «Couldn't jump to the beginning.»
- Реальные классы `ad-showing` / `ad-interrupting`, кликабельность «Skip ad» под подписью, что после рекламы приходит `play/playing/loadeddata` и пауза ставится сразу.
- Fullscreen: какой элемент YouTube делает `fullscreenElement`, видимость оверлея внутри него (если это `#movie_player` — не уйдёт ли под слои плеера).
- Мини-плеер: `#movie_player` переезжает в `ytd-miniplayer`, ширина < 480 → компактный оверлей, кнопки помещаются.
- `/@x/live` и др.: не перенаправляет ли YouTube на `/watch?v=`; есть ли `video-id` у `ytd-watch-flexy`.
- Эфир без DVR: `seekable.length` и `readyState` на живом потоке; поведение при окне в несколько секунд.
- Регулярное видео при сломанном мосте: через 10 с появится «Couldn't tell…» (цена R2).

## Завершение (второй исполнитель, 2026-11-05)

Итог `npm test`: ожидание 0 fail → факт **140 тестов, 140 pass, 0 fail**, exit 0, 1,6 с (было 112 / 101 / 11, ~11 с). Процесс завершается сам благодаря `test.after`.

### Код

| Пункт | Статус | Где |
|---|---|---|
| R1, решение главной сессии: rVFC молчит 500 мс после `seeked` → подтверждение по `seeked` + `!seeking` + позиция у цели | сделано (раньше не было: без rVFC-колбэка перемотка на паузе всегда кончалась таймаутом 3 с) | `live-start-controller.js`: `LIVE_START_SEEK_FRAME_FALLBACK_MS = 500`, `seek.frameTimer`, `confirmSeek` перепроверяет позицию; таймер гасится в `cancelPendingSeek`; `waitForNextFrame` встроен в `handleSeeked` |
| R10/B14.1 чат: после быстрых повторов проверка раз в 1 с, в т.ч. после монтажа | сделано | `content.js`: `CHAT_GUARD_SLOW_CHECK_MS`, хвост `syncChatGuard` |
| B14.2 снятие по `isKnownNotLive` + решение главной сессии «пока guard ждёт выбора — чат не снимать» | сделано | `content.js` `knownNotLive`; новый метод контроллера `isWaitingForChoice(videoId)` (= `activeGuard.engaged` для этого ID, включая показ подписи рекламы) |
| R9 для чата | сделано | `getChatGuardVideoId(doc)` → `getLiveStartVideoId(root, doc)` |
| B16 | сделано | `buildSpoilerCss`: `html.yas-live-start-obscured #movie_player .ytp-cued-thumbnail-overlay-image` в правиле блюра `<video>` |
| Экспорт констант для тестов | сделано | `return` модуля контроллера (+6 имён); `content.js` их не реэкспортирует, тесты берут `require("../src/content/live-start-controller.js")` |

### 11 бывших падений → новое поведение (ни один не удалён молча)

| Тест (новое имя, если менялось) | Что проверяет теперь |
|---|---|
| keeps a live stream paused until the user chooses an action | R6: `play` через `doc.dispatchEvent` (capture на document) → пауза; после «Continue live» перехвата нет |
| does not take a transient infinite duration alone for a live stream (было «does not show for regular videos with transient infinite duration»); ignores player live control templates on regular videos; ignores watch live attributes without matching live metadata; ignores stale true live metadata for another video; ignores a stale player live class after regular duration is known | до `TIMEOUT − POLL` без паузы и оверлея; на таймауте R2 «Couldn't tell…», кнопки Start + Play, без «Continue live» (`assertAsksAboutUnknownStatus`). В первом в фикстуру добавлен player (без него оверлею негде встать) |
| does not show for regular videos with false live metadata | фикстура: `metadataVideoId` = ID страницы (по R8 признак без ID не учитывается). Явный «не эфир» → ни паузы, ни оверлея, щита нет, attempted пуст до и после таймаута |
| shows for the active YouTube player live class; shows when YouTube exposes the live chat frame | R3: до grace только щит (блюр + mute), после grace пауза и оверлей |
| start from beginning performs one user-triggered seek and resumes | R1: после клика и после `seeked` защита держится; снимается только после rVFC-колбэка |
| start from beginning fails open when DVR is unavailable | заменён двумя тестами R7 (ниже) |

### Новые тесты (+28; матрица R11 и пункты)

| Клетка / пункт | Тест(ы) в `tests/content.test.js` («live guard …», если не сказано иное) |
|---|---|
| R3 до показа: явный «не эфир» побеждает слабый признак | does not show for a live player class when the video has an end date; drops the shield when the bridge says a chat-frame video is not live |
| R1 seeking=true / кадра нет → держится | start from beginning holds while the video is still seeking |
| R1 решение 500 мс | confirms a jump on a paused video that draws no new frame |
| R1 путь rAF | falls back to one animation frame when the video has no frame callback |
| R1 таймаут 3 с, «Couldn't jump…», кнопки снова доступны, повтор = новый requestId | keeps protection and offers both buttons again when the jump fails |
| R1 поздний seeked/кадр после смены видео | ignores a late seek confirmation after the player moved to another video |
| R1 выключение защиты во время ожидания | drops a pending jump when protection is switched off |
| R1 реклама во время ожидания | swaps the overlay for the ad note when an ad starts later (seeked-слушатель снят) |
| R2 | asks with Start from beginning and Play when the status stays unknown |
| R3 оверлей не исчезает | keeps a shown overlay when the stream ends before the user chooses |
| R4 мини-плеер, компакт < 480 px, возврат | follows the mini-player and comes back with the buttons on return |
| R4 закрытие / другой ID от моста / мост молчит 3 с | ends when the mini-player is closed; ends when the player shows another video off the watch page; ends when the bridge stops naming the video for three seconds |
| R4 временное отсутствие `<video>` | survives YouTube re-creating the <video> element |
| R4/B3 решения | remembers a choice on the same video and asks again after another video |
| R5 реклама → эфир; поздний `ad-showing`/`ad-interrupting` | lets a pre-roll ad play under blur and mute, then asks; swaps the overlay for the ad note when an ad starts later |
| R6 | only intercepts playback inside the guarded player; only mutes new playback while the shield waits for the live status |
| R7 empty → nonempty; нет DVR | keeps start from beginning disabled while the DVR window is still loading; says a stream can't be rewound only after metadata and a wait without DVR |
| B10 | mounts the overlay inside the fullscreen element; moves the overlay into fullscreen and back out |
| R9 | getLiveStartVideoId reads the stream id on channel live pages; protects a stream opened from a channel's /live page |
| R10 | chat spoiler guard keeps checking once a second after the quick retries (заменил «stops retrying when no chat frame ever appears») |
| B14.2 | chat spoiler guard lifts when the page-world player says the video is not live |
| решение «чат не снимать, пока guard ждёт» | chat spoiler guard stays while the live guard waits for a choice, even if the stream ends |
| B16 | buildSpoilerCss blurs the player's cued thumbnail during the live guard |

Тестовая инфраструктура: фейковый `appendChild` теперь переносит узел (как DOM); `createLiveDocument` — подменяемый `doc.video`, `player.contains`, опция `watchFlexyVideoId`; хелперы `createFakeClock`, `createLiveVideo`, `createGuardWindow`, `answerLiveStateRequests`, `captureGlobalTimers`, `switchChatGuardOff`; в конце файла `test.after(switchChatGuardOff)`.
Попутно: старые тесты брали `content.LIVE_START_NOT_LIVE_GRACE_MS`, которого нет в экспорте `content.js` (было `undefined`, шаг по времени не происходил), — переведены на `liveStart.*` и проходят с настоящим значением.

### Изменённые файлы (этой сессией)
- `src/content/live-start-controller.js` — R1-фолбэк 500 мс, `isWaitingForChoice`, экспорт констант.
- `src/content/content.js` — только чат-гард (R10/B14, R9) и CSS B16.
- `tests/content.test.js` — правка 11 тестов, +28 тестов, хелперы, `test.after`.

### Не сделано
- Живая проверка в браузере — по R11 за главной сессией.
- B19 — не делался (причина выше).
- Отдельного теста «новое нажатие отменяет прежнюю перемотку» нет: покрыто косвенно (повторный клик после неудачи даёт `requestId` 2 и скрывает строку ошибки).

### Допущения
- «Guard ждёт выбора» для чата = `activeGuard.engaged` (с момента решения показать guard, включая подпись рекламы), а не только факт монтажа оверлея.
- Фолбэк 500 мс перепроверяет `!seeking` и позицию в момент срабатывания: если плеер успел отскочить к live-краю, подтверждения нет (дальше таймаут 3 с).
- После выбора пользователя чат законченного эфира снимается по «не эфир», как требует B14.2.

### Что проверить живьём (дополнение)
- Срабатывает ли rVFC на паузе после `seeked`; если нет, снятие идёт через фолбэк 500 мс: на кадре должно быть уже начало эфира, а не live-момент.
- Чат: поздний чат и пересоздание фрейма (переключение Top chat / Live chat, театр) — оверлей возвращается за ≤ 1 с; на главной и других не-watch страницах таймер не крутится.
- Конец эфира при показанном оверлее: чат остаётся закрытым до выбора.
- Обложка `.ytp-cued-thumbnail-overlay-image` под блюром до старта эфира.

## R12–R13 (третий исполнитель, 2026-11-05)

Итог `npm test`: ожидание 0 fail → факт **158 тестов, 158 pass, 0 fail**, exit 0, ~1,7 с (было 145/145).
Каждая правка дополнительно проверена мутацией (копия `src`+`tests` во временной папке, правки по одной): все 15 мутаций
(I1×2, I2, I3, I4×2, I5, R12.1×2, R12.2, R12.3×2, R12.4, Q1, Q2) роняют хотя бы один тест.

### Пункты

| Пункт | Статус | Код | Тест(ы) (`tests/content.test.js`, если не сказано иное) |
|---|---|---|---|
| R12.1 фаза загрузки: пока окно перемотки неизвестно, видео играет; известно — пауза и кнопки; перехват R6 в этой фазе не ставит паузу | сделано | `holdGuard`: `activeGuard.loading = getRewindState(video) === "checking"` → `releaseGuardPause` / `pauseForGuard`; `handleProtectedPlayback` не ставит паузу при `"checking"`; опрос 100 мс, пока идёт загрузка | live guard lets a stream load muted and hidden until its rewind window is known |
| R12.2 под классом live-защиты `opacity: 0` вместо блюра | сделано | `content.js` `buildSpoilerCss`: `#movie_player video`, `ytd-player video`, `.ytp-cued-thumbnail-overlay-image` (+ субтитры, см. «Допущения») | buildSpoilerCss hides live video pixels while the live guard is active (было «blurs live video pixels…»: закреплял блюр и запрещал `opacity: 0`); buildSpoilerCss hides the player's cued thumbnail during the live guard (было «blurs…») |
| R12.3 звук держится: `volumechange` в захвате, исходное состояние не перезаписывается | сделано | `PROTECTED_PLAYBACK_EVENTS` + `volumechange`; `muteForShield` запоминает исходное состояние один раз на элемент и глушит заново при каждом вызове (и на heartbeat) | live guard mutes again when YouTube unmutes the video under it |
| R12.4 за `LIVE_START_TIMEOUT_MS` загрузки окна нет → «can't be rewound» | сделано | `getRewindState`: «unavailable» через 10 с без окна (вместо 3 с после `readyState ≥ 1`); `LIVE_GUARD_NO_REWIND_MS` удалён вместе с экспортом | live guard says a stream can't be rewound when no rewind window loads in time (было «…only after metadata and a wait without DVR», R7) |
| R12.5 тесты | сделано | — | две строки выше + live guard starts a stream it paused once the rewind window is unknown again (дословный сценарий плана «guard на паузе с пустым seekable запускает видео без звука и невидимым; появился seekable — пауза и активная кнопка») |
| I1 смена `<video>` отменяет ожидающую перемотку; перед подтверждением — то же ли видео | сделано | `confirmSeek`: `findVideoElement(doc) !== video` → `failPendingSeek`; `holdGuard`: `pendingSeek.video !== video` → `failPendingSeek` | live guard drops a pending jump when YouTube replaces the <video> (сценарий плана: Start → seeked старого → подмена → rVFC/500 мс старого → guard держится, новое не запущено); live guard cancels a pending jump at the heartbeat after the <video> is replaced |
| I2 реклама перед подтверждением → рекламная фаза, выбор не записан | сделано | `confirmSeek`: `choiceBlockedByAd(doc)` до проверки позиции | live guard does not confirm a jump once an ad has started (класс рекламы после seeked, колбэк кадра до heartbeat) |
| I3 чат снят по «не эфир», затем guard того же видео ждёт выбора → чат снова закрыт | сделано | `content.js` `syncChatGuard`: при `knownNotLive` чат снимается, но проверка раз в 1 с продолжается | chat spoiler guard covers the chat again when a not-live video turns out to be live (false → true для одного ID) |
| I4 пока guard активен — `<video>` только внутри `#movie_player`, иначе `null` | сделано | `findVideoElement`: убраны `ytd-player video` и глобальный `video` (одна функция для heartbeat, кнопок, перехвата); мост: запасной путь pause/play — `#movie_player video` | live guard waits for the player instead of pausing a <video> outside it (было «waits for player bounds when the player host is unavailable»: ставил на паузу `<video>` без плеера); live guard leaves a <video> outside the player alone while the player's own is missing; `tests/live-player-bridge.test.js`: live player bridge falls back only to the player's own <video> |
| I5 мост: `liveStreamability` не признак «идёт сейчас» | сделано | `getPlayerResponseLiveSignal` | `tests/live-player-bridge.test.js`: live player bridge does not take liveStreamability for a live-now marker (`isLiveNow:false` → `false`); live player bridge reports liveStreamability alone as unknown (→ `null`) |
| Q1 вне страницы просмотра видео остановлено/отсутствует → решения сброшены | сделано | `sync`, ветка без videoId: нет активного guard и `<video>` плеера нет или `paused` → `lastPlayerVideoId = null`, `attemptedVideoIds.clear()` | live guard asks again once the mini-player is stopped or closed (оба случая; пока играет — решение держится) |
| Q2 возобновлять только то, что остановили мы | сделано | `pauseForGuard` ставит `pausedByGuard`, если видео играло; `releaseGuardPause` (реклама, фаза загрузки) запускает только при `pausedByGuard` | live guard resumes only playback it paused itself (реклама и фаза загрузки у видео на паузе пользователя — `play` 0) |

Старые тесты, переписанные под новое поведение (не удалены): 4 — в таблице («было …»). Попутно в «chat spoiler guard
leaves replay chat visible on finished-stream VODs» добавлено выключение чат-гарда в `finally`: проверка раз в 1 с теперь
идёт и на записи эфира (I3). Инфраструктура тестов: фейковый документ отвечает на `#movie_player video` только `<video>`
внутри плеера; `createLiveVideo` ведёт `paused`.

### Изменённые файлы (этой сессией)
- `src/content/live-start-controller.js` — `findVideoElement`, `muteForShield`, `pauseForGuard`/`releaseGuardPause`, `handleProtectedPlayback` (+`volumechange`), `failPendingSeek`, `confirmSeek`, `getRewindState`, `holdGuardDuringAd`, `holdGuard`, `runTick` (частота опроса), `sync` (Q1), поля `loading`/`pausedByGuard`; удалён `LIVE_GUARD_NO_REWIND_MS`.
- `src/content/live-player-bridge.js` — `getPlayerResponseLiveSignal` (I5), запасной `<video>` в `pausePlayer`/`playMediaElement` (I4).
- `src/content/content.js` — CSS live-защиты (R12.2), `syncChatGuard` (I3).
- `tests/content.test.js` — 4 переписаны, +10 новых, хелпер `countEvents`.
- `tests/live-player-bridge.test.js` — +3.

### Допущения (план молчал)
- **Q2 + R12.1.** «Запускать только при `pausedByGuard`» применено и к фазе загрузки: guard сам вызывает `play` только для видео, которое сам остановил. Ещё не стартовавший эфир (как в живой проверке) запускает автозапуск YouTube — guard его больше не останавливает и не шлёт паузу в MAIN world. «При выходе из фазы загрузки» в Q2 прочитано как «при переходе остановленного видео в фазу загрузки».
- **R12.4.** Отсчёт 10 с — от первой проверки окна с `<video>` в плеере, без условия `readyState ≥ 1`; сбрасывается, когда окно есть, на время рекламы и пока `<video>` нет. Порог 3 с из R7 больше не используется.
- **I1.** Перемотка, отменённая из-за смены `<video>`, показывает «Couldn't jump to the beginning.» и снова доступные кнопки (как таймаут R1), а не молча возвращает оверлей. Отсутствие `<video>` на heartbeat тоже отменяет перемотку.
- **I4.** То же правило применено к запасному пути моста (pause/play без API плеера) — это тот же путь удержания guard.
- **R12.2, сверх буквы плана.** В правило `opacity: 0` добавлены субтитры `#movie_player .ytp-caption-window-container`: в фазе загрузки эфир играет, и автосубтитры показали бы комментарий текстом сквозь оверлей (фон `rgba(…, 0.82)`). Если лишнее — убрать одну строку селектора и одну проверку в тесте.
- **I3.** Чат-гард на любой странице просмотра с «не эфир» продолжает проверку раз в 1 с (раньше — ни одной).
- **Q1.** Сброс — при следующем `sync` вне страницы просмотра (навигация, в т.ч. `yt-navigate-start` перед повторным открытием эфира); само закрытие мини-плеера `sync` не вызывает.

### Не сделано
- Живая проверка в браузере — за главной сессией.
- Из R12.1–R12.5, I1–I5, Q1, Q2 ничего не пропущено.

### Что проверить живьём
- Эфир, guard до старта воспроизведения: стартует ли автозапуск YouTube сам (`video.paused=false`, растёт `readyState`), заполняется ли `seekable` за ≤ 10 с, затем пауза и активная «Start from beginning». Если YouTube сам не стартует (пауза не наша) — через 10 с будет «can't be rewound»; тогда нужно решение, запускать ли guard'у видео самому (Q2 сейчас запрещает).
- В фазе загрузки: тишина (в т.ч. после того как YouTube вернёт звук — `volumechange`), чёрный кадр, субтитры скрыты, сквозь оверлей ничего не читается; кнопка «Checking…» неактивна.
- «Start from beginning» после фазы загрузки: подтверждение по `seeked` + кадр/500 мс, видео играет с начала DVR.
- Реклама перед эфиром и во время фазы загрузки: реклама играет, после неё — снова загрузка, затем пауза.
- Мини-плеер: решение держится, пока эфир играет в мини-плеере; пауза или закрытие мини-плеера → при повторном открытии guard спрашивает снова.
- Обычное видео при сломанном мосте: на 10-й секунде «Couldn't tell…»; под щитом теперь чёрный кадр вместо блюра.
