// Variations of the owner's favourite tile (round-2 tile 2: big logo + "Hide the video length"). Writes tiles4/*.html.
import fs from 'fs';
const OUT = 'C:/Users/vtshk/AppData/Local/Temp/yas-store/redesign2/tiles4';
fs.mkdirSync(OUT, { recursive: true });
const GEN = 'file:///C:/Users/vtshk/AppData/Local/Temp/yas-store/gen/img/';
const LOGO = `<svg viewBox="0 0 149 81"><clipPath id="c"><rect width="149" height="81" rx="30"/></clipPath><rect width="149" height="81" rx="30" fill="#c85252"/><path d="M65 21v27l25-13.5L65 21Z" fill="#fff"/><rect y="35" width="149" height="30" fill="#222" clip-path="url(#c)"/><text x="74.5" y="55" text-anchor="middle" fill="#fff" font-family="Arial" font-size="16" font-weight="900" letter-spacing=".6">ANTI-SPOILER</text></svg>`;
const BASE = `* { margin: 0; box-sizing: border-box; }
body { width: 440px; height: 280px; overflow: hidden; position: relative; font-family: Bahnschrift; color: #fff;
  background: radial-gradient(300px 220px at 50% 20%, rgba(224,72,79,.35), transparent 70%), linear-gradient(160deg, #15131a, #09090c); }
.logo svg { display: block; width: 100%; height: auto; }
h1 { font-weight: 700; font-stretch: condensed; text-transform: uppercase; line-height: 1; }
h1 em { font-style: normal; color: #ff6b70; }
.small { font: 600 15px "Segoe UI"; color: #b9b9c4; letter-spacing: .1em; text-transform: uppercase; }`;
const tile = (name, css, body) => fs.writeFileSync(`${OUT}/${name}.html`,
  `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}${css}</style></head><body>${body}</body></html>`);

// 1 — the original favourite, for comparison.
tile('tile-1', `.logo { position: absolute; left: 105px; top: 34px; width: 230px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 176px; text-align: center; font-size: 40px; }
.small { position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; }`,
`<div class="logo">${LOGO}</div><h1>Hide the <em>video length</em></h1><div class="small">for YouTube™</div>`);

// 2 — horizontal lockup: logo left, three stacked words right.
tile('tile-2', `.logo { position: absolute; left: 26px; top: 76px; width: 190px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 238px; top: 58px; font-size: 52px; line-height: .92; }
.small { position: absolute; left: 28px; bottom: 18px; }`,
`<div class="logo">${LOGO}</div><h1>Hide<br>the video<br><em>length</em></h1><div class="small">for YouTube™</div>`);

// 3 — logo over a hidden progress bar: the bar is there, its position is not.
tile('tile-3', `.logo { position: absolute; left: 115px; top: 26px; width: 210px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 160px; text-align: center; font-size: 40px; }
.bar { position: absolute; left: 40px; right: 40px; top: 222px; height: 8px; border-radius: 4px;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 14px, transparent 14px 22px); }
.small { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; }`,
`<div class="logo">${LOGO}</div><h1>Hide the <em>video length</em></h1><div class="bar"></div><div class="small">for YouTube™</div>`);

// 4 — logo on a blurred match: sport without seeing a thing.
tile('tile-4', `.bg { position: absolute; inset: -20px; background: url(${GEN}frame.png) center/cover; filter: blur(14px) brightness(.5) saturate(1.2); }
.logo { position: absolute; left: 105px; top: 34px; width: 230px; filter: drop-shadow(0 18px 34px rgba(0,0,0,.6)); }
h1 { position: absolute; left: 0; right: 0; top: 176px; text-align: center; font-size: 40px; text-shadow: 0 4px 18px rgba(0,0,0,.8); }
.small { position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; color: #e2e2ea; }`,
`<div class="bg"></div><div class="logo">${LOGO}</div><h1>Hide the <em>video length</em></h1><div class="small">for YouTube™</div>`);

// 5 — brand red canvas, dark logo band, white type.
tile('tile-5', `body { background: radial-gradient(300px 200px at 50% 0%, #e0585e, transparent 70%), #c84a50; }
.logo { position: absolute; left: 105px; top: 30px; width: 230px; filter: drop-shadow(0 16px 26px rgba(70,10,14,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 174px; text-align: center; font-size: 40px; }
h1 em { color: #1a1a1f; }
.small { position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; color: #ffe1e2; }`,
`<div class="logo">${LOGO}</div><h1>Hide the <em>video length</em></h1><div class="small">for YouTube™</div>`);

// 6 — the store name's promise: length and progress bar.
tile('tile-6', `.logo { position: absolute; left: 125px; top: 22px; width: 190px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 138px; text-align: center; font-size: 38px; line-height: 1.02; }
.small { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; }`,
`<div class="logo">${LOGO}</div><h1>Hide <em>video length</em><br>&amp; progress bar</h1><div class="small">for YouTube™</div>`);

// 7 — "No time spoilers" under the logo.
tile('tile-7', `.logo { position: absolute; left: 105px; top: 30px; width: 230px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 168px; text-align: center; font-size: 48px; }
.small { position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; }`,
`<div class="logo">${LOGO}</div><h1>No <em>time</em> spoilers</h1><div class="small">for YouTube™</div>`);
console.log('ok');

// Owner: «давай попробуем еще сделать 7 вариант где снизу добавить текст что скрывает длину, прогрессбар и тд»
// 7a — one plain line under the headline.
tile('tile-7a', `.logo { position: absolute; left: 120px; top: 22px; width: 200px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 146px; text-align: center; font-size: 48px; }
.line { position: absolute; left: 0; right: 0; top: 204px; text-align: center; font: 600 19px "Segoe UI"; color: #e2e2ea; }
.small { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; }`,
`<div class="logo">${LOGO}</div><h1>No <em>time</em> spoilers</h1><div class="line">Hides video length, progress bar &amp; more</div><div class="small">for YouTube™</div>`);

// 7b — three chips: what gets hidden.
tile('tile-7b', `.logo { position: absolute; left: 125px; top: 20px; width: 190px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 0; right: 0; top: 138px; text-align: center; font-size: 48px; }
.chips { position: absolute; left: 0; right: 0; top: 200px; display: flex; justify-content: center; gap: 8px; }
.chips span { padding: 5px 12px; border-radius: 999px; background: rgba(224,72,79,.16); border: 1px solid rgba(224,72,79,.55); font: 600 16px "Segoe UI"; }
.small { position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font-size: 13px; }`,
`<div class="logo">${LOGO}</div><h1>No <em>time</em> spoilers</h1><div class="chips"><span>Video length</span><span>Progress bar</span><span>Comments</span></div><div class="small">for YouTube™</div>`);

// 7c — logo left, headline and a short list of what is hidden on the right.
tile('tile-7c', `.logo { position: absolute; left: 24px; top: 92px; width: 170px; filter: drop-shadow(0 16px 30px rgba(224,72,79,.45)); }
h1 { position: absolute; left: 214px; top: 34px; font-size: 46px; line-height: .94; }
ul { position: absolute; left: 214px; top: 150px; list-style: none; font: 600 18px "Segoe UI"; line-height: 1.5; }
li::before { content: "✓ "; color: #ff6b70; font-weight: 700; }
.small { position: absolute; left: 26px; bottom: 16px; }`,
`<div class="logo">${LOGO}</div><h1>No <em>time</em><br>spoilers</h1><ul><li>No video length</li><li>No progress bar</li><li>Skip ±1 / ±10 min</li></ul><div class="small">for YouTube™</div>`);
