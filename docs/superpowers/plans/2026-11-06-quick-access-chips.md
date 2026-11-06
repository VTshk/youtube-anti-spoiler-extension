# Plan: language chip and theme button in the hero cap (2026-11-06)

Owner's choice: option **B. "Значки в шапке"** from `docs/design/2026-11-06-redesign/STATE.md`, last section.
Mockup: `docs/design/2026-11-06-redesign/mockups/quick-b.html` (CSS block "Option B" at ~line 422, markup ~line 478),
screenshots `shots/quick-b-light.png`, `shots/quick-b-dark.png`.

Repository: Chrome MV3 extension, no build step, plain HTML/CSS/JS. Tests: `npm test` (node:test, a fake DOM built
from `popup.html` in `tests/popup.test.js`). Currently 271/271 green. The worktree already holds uncommitted hero-card
changes in `popup/` and `tests/popup.test.js`: they are part of this work, keep them.

## Files

- `popup/popup.html`, `popup/popup.css`, `popup/popup.js`
- `tests/popup.test.js` (update and add tests)
- `_locales/*/messages.json`, all 10: `de en es fr id ja ko pt_BR ru tr`
- Do NOT touch: `src/` (content scripts, background, `src/shared/*`), the in-page panels, `manifest.json`, git.

## 1. Markup (`popup.html`)

- Wrap the hero `<label class="hero" data-hero>` in `<div class="hero-wrap">` (position: relative).
- After the `</label>`, still inside `.hero-wrap`, add `<div class="hero-tools">` with two controls. They must be
  OUTSIDE the label, so a click on them never toggles protection.
  1. **Language chip**: `<span class="chip chip-language">` holding the globe SVG, `<span data-language-code>EN</span>`,
     the chevron SVG (both SVGs `aria-hidden="true"`, paths from the mockup), and a real
     `<select data-language-select data-yas-i18n-label="popupLanguageLabel" aria-label="Language"></select>`
     laid over the whole chip: `position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer;
     margin:0`. Clicking the chip therefore opens the native list. `data-yas-i18n-label` already gives it both
     `aria-label` and `title` through `namespace.setLabel` / `applyTranslations` in `src/shared/i18n.js`.
  2. **Theme button**: `<button type="button" class="chip chip-icon" data-theme-toggle>` with three SVG icons inside,
     each `aria-hidden="true"` and marked `data-theme-icon="auto|light|dark"`; only the current one is visible
     (`hidden`). Icons: auto = the half-filled circle with rays from the mockup; light = a sun (circle r=4 + 8 rays);
     dark = a crescent moon (`M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z`).
- Remove the `<label class="row language">…</label>` from Advanced settings. Advanced now holds only settings, so the
  whole `<details>` hides while protection is off: move `data-settings-panel` from the inner `<div>` to the
  `<details>` itself (and update its HTML comment). The language chip stays visible in both states.

## 2. Styles (`popup.css`)

- `.hero-wrap { position: relative; }`
- `.hero-tools { position:absolute; top:16px; right:12px; display:flex; gap:6px; }`
- `.chip`, `.chip svg`, `.chip .chev`, `.chip-icon`, `.chip-icon svg` exactly as in the mockup:
  height 28px, radius 14px, `background: rgba(34,34,34,.78)`, `border: 1px solid rgba(255,255,255,.28)`, white text
  12.5px weight 700. `.chip-language { position: relative; }` for the overlay select.
- Hover: background `rgba(34,34,34,.92)`. Focus: `.chip-language:has(select:focus-visible)` and
  `.chip-icon:focus-visible` → `outline: 2px solid #fff; outline-offset: 2px` (white on red and gray alike).
- Disabled (read-only): `.chip:has(:disabled), .chip:disabled { opacity:.45; cursor:default }`.
- Remove the now unused `.language select` rules.
- **Theme.** Missing `data-theme` on `<html>` = Auto. Keep the existing `@media (prefers-color-scheme: dark)` block
  but make its selector `:root:not([data-theme="light"])`; add the same dark variables for `:root[data-theme="dark"]`
  (plain CSS cannot share one block between a media query and a selector; a comment says the two blocks must match).
  Also `:root[data-theme="light"] { color-scheme: light; }` and `:root[data-theme="dark"] { color-scheme: dark; }`,
  so the native select list and scrollbars follow the chosen theme.

## 3. Script (`popup.js`)

- **Theme**, stored in `chrome.storage.local` key `uiTheme`: `"light"` or `"dark"`; missing key = Auto. Only the popup
  reads and writes it.
  - `readStoredTheme()` (like `readStoredLanguage`; a read error → console.error and Auto) and
    `writeStoredTheme(theme)` (`"auto"` → `remove("uiTheme")`, else `set`).
  - `showTheme(theme)`: `"auto"` → `removeAttribute("data-theme")` on `<html>`, else set it; show the matching icon,
    hide the other two; call `namespace.setLabel(button, key)` with `popupThemeAuto|Light|Dark`: it sets `aria-label`
    and `title` and stores the key, so `applyTranslations` re-translates it after a language change. The label must update after a language change.
  - Click: next mode in the order `auto → light → dark → auto`; show it at once, then write. On write failure:
    console.error, show the stored (previous) mode again, `setStatus("popupThemeError")`.
  - Another popup window changing `uiTheme`: extend the existing `storage.onChanged` local listener to call
    `showTheme(newValue || "auto")`.
  - Read the theme at the very start of `start()`, before the settings read, so the colour is right as early as possible.
- **Language chip**: `showLanguage` also sets the chip code: the listed language code's first two letters, upper case
  (`pt_BR` → `PT`). Keep the current logic: browser language preselected, no "browser language" entry, picking the
  browser's language removes `uiLanguage`. The select keeps `data-language-select`, so existing language code paths stay.
- Read-only mode (settings failed to load): disable the theme button too, like the language select.
- Keep everything else (hero pointer, save queue, power toggle) as is.

## 4. Messages (all 10 `_locales/*/messages.json`)

New keys, each with a `description`:
- `popupThemeAuto` — "Theme: automatic" (aria-label/title of the button in Auto mode)
- `popupThemeLight` — "Theme: light"
- `popupThemeDark` — "Theme: dark"
- `popupThemeError` — "Could not save the theme." (match the tone of `popupLanguageError`)
Natural translations in each language (ru: «Тема: автоматически», «Тема: светлая», «Тема: тёмная»,
«Не удалось сохранить тему.»). Keep `popupLanguageLabel`: it is now the chip's aria-label. Remove any key that is no
longer used anywhere (grep `_locales` keys against `popup/`, `src/`, `manifest.json`, store files); if none, say so.

## 5. Tests (`tests/popup.test.js`)

Update the markup tests (no `.row.language`, the select inside `.hero-tools` outside the hero label, `data-settings-panel`
on `<details>`, the protection-off test: Advanced hides, the language select stays enabled and visible). Add tests:
- theme button outside the hero label, `type="button"`;
- no stored theme → no `data-theme`, Auto icon, Auto label;
- stored `"dark"` → `data-theme="dark"`;
- clicks cycle auto → light → dark → auto, storage `set("light")`, `set("dark")`, `remove("uiTheme")`;
- write failure → previous mode shown, `popupThemeError`;
- change from another window applied;
- chip code `EN`, and `PT` for `pt_BR`;
- read-only → theme button disabled;
- CSS: dark variables in both `:root[data-theme="dark"]` and the media block with `:not([data-theme="light"])`.
The fake DOM in the test file may need `removeAttribute`, `documentElement` attributes, and `click` listeners: extend
the fake, not the product code. Also keep any locale-consistency tests green.

## Gates

- `npm test` all green; report the count (expected 271 + new).
- `node -e` JSON parse of all 10 messages.json files.
- Do not run the browser checks: the main session does the live check in real Chrome.

## Rules

- Simple, readable code: direct flow, no new abstractions, comments only for a non-obvious "why".
- Stop and report instead of guessing if something in this plan contradicts the code.
- No git commands that change state (no commit, stash, checkout, reset).
- Final report: files changed, test count expected/actual, and a "Not done" section listing anything skipped and why.

## 6. Addendum (owner request, 2026-11-06): contact footer

Owner: «еще нам надо будет указать снизу контакты для жалоб или предложений. в общем контакты для связи. почту
vtshka8 at gmail.com» (the address is `vtshka8@gmail.com`).

- `popup.html`: a `<footer class="contact">` as the last child of `.shell`, below Advanced settings, OUTSIDE every
  `data-settings-panel`, so it shows with protection off and in read-only mode too.
  Content: `<span data-yas-i18n="popupContactLabel">Questions or ideas?</span>` followed by
  `<a href="mailto:vtshka8@gmail.com">vtshka8@gmail.com</a>`. The address is plain visible text (copyable by hand); no
  icon-only control. The address is not translated.
- `popup.css`: muted (`var(--muted)`) 12 px text, centred, compact: margin-top 8 px, no card. Link colour `var(--text)`
  with underline, a visible `:focus-visible` ring (`var(--focus)`). Long labels wrap (`overflow-wrap: anywhere`).
  Keep the popup as short as possible: with Advanced closed it should stay about 400 px or less in all 10 languages.
- Do NOT add JS for the link now. The main session checks live whether a plain mailto link opens the mail client
  from the popup, and changes it itself if needed.
- Messages: `popupContactLabel` in all 10 locales, with a `description`. en "Questions or ideas?",
  ru «Вопросы и предложения:», natural equivalents for the others ("feedback, complaints, suggestions" meaning).
- Tests: markup test for the footer (outside the hero label and outside `data-settings-panel`, mailto href, visible
  address), the English text matches the message, the key exists in all locales.
