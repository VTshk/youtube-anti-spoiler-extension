// R2 live acceptance: translated popup under --lang=<code>, clipping check, in-page texts on YouTube,
// and switching the language in the popup. LANG=de|ru|ja (required). YT=0 skips YouTube.
// One JSON line per check.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('C:/Users/vtshk/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/');
const { chromium } = require('playwright');
const T = 'C:/Users/vtshk/AppData/Local/Temp/yas-audit2';
const EXT = path.join(T, 'ext-r2');
const LANG = process.env.LANG_CODE;
const SWITCH_TO = process.env.SWITCH_TO || 'ja';
const OUT = path.join(T, 'out-r2', LANG);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (name, data) => console.log(JSON.stringify({ check: name, ...data }));
const readMessages = (code) => Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(EXT, '_locales', code, 'messages.json'), 'utf8'))).map(([k, v]) => [k, v.message]));
const M = readMessages(LANG);
const S = readMessages(SWITCH_TO);

// A new empty profile per run, so the language is never cached from an earlier run.
const profile = path.join(T, 'profile-r2-' + LANG + '-' + Date.now());
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: 'C:/Users/vtshk/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe', headless: true,
  viewport: { width: 1280, height: 800 }, locale: LANG.replace('_', '-'),
  args: [`--lang=${LANG.replace('_', '-')}`, `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required'],
});
let sw = ctx.serviceWorkers()[0];
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => null);
const extId = new URL(sw.url()).host;
const errors = [];
sw.on?.('console', (m) => { if (m.type() === 'error') errors.push({ where: 'sw', text: m.text().slice(0, 200) }); });
function watch(page, where, extOnly) {
  page.on('pageerror', (e) => errors.push({ where, pageerror: String(e.message).slice(0, 200) }));
  page.on('console', (m) => { if (m.type() === 'error' && (!extOnly || /anti-spoiler|yas-|chrome-extension:\/\//i.test(m.text() + JSON.stringify(m.location())))) errors.push({ where, console: m.text().slice(0, 200) }); });
}
const syncSet = (s) => sw.evaluate((x) => new Promise((r) => chrome.storage.sync.set(x, r)), s);
const localGet = () => sw.evaluate(() => new Promise((r) => chrome.storage.local.get(null, r)));
await syncSet({ extensionEnabled: true, hidePlayerProgressBar: true, hideVideoPreviews: true, hideVideoTitles: true, startLiveFromBeginning: true, showSkipButtons: true, hideComments: true });
log('extension', { lang: LANG, uiLanguage: await sw.evaluate(() => chrome.i18n.getUILanguage()), swName: await sw.evaluate(() => chrome.i18n.getMessage('manifestName')) });

const popup = await ctx.newPage();
watch(popup, 'popup', false);
await popup.setViewportSize({ width: 400, height: 900 });
async function openPopup(scheme) {
  await popup.emulateMedia({ colorScheme: scheme });
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`, { waitUntil: 'load' });
  await sleep(800);
}
// Every element whose text is cut: content wider/taller than its box while overflow clips it,
// or a box that sticks out of the popup shell.
const layoutCheck = () => popup.evaluate(() => {
  const shell = document.querySelector('.shell').getBoundingClientRect();
  const clipped = [];
  document.querySelectorAll('.shell *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || !el.getClientRects().length) return;
    const r = el.getBoundingClientRect();
    const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.textOverflow === 'ellipsis';
    const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
    if (el.tagName !== 'SELECT' && clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) clipped.push({ tag, why: 'overflow', sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, text: el.textContent.trim().slice(0, 50) });
    if (r.right > shell.right + 0.5 || r.left < shell.left - 0.5) clipped.push({ tag, why: 'outside shell', right: Math.round(r.right), shellRight: Math.round(shell.right), text: el.textContent.trim().slice(0, 50) });
  });
  const select = document.querySelector('[data-language-select]');
  const selectFits = (() => { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(select).font; const w = c.measureText(select.options[select.selectedIndex].text).width; return { textWidth: Math.round(w), boxWidth: select.clientWidth }; })();
  return { shellWidth: Math.round(shell.width), pageScrollX: document.documentElement.scrollWidth > innerWidth, clipped, selectFits };
});
const textsCheck = (messages) => popup.evaluate((m) => {
  const wrong = [];
  document.querySelectorAll('[data-yas-i18n]').forEach((el) => { if (el.textContent !== m[el.dataset.yasI18n]) wrong.push({ key: el.dataset.yasI18n, shown: el.textContent }); });
  return { lang: document.documentElement.lang, checked: document.querySelectorAll('[data-yas-i18n]').length, wrong, status: document.querySelector('[data-power-status]').textContent, note: document.querySelector('[data-power-note]').textContent, title: document.title, heroTitleCaps: getComputedStyle(document.querySelector('.hero-title')).textTransform, rowLines: [...document.querySelectorAll('.row-title, .row-note')].map((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))) };
}, messages);
const shot = async (file, sel) => { if (sel) await popup.locator(sel).first().screenshot({ path: path.join(OUT, file) }); else await popup.locator('.shell').screenshot({ path: path.join(OUT, file) }); };
const clickRow = (setting) => popup.locator('label.row', { has: popup.locator(`[data-setting="${setting}"]`) }).click();

// --- Popup ---
for (const scheme of ['light', 'dark']) {
  await openPopup(scheme);
  log(`popup ${scheme} texts`, await textsCheck(M));
  log(`popup ${scheme} layout`, await layoutCheck());
  await shot(`popup-${scheme}.png`);
}
await openPopup('light');
await popup.locator('.switch').click(); await sleep(700);
log('popup off', { status: await popup.locator('[data-power-status]').textContent(), note: await popup.locator('[data-power-note]').textContent(), expected: [M.popupStatusOff, M.popupNoteOff], layout: await layoutCheck() });
await shot('popup-off.png');
await popup.locator('.switch').click(); await sleep(700);
await clickRow('hidePlayerProgressBar'); await sleep(700);
log('popup bar off', { skipNote: await popup.locator('[data-skip-note]').textContent(), expected: M.popupSkipButtonsRequires, layout: await layoutCheck() });
await shot('popup-requires.png', '.card');
await clickRow('hidePlayerProgressBar'); await sleep(700);
// The longest text, the load error, injected into the status line only to check wrapping.
await popup.evaluate((t) => { document.querySelector('[data-status]').textContent = t; }, M.popupLoadError);
log('popup long status (injected)', { layout: await layoutCheck() });
await shot('popup-long-status.png');
// Footer with no shortcut set (headless has the default Alt+Shift+S; inject the not-set text).
const footer = await popup.evaluate(() => { const f = document.querySelector('footer, .footer'); return f ? f.innerText : null; });
log('popup footer', { footer });

// --- YouTube ---
let yt = null;
const coverState = () => yt.evaluate(() => {
  const o = document.getElementById('youtube-anti-spoiler-comments-guard');
  const t = o && o.querySelector('.yas-comments-guard-title'); const b = o && o.querySelector('button');
  const skip = [...document.querySelectorAll('[data-yas-i18n-label]')].map((e) => e.getAttribute('aria-label'));
  return { overlay: !!o, title: t && t.textContent, button: b && b.textContent, skipLabels: skip, mark: !!(o && o.dataset.r2Mark) };
});
const ytShot = async (file) => { const b = await yt.locator('#youtube-anti-spoiler-comments-guard .yas-comments-guard-panel').first().boundingBox(); if (!b) { log('shot fail', { file }); return; } await yt.screenshot({ path: path.join(OUT, file), clip: { x: Math.max(0, b.x - 16), y: Math.max(0, b.y - 16), width: b.width + 32, height: b.height + 32 } }); };
if (process.env.YT !== '0') {
  yt = await ctx.newPage(); watch(yt, 'youtube', true);
  await yt.goto('https://www.youtube.com/watch?v=RwB09qzaNdU', { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (yt.url().includes('consent.')) {
    await yt.getByRole('button', { name: /Reject all|Alle ablehnen|Отклонить все|すべて拒否/i }).first().click({ timeout: 10000 }).catch((e) => log('consent', { e: e.message.slice(0, 100) }));
    await yt.waitForURL(/www\.youtube\.com/, { timeout: 20000 }).catch(() => {});
  }
  await sleep(6000);
  let s = await coverState();
  for (let i = 0; i < 8 && !s.overlay; i++) { await yt.evaluate(() => window.scrollBy(0, 700)); await sleep(1500); s = await coverState(); }
  await yt.locator('#youtube-anti-spoiler-comments-guard .yas-comments-guard-panel').scrollIntoViewIfNeeded().catch(() => {});
  await sleep(800);
  log('yt browser language', { ...s, expected: [M.commentsHiddenTitle, M.commentsShowButton, M.skipBack10Minutes] });
  await ytShot('yt-cover-browser.png');
  await yt.evaluate(() => { const o = document.getElementById('youtube-anti-spoiler-comments-guard'); if (o) o.dataset.r2Mark = '1'; });

  // Pick another language in the popup, then the browser language again.
  await openPopup('light');
  await popup.selectOption('[data-language-select]', SWITCH_TO); await sleep(1500);
  const local = await localGet();
  log('popup picked', { picked: SWITCH_TO, stored: local.uiLanguage && local.uiLanguage.code, storedKeys: local.uiLanguage && Object.keys(local.uiLanguage.messages).length, texts: await textsCheck(S), layout: await layoutCheck() });
  await shot(`popup-picked-${SWITCH_TO}.png`);
  const s1 = await coverState();
  log('yt after pick', { ...s1, expected: [S.commentsHiddenTitle, S.commentsShowButton, S.skipBack10Minutes] });
  await ytShot(`yt-cover-picked-${SWITCH_TO}.png`);
  await popup.selectOption('[data-language-select]', 'auto'); await sleep(1500);
  const s2 = await coverState();
  log('yt after browser language', { ...s2, stored: (await localGet()).uiLanguage || 'none', popupTexts: await textsCheck(M), expected: [M.commentsHiddenTitle, M.commentsShowButton] });
}

log('errors', { count: errors.length, errors });
await ctx.close();
