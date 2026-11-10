// Mock-ups of three "About" placements on the real popup (dark theme). Muted. Writes PNGs per variant and state.
// A: (i) chip in the header, footer removed, About stays a bottom sheet; the popup grows to fit it.
// B: quiet left-aligned "About & feedback" link at the bottom, About as its own screen with "Back".
// C: (i) chip in the header + About as its own screen with "Back".
// Usage: node about-mocks.mjs <ext-folder> <out-dir>
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
await p.evaluate(() => new Promise((r) => chrome.storage.local.set({ uiTheme: 'dark', uiLanguage: 'en' }, r)));

const INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

// Real popup heights: measure the body and shoot exactly that (the browser sizes the popup to it).
const shot = async (name) => {
  await sleep(450);
  const h = await p.evaluate(() => Math.ceil(Math.max(document.body.getBoundingClientRect().height, parseFloat(getComputedStyle(document.body).minHeight) || 0)));
  await p.setViewportSize({ width: 352, height: Math.min(h, 600) });
  await sleep(250);
  await p.screenshot({ path: path.join(out, name + '.png') });
  await p.setViewportSize({ width: 352, height: 600 });
  console.log(JSON.stringify({ name, height: h }));
};

async function load(enabled) {
  await p.evaluate((on) => new Promise((r) => chrome.storage.sync.clear(() => chrome.storage.sync.set({ extensionEnabled: on }, r))), enabled);
  await p.reload();
  await sleep(500);
}

const headerChip = (info) => p.evaluate((icon) => {
  document.querySelector('footer.contact').remove();
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'chip chip-icon'; b.dataset.mockAbout = ''; b.setAttribute('aria-label', 'About & feedback'); b.innerHTML = icon;
  document.querySelector('.hero-tools').append(b);
}, info);

const quietLink = (info) => p.evaluate((icon) => {
  const f = document.querySelector('footer.contact');
  f.innerHTML = `<button type="button" data-mock-about style="display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 4px;border:0;background:none;color:var(--muted);font:inherit;font-size:12px;cursor:pointer">${icon.replace('<svg', '<svg style="width:14px;height:14px"')}About &amp; feedback</button>`;
  f.style.cssText = 'margin-top:4px;padding:0 14px;text-align:left';
  const style = document.createElement('style'); style.textContent = '.contact::before{display:none}'; document.head.append(style);
}, info);

// About as its own screen: everything else in the popup hides, the sheet's content goes into the page flow.
const openScreen = (back) => p.evaluate((icon) => {
  const body = document.querySelector('.about-body');
  const screen = document.createElement('section');
  screen.style.cssText = 'padding:10px 10px 12px';
  [...document.body.children].forEach((child) => { child.hidden = true; });
  document.body.append(screen);
  screen.append(body);
  const head = body.querySelector('.about-head');
  const close = head.querySelector('.about-close');
  close.innerHTML = icon; close.setAttribute('aria-label', 'Back');
  head.prepend(close);
  head.style.cssText += ';display:flex;align-items:center;gap:8px;justify-content:flex-start;padding:4px 8px 10px 4px';
  body.style.cssText = 'border:1px solid var(--line);border-radius:16px;background:var(--card, #18181b);overflow:hidden';
}, back);

// The sheet as today, with the popup allowed to grow to fit it.
const openSheet = () => p.evaluate(() => {
  const style = document.createElement('style'); style.textContent = 'body:has(.about-sheet[open]) { min-height: 380px; }'; document.head.append(style);
  document.querySelector('[data-about-sheet]').showModal();
});

const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;margin-left:auto;opacity:.7"><path d="M9 6l6 6-6 6"/></svg>';
const footerVariant = (kind) => p.evaluate(({ kind, icon, chev }) => {
  const f = document.querySelector('footer.contact');
  const style = document.createElement('style'); document.head.append(style);
  const ic = icon.replace('<svg', '<svg style="width:14px;height:14px;flex:none"');
  const btn = 'display:flex;align-items:center;gap:7px;border:0;background:none;color:var(--muted);font:inherit;font-size:12px;cursor:pointer';
  if (kind === 'B1') { style.textContent = '.contact::before{display:none}'; f.style.cssText = 'margin-top:4px;padding:0 14px'; f.innerHTML = `<button style="${btn};min-height:32px;padding:0 4px">${ic}About &amp; feedback</button>`; }
  if (kind === 'B2') { style.textContent = '.contact::before{left:14px;right:auto;width:56px}'; f.style.cssText = 'margin-top:10px;padding:6px 14px 0'; f.innerHTML = `<button style="${btn};min-height:30px;padding:0 4px">${ic}About &amp; feedback</button>`; }
  if (kind === 'B3') { style.textContent = '.contact::before{display:none}'; f.style.cssText = 'margin-top:10px;padding:0'; f.innerHTML = `<button style="${btn};width:100%;min-height:42px;padding:0 14px;border:1px solid var(--line);border-radius:14px;color:var(--text);font-size:13px">${ic.replace('flex:none','flex:none;color:var(--muted)')}About &amp; feedback${chev}</button>`; }
  if (kind === 'B4') { style.textContent = '.contact::before{display:none}'; f.style.cssText = 'margin-top:4px;padding:0 16px;display:flex;justify-content:space-between;align-items:center'; f.innerHTML = `<span style="font-size:11px;color:var(--muted);opacity:.7">v1.0.0</span><button style="${btn};min-height:32px;padding:0 2px">${ic}About &amp; feedback</button>`; }
}, { kind, icon: INFO, chev: CHEV });
for (const enabled of [true, false]) {
  for (const kind of ['B1', 'B2', 'B3', 'B4']) { await load(enabled); await footerVariant(kind); await shot(`${kind}-${enabled ? 'on' : 'off'}`); }
}
await load(true);
await p.evaluate(() => new Promise((r) => chrome.storage.sync.clear(r)));
await ctx.close();
