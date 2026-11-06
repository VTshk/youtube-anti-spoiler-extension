# Brief: quick access to language and theme in the popup (2026-11-06)

The owner's request, translated:

> And the language switch and the dark/light theme switch should be moved out of the settings and added somewhere
> for quick access too. Think about the options with Codex and Argon.

## The popup today

Repository: the current directory. Files:
- `popup/popup.html`, `popup/popup.css`, `popup/popup.js`;
- screenshots: `docs/design/2026-11-06-redesign/shots/r3-popup-light.png`, `r3-popup-dark.png`, and
  `r3-popup-advanced-open.png`, which shows the Advanced settings open.

The popup is 352 px wide. From top to bottom it has:
1. **The hero card**, which is the whole master switch: a click anywhere on it toggles protection.
   - A red cap (`#c85252`; gray `#6e6e6e` when protection is off) with the name "Anti-Spoiler" on the left, in white,
     19 px, weight 800.
   - A white play triangle centred, its lower half behind the dark band, as in the logo `icons/icon.svg`.
   - A dark band (`#222`) with "PROTECTION ON" / "OFF", a note, and a switch on the right.
   - A 10 px red bottom strip.
   - With protection off, a red circle follows the cursor on hover.
2. **The main settings card**: Hide progress bar, Blur previews, Protect live streams, each a row with a toggle.
3. **"Advanced settings"**, a collapsible `<details>`, closed by default. It holds Blur video titles, Hide comments and
   the **Language** select. The select lists 10 languages by native name: English, Русский, Español, Português
   (Brasil), Deutsch, Français, 日本語, 한국어, Bahasa Indonesia, Türkçe. The browser's language is preselected.

Theme: the popup follows the OS theme through `prefers-color-scheme`. There is no manual theme switch yet.

## What is wanted

Move **Language** out of Advanced settings, and add a **theme switch** with three modes: automatic (follows the system),
light and dark. Both go to a **quick-access** place in the popup, visible without opening anything.

Constraints:
- Plain HTML, CSS and a little JS. No libraries, no web fonts, no build step.
- Simple code that a developer without an AI agent can follow.
- The popup must stay short: about 400 px or less with Advanced closed.
- The quick-access controls must not compete with the master switch, which is the main action.
- They work in 10 languages:
  - labels may be long (German, Russian), so icons with tooltips and `aria-label` are welcome;
  - native language names must still be readable when choosing.
- Accessible:
  - real buttons or selects;
  - keyboard reachable;
  - visible focus;
  - an `aria-label` on icon-only controls;
  - the current state shown by more than colour.
- The theme choice applies to the popup itself.
  - Say whether it should also affect the in-page panels on YouTube. Those are dark cards today, readable on both
    YouTube themes.
  - The choice is per device: store it in `chrome.storage.local`, next to `uiLanguage`.
- The hero card is one big `<label>` for the master switch. Controls placed inside it would toggle protection on click
  unless kept outside the label, so say where exactly they go.

## Deliverable

Give **3 clearly different options** for where and how language and theme live. For example: icons in a small top bar
above the hero; a footer row; icons inside the hero cap next to the name, outside the label; a segmented control; a
globe button that opens a small menu. Do not limit yourself to these. For each option give:
1. an ASCII wireframe of the top or bottom of the popup with the controls;
2. the exact controls:
   - element types;
   - sizes;
   - icons, described or as simple SVG paths;
   - behaviour on click and keyboard;
   - how the current language and theme are shown;
3. how it looks in light and dark, with tokens taken from the popup's existing CSS variables;
4. the risks: long languages, discoverability, accidental protection toggles, and height.

Then recommend one option, in at most 5 lines.

Do not edit files. Keep the answer under about 200 lines, in English.
