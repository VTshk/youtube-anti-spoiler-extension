// Store set in the owner's chosen style ("Broadcast", round-2 V1): screenshots s1..s5 and the small tile.
// Round 4: every slide has its own picture; fixes from the Astra/Argon review. Render: node render.mjs final
import fs from 'fs';
const OUT = 'C:/Users/vtshk/AppData/Local/Temp/yas-store/redesign2/final';
fs.mkdirSync(OUT, { recursive: true });
const CAP = 'file:///C:/Users/vtshk/AppData/Local/Temp/yas-store/redesign2/captures2/';
const GEN = 'file:///C:/Users/vtshk/AppData/Local/Temp/yas-store/gen/img/';

// A crop of a capture: region in CSS px of the 1280-wide page (popup: 352 wide), drawn at `scale`.
function crop(name, x, y, w, h, scale, cls = '', style = '') {
  const full = name.startsWith('popup') ? 352 : 1280;
  return `<div class="crop ${cls}" style="width:${w * scale}px;height:${h * scale}px;${style}">` +
    `<img src="${CAP}${name}.png" style="width:${full * scale}px;left:${-x * scale}px;top:${-y * scale}px"></div>`;
}
const LOGO = `<svg viewBox="0 0 149 81"><clipPath id="c"><rect width="149" height="81" rx="30"/></clipPath><rect width="149" height="81" rx="30" fill="#c85252"/><path d="M65 21v27l25-13.5L65 21Z" fill="#fff"/><rect y="35" width="149" height="30" fill="#222" clip-path="url(#c)"/><text x="74.5" y="55" text-anchor="middle" fill="#fff" font-family="Arial" font-size="16" font-weight="900" letter-spacing=".6">ANTI-SPOILER</text></svg>`;
const CSS = `
:root { --red: #e0484f; --ink: #f5f5f7; --muted: #b9b9c4; }
* { box-sizing: border-box; margin: 0; }
body { width: 1280px; height: 800px; overflow: hidden; position: relative; color: var(--ink);
  font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
  background: radial-gradient(900px 520px at 18% 8%, rgba(224,72,79,.30), transparent 60%),
    radial-gradient(700px 500px at 95% 100%, rgba(80,90,160,.22), transparent 60%), linear-gradient(160deg, #15131a 0%, #0a0a0e 70%); }
.lines { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px); background-size: 100% 6px; }
.crop { position: absolute; overflow: hidden; } .crop img { position: absolute; }
.brand { position: absolute; left: 56px; top: 44px; display: flex; align-items: center; gap: 14px; font: 600 15px "Segoe UI"; letter-spacing: .14em; color: var(--muted); text-transform: uppercase; }
.brand svg { width: 70px; height: 38px; }
h1 { position: absolute; left: 56px; top: 96px; font: 700 66px/0.98 Bahnschrift; font-stretch: condensed; text-transform: uppercase; letter-spacing: .01em; }
h1 em { font-style: normal; color: var(--red); }
.beta { display: inline-block; vertical-align: 14px; margin-left: 14px; padding: 4px 12px; border-radius: 8px; font: 700 20px Bahnschrift; letter-spacing: .1em; color: #ffd6d8; background: rgba(224,72,79,.25); border: 1px solid rgba(224,72,79,.6); }
.sub { position: absolute; left: 58px; top: 238px; font-size: 22px; color: var(--muted); }
.tag { position: absolute; display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-radius: 999px; font: 600 17px "Segoe UI";
  background: rgba(20,20,26,.92); border: 1px solid rgba(255,255,255,.14); white-space: nowrap; box-shadow: 0 10px 30px rgba(0,0,0,.45); }
.tag b { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--red); font-size: 14px; }
.shadow { border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.08); }
.loupe { border-radius: 20px; background: #000; box-shadow: 0 24px 60px rgba(0,0,0,.7), 0 0 0 2px var(--red), 0 0 40px rgba(224,72,79,.45); }
.dash { position: absolute; border: 2px dashed var(--red); border-radius: 10px; }
.ghostbar { position: absolute; height: 0; border-top: 3px dashed var(--red); }
`;
const page = (title, sub, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="lines"></div><div class="brand">${LOGO}Anti-Spoiler for YouTube™</div><h1>${title}</h1><div class="sub">${sub}</div>${body}</body></html>`;

// 1 — Overview: the protected player, the real control bar magnified over itself, the popup.
// Loupe: capture x28..588, y490..559 at 1.4 → 784×97, laid over the player's own bar (player at 0.86).
fs.writeFileSync(`${OUT}/s1.html`, page('Watch the match.<br><em>Not the clock.</em>',
  'No video length and no progress bar, anywhere on YouTube™.', `
${crop('watch-protected', 16, 68, 873, 491, 0.86, 'shadow', 'left:56px;top:292px')}
${crop('watch-protected', 28, 490, 560, 69, 1.4, 'loupe', 'left:50px;top:618px')}
<div class="ghostbar" style="left:66px;top:629px;width:764px"></div>
<div class="tag" style="left:66px;top:564px"><b>1</b>No time, no progress bar</div>
<div class="tag" style="left:384px;top:726px"><b>2</b>Skip ±1 or ±10 minutes</div>
<div class="tag" style="left:650px;top:726px"><b>3</b>Eye: show this video</div>
<style>
.hidden-list { position: absolute; left: 872px; top: 474px; width: 352px; padding: 20px 24px; border-radius: 16px; background: rgba(20,20,26,.85); border: 1px solid rgba(255,255,255,.1); }
.hidden-list h3 { font: 700 18px Bahnschrift; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
.hidden-list div { font: 600 19px "Segoe UI"; padding: 5px 0; }
.hidden-list div::before { content: "✓"; color: var(--red); margin-right: 12px; font-weight: 700; }
</style>
${crop('popup-dark', 0, 0, 352, 140, 1, 'shadow', 'left:872px;top:292px;border-radius:16px')}
<div class="tag" style="left:906px;top:252px"><b>4</b>Protection on out of the box</div>
<div class="hidden-list"><h3>Hidden for you</h3><div>Video length</div><div>Progress bar</div><div>Duration badges in feeds</div><div>Comments and live chat</div></div>
`));

// 2 — Live: the guard panel magnified over the paused stream; the chat covered, with its close button.
// Guard card in the capture: x245..660, y223..405. Shown at 1.2 over its own place.
fs.writeFileSync(`${OUT}/s2.html`, page('Join live streams<br><em>from the start.</em><span class="beta">BETA</span>',
  'Opened mid-stream? It pauses before showing the current moment.', `
${crop('live', 16, 68, 873, 491, 0.86, 'shadow', 'left:56px;top:292px')}
${crop('live', 245, 223, 405, 182, 1.2, 'shadow', 'left:186px;top:390px;border-radius:12px')}
<div class="tag" style="left:96px;top:322px"><b>1</b>Paused before the current moment</div>
<div class="tag" style="left:180px;top:732px"><b>2</b>Start from beginning or go live</div>
${crop('live', 905, 68, 344, 420, 0.98, 'shadow', 'left:884px;top:292px;border-radius:14px')}
<div class="dash" style="left:1172px;top:300px;width:46px;height:44px;border-radius:50%"></div>
<div class="tag" style="left:968px;top:232px"><b>3</b>× closes the chat</div>
${crop('live', 990, 318, 172, 98, 1.6, 'loupe', 'left:906px;top:505px')}
<div class="tag" style="left:930px;top:732px"><b>4</b>Live chat covered</div>
`));

// 3 — Feeds: the same card in three states; whole cards only.
const card = (name, left) => crop(name, 124, 128, 347, 273, 1.04, 'shadow', `left:${left}px;top:318px;border-radius:14px`);
fs.writeFileSync(`${OUT}/s3.html`, page('Clean feeds.<br><em>No video lengths.</em>',
  'Durations are hidden everywhere. Blur previews and titles too, when they give away the winner.', `
${card('grid-time', 56)}${card('grid-previews', 460)}${card('grid-titles', 864)}
<div class="tag" style="left:76px;top:634px"><b>1</b>No duration badges</div>
<div class="tag" style="left:480px;top:634px"><b>2</b>+ Blur previews</div>
<div class="tag" style="left:884px;top:634px"><b>3</b>+ Blur titles too</div>
<div class="sub" style="left:58px;top:712px;font-size:19px">Titles follow previews by default; unlink them in the popup if you want only one.</div>
`));

// 4 — Uncover one video: this video shows its time again; the related column stays protected.
fs.writeFileSync(`${OUT}/s4.html`, page('Uncover one video.<br><em>Keep the rest safe.</em>',
  'Other videos on the page stay protected.', `
<style>
.keys { position: absolute; right: 56px; top: 112px; display: flex; align-items: center; gap: 12px; font: 700 30px "Segoe UI"; color: var(--muted); }
.keys span { min-width: 84px; height: 72px; padding: 0 18px; display: grid; place-items: center; border-radius: 14px; color: #fff;
  background: linear-gradient(180deg, #2a2a31, #1a1a1f); border: 1px solid rgba(255,255,255,.18); box-shadow: 0 6px 0 #0c0c0f, 0 14px 30px rgba(0,0,0,.5); font: 700 28px "Segoe UI"; }
.keys small { position: absolute; right: 0; top: 92px; font: 600 17px "Segoe UI"; color: var(--muted); white-space: nowrap; }
.page { -webkit-mask-image: linear-gradient(180deg, #000 88%, transparent); }
</style>
<div class="keys"><span>Alt</span>+<span>Shift</span>+<span>V</span><small>or click the eye in the player</small></div>
${crop('watch-revealed', 16, 60, 1249, 505, 0.93, 'shadow page', 'left:59px;top:296px;border-radius:16px')}
${crop('watch-revealed', 28, 492, 422, 67, 1.5, 'loupe', 'left:56px;top:640px')}
<div class="tag" style="left:56px;top:584px"><b>1</b>This video: time and bar are back</div>
<div class="dash" style="left:884px;top:300px;width:330px;height:440px"></div>
<div class="tag" style="left:930px;top:700px"><b>2</b>Others: still no lengths</div>
`));

// 5 — Your rules: the popup with Advanced settings open, the shortcut, languages, privacy.
fs.writeFileSync(`${OUT}/s5.html`, page('Your rules.<br><em>One switch.</em>',
  'Choose what stays hidden. Everything runs in your browser.', `
<style>
.label { position: absolute; left: 58px; font: 700 22px Bahnschrift; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.langs { position: absolute; left: 56px; top: 334px; width: 660px; display: flex; flex-wrap: wrap; gap: 10px; }
.langs span { padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); font: 600 18px "Segoe UI"; }
.keys { position: absolute; left: 56px; top: 520px; display: flex; align-items: center; gap: 10px; font: 700 24px "Segoe UI"; color: var(--muted); }
.keys span { min-width: 68px; height: 58px; padding: 0 16px; display: grid; place-items: center; border-radius: 12px; color: #fff;
  background: linear-gradient(180deg, #2a2a31, #1a1a1f); border: 1px solid rgba(255,255,255,.18); box-shadow: 0 5px 0 #0c0c0f, 0 12px 26px rgba(0,0,0,.5); font: 700 23px "Segoe UI"; }
.chips { position: absolute; left: 56px; top: 664px; display: flex; gap: 12px; }
.chips span { padding: 10px 18px; border-radius: 999px; background: rgba(224,72,79,.14); border: 1px solid rgba(224,72,79,.5); font: 600 18px "Segoe UI"; }
.chips span::before { content: "✓ "; color: var(--red); }
</style>
<div class="label" style="top:300px">10 languages</div>
<div class="langs"><span>English</span><span>German</span><span>Spanish</span><span>French</span><span>Indonesian</span><span>Japanese</span><span>Korean</span><span>Portuguese</span><span>Russian</span><span>Turkish</span></div>
<div class="label" style="top:486px">Turn protection on or off</div>
<div class="keys"><span>Alt</span>+<span>Shift</span>+<span>S</span></div>
<div class="label" style="top:630px">Private by design</div>
<div class="chips"><span>No account</span><span>No tracking</span><span>No data collected</span></div>
${crop('popup-dark-advanced', 0, 0, 352, 514, 1.12, 'shadow', 'left:810px;top:128px;border-radius:18px')}
<div class="tag" style="left:836px;top:70px"><b>1</b>Each protection on or off</div>
<div class="dash" style="left:818px;top:527px;width:378px;height:62px"></div>
<div class="tag" style="left:836px;top:724px"><b>2</b>Titles follow previews, or unlink</div>
`));

// Small promo tile, 440×280: a score graphic with the clock hidden; a frame without baked-in text.
fs.writeFileSync(`${OUT}/tile-small.html`, `<!doctype html><html><head><meta charset="utf-8"><style>
* { margin: 0; box-sizing: border-box; } body { width: 440px; height: 280px; overflow: hidden; position: relative; font-family: Bahnschrift; color: #fff; background: #0b0b0f; }
.bg { position: absolute; inset: 0; background: url(${GEN}frame3.png) 60% 40%/cover; filter: saturate(.85) brightness(.6); }
.shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,14,.15), rgba(10,10,14,.9) 70%); }
.bug { position: absolute; left: 24px; top: 24px; display: flex; height: 46px; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.6); font-weight: 700; font-size: 23px; letter-spacing: .04em; }
.bug span { display: grid; place-items: center; padding: 0 14px; background: #16161c; }
.bug .vs { background: #2a2a33; color: #b9b9c4; font-size: 16px; }
.bug .clock { background: #e0484f; font-size: 25px; min-width: 100px; position: relative; }
.bug .clock::after { content: ""; position: absolute; left: 14px; right: 14px; top: 50%; height: 3px; background: #fff; transform: rotate(-14deg); }
h1 { position: absolute; left: 24px; bottom: 62px; font-size: 54px; line-height: .94; font-stretch: condensed; text-transform: uppercase; }
p { position: absolute; left: 24px; bottom: 22px; display: flex; align-items: center; gap: 10px; font: 600 19px "Segoe UI"; }
p svg { width: 52px; height: 28px; }
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="bug"><span>APEX</span><span class="vs">VS</span><span>NOVA</span><span class="clock">??:??</span></div>
<h1>No time<br>spoilers</h1><p>${LOGO}Anti-Spoiler for YouTube™</p></body></html>`);

// Small promo tile B: the thumbnail duration badge crossed out (what the extension really hides).
fs.writeFileSync(`${OUT}/tile-small-b.html`, `<!doctype html><html><head><meta charset="utf-8"><style>
* { margin: 0; box-sizing: border-box; } body { width: 440px; height: 280px; overflow: hidden; position: relative; font-family: Bahnschrift; color: #fff; background: #0b0b0f; }
.bg { position: absolute; inset: 0; background: url(${GEN}frame3.png) 60% 40%/cover; filter: saturate(.85) brightness(.6); }
.shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,14,.15), rgba(10,10,14,.9) 70%); }
.badge { position: absolute; right: 24px; top: 24px; padding: 6px 14px; border-radius: 8px; background: rgba(0,0,0,.85); font: 700 34px "Segoe UI"; letter-spacing: .01em; }
.badge::after { content: ""; position: absolute; left: -8px; right: -8px; top: 50%; height: 5px; border-radius: 3px; background: #e0484f; transform: rotate(-12deg); box-shadow: 0 0 14px rgba(224,72,79,.8); }
h1 { position: absolute; left: 24px; bottom: 62px; font-size: 54px; line-height: .94; font-stretch: condensed; text-transform: uppercase; }
p { position: absolute; left: 24px; bottom: 22px; display: flex; align-items: center; gap: 10px; font: 600 19px "Segoe UI"; }
p svg { width: 52px; height: 28px; }
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="badge">1:34:09</div>
<h1>No time<br>spoilers</h1><p>${LOGO}Anti-Spoiler for YouTube™</p></body></html>`);
console.log('ok');
