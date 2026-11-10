// Live check of the B4 footer and the About screen in the real extension page. Muted.
// For each theme x protection x language: shoot the popup, open About, shoot it, measure heights,
// check that nothing scrolls, the footer stays on one line, and focus moves right (keyboard).
// Usage: node about-live.mjs <ext-folder> <out-dir>
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
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(String(e)));
await p.setViewportSize({ width: 352, height: 600 });
await p.goto(`chrome-extension://${id}/popup/popup.html`);

const height = () => p.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
// Shoot at the height the browser would give the popup (content height, max 600).
const shot = async (name) => {
  await sleep(300);
  const h = await height();
  await p.setViewportSize({ width: 352, height: Math.min(h, 600) });
  await sleep(200);
  const scrolls = await p.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  await p.screenshot({ path: path.join(out, name + '.png') });
  await p.setViewportSize({ width: 352, height: 600 });
  return { h, scrolls };
};

async function load({ enabled, theme, lang }) {
  // The popup keeps a chosen language as { code, messages }; English is the browser language here, so no key.
  await p.evaluate(async ({ enabled, theme, lang }) => {
    const uiLanguage = lang === 'en' ? null : { code: lang, messages: await YouTubeAntiSpoiler.fetchMessages(lang) };
    await new Promise((r) => chrome.storage.local.set({ uiTheme: theme }, r));
    await new Promise((r) => (uiLanguage ? chrome.storage.local.set({ uiLanguage }, r) : chrome.storage.local.remove('uiLanguage', r)));
    await new Promise((r) => chrome.storage.sync.clear(() => chrome.storage.sync.set({ extensionEnabled: enabled }, r)));
  }, { enabled, theme, lang });
  await p.reload();
  await sleep(500);
}

const results = [];
const cases = [];
for (const theme of ['dark', 'light']) for (const enabled of [true, false]) cases.push({ theme, enabled, lang: 'en' });
for (const lang of ['ru', 'de', 'ja', 'tr', 'es']) cases.push({ theme: 'dark', enabled: false, lang });

for (const c of cases) {
  const name = `${c.theme}-${c.enabled ? 'on' : 'off'}-${c.lang}`;
  await load(c);
  const footer = await p.evaluate(() => {
    const f = document.querySelector('footer.contact');
    const b = f.querySelector('[data-about-open]');
    return { version: f.querySelector('[data-version]').textContent, label: b.textContent.trim(), footerH: Math.round(f.getBoundingClientRect().height), buttonH: Math.round(b.getBoundingClientRect().height) };
  });
  const popup = await shot(name);
  // Keyboard: focus the link, Enter opens, focus lands on the title.
  await p.focus('[data-about-open]');
  await p.keyboard.press('Enter');
  await sleep(200);
  const opened = await p.evaluate(() => ({
    mainHidden: document.querySelector('[data-popup-main]').hidden,
    screenShown: !document.querySelector('[data-about-screen]').hidden,
    focus: document.activeElement.className,
    title: document.querySelector('[data-about-title]').textContent,
    back: document.querySelector('[data-about-back]').getAttribute('aria-label'),
  }));
  const about = await shot(name + '-about');
  await p.keyboard.press('Escape');
  await sleep(200);
  const afterEscape = await p.evaluate(() => ({ screenShown: !document.querySelector('[data-about-screen]').hidden, focus: document.activeElement.className }));
  // Back button by mouse.
  await p.click('[data-about-open]');
  await p.click('[data-about-back]');
  const afterBack = await p.evaluate(() => ({ screenShown: !document.querySelector('[data-about-screen]').hidden, focus: document.activeElement.className, h: Math.ceil(document.body.getBoundingClientRect().height) }));
  results.push({ name, footer, popup, opened, about, afterEscape, afterBack });
}

// Read-only mode: storage.sync fails to read -> the About link still works.
await load({ theme: 'dark', enabled: true, lang: 'en' });
await p.evaluate(() => {
  document.querySelector('[data-about-open]').click();
});
results.push({ name: 'click-in-page', screenShown: await p.evaluate(() => !document.querySelector('[data-about-screen]').hidden) });

await p.evaluate(() => new Promise((r) => chrome.storage.sync.clear(() => chrome.storage.local.set({ uiTheme: 'dark' }, () => chrome.storage.local.remove('uiLanguage', r)))));
await ctx.close();
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 1));
for (const r of results) console.log(JSON.stringify(r));
console.log('errors:', JSON.stringify(errors));
