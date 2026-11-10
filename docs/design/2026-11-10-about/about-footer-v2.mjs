// Footer variants, round 2 (owner: the B4 footer looks cramped and the hover fill nearly runs into the popup's edge).
// Real popup, Russian, dark theme. Each variant: protection on (bottom crop) normal + hover, protection off normal.
// Usage: node about-footer-v2.mjs <ext-folder> <out-dir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire('C:/Users/vtshk/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/');
const { chromium } = require('playwright');
const HERE = 'C:/Users/vtshk/AppData/Local/Temp/yas-store/cap';
const [ext, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(HERE, 'profile-main'), {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: false, deviceScaleFactor: 2,
  args: ['--mute-audio', '--enable-unsafe-extension-debugging', '--lang=en-US'], ignoreDefaultArgs: ['--disable-extensions'],
});
const cdp = await ctx.browser().newBrowserCDPSession();
const { id } = await cdp.send('Extensions.loadUnpacked', { path: path.win32.normalize(ext) });
await sleep(1200);
const p = await ctx.newPage();
await p.setViewportSize({ width: 352, height: 600 });
await p.goto(`chrome-extension://${id}/popup/popup.html`);
await p.evaluate(async () => {
  const uiLanguage = { code: 'ru', messages: await YouTubeAntiSpoiler.fetchMessages('ru') };
  await new Promise((r) => chrome.storage.local.set({ uiTheme: 'dark', uiLanguage }, r));
});

const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none;color:var(--muted)"><path d="M9 6l6 6-6 6"/></svg>';

// Each variant: CSS on top of the real popup.css, plus an optional DOM tweak.
const VARIANTS = {
  // Now (B4 as built), for comparison.
  N: { css: '' },
  // 1: B4 with air: 10 px above, 14 px below; no fill on hover, the text lightens and is underlined.
  V1: { css: `.contact{margin-top:10px;padding:0 10px 4px 16px}
    .about-button{min-height:28px;padding:0 2px}
    .about-button:hover{background:none;color:var(--text)}
    .about-button:hover span{text-decoration:underline;text-underline-offset:3px}` },
  // 2: centred "v1.0.0 · О нас и обратная связь", with air; hover underline.
  V2: { css: `.contact{justify-content:center;gap:8px;margin-top:10px;padding:0 0 4px}
    .version::after{content:"·";margin-left:8px}
    .about-button{min-height:28px;padding:0 2px}
    .about-button:hover{background:none;color:var(--text)}
    .about-button:hover span{text-decoration:underline;text-underline-offset:3px}` },
  // 3: one more card, like "Дополнительные настройки": icon + text left, version + › right; hover lightens the card.
  V3: { css: `.contact{display:block;margin-top:10px;padding:0}
    .about-button{display:flex;width:100%;gap:8px;min-height:44px;padding:7px 12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--text);font-size:14px;font-weight:600}
    .about-button svg{color:var(--muted)}
    .about-button .version{margin-left:auto;font-weight:400}
    .about-button:hover{background:color-mix(in srgb, var(--text) 6%, var(--surface));color:var(--text)}`,
    moveVersionIntoButton: true },
  // 4: B4 kept, more air and a softer, shorter hover fill that stays clear of the edges.
  V4: { css: `.contact{margin-top:8px;padding:0 6px 4px 16px}
    .about-button{min-height:28px;padding:0 10px}
    .about-button:hover{background:color-mix(in srgb, var(--text) 6%, transparent)}` },
};

async function load(enabled, variant) {
  await p.evaluate((on) => new Promise((r) => chrome.storage.sync.clear(() => chrome.storage.sync.set({ extensionEnabled: on }, r))), enabled);
  await p.reload();
  await sleep(500);
  await p.evaluate(({ css, move, chev }) => {
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    if (move) {
      const b = document.querySelector('[data-about-open]');
      b.append(document.querySelector('[data-version]'));
      b.insertAdjacentHTML('beforeend', chev);
    }
  }, { css: variant.css, move: Boolean(variant.moveVersionIntoButton), chev: CHEV });
  await sleep(200);
}

// The popup is as tall as its content; shoot at that height, or only its bottom part.
async function shot(name, { hover = false, bottom = 0 } = {}) {
  const h = await p.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
  await p.setViewportSize({ width: 352, height: Math.min(h, 600) });
  await sleep(200);
  if (hover) { await p.hover('[data-about-open]'); await sleep(250); } else { await p.mouse.move(5, 5); await sleep(150); }
  const clip = bottom ? { x: 0, y: Math.min(h, 600) - bottom, width: 352, height: bottom } : undefined;
  await p.screenshot({ path: path.join(out, name + '.png'), clip });
  await p.setViewportSize({ width: 352, height: 600 });
  console.log(JSON.stringify({ name, height: h }));
}

for (const [key, variant] of Object.entries(VARIANTS)) {
  await load(true, variant);
  await shot(`${key}-on`, { bottom: 150 });
  await shot(`${key}-on-hover`, { bottom: 150, hover: true });
  await load(false, variant);
  await shot(`${key}-off`);
}
await p.evaluate(() => new Promise((r) => chrome.storage.sync.clear(() => chrome.storage.local.remove('uiLanguage', r))));
await ctx.close();
