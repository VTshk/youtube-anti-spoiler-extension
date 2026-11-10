# Design question: where and how to show "About us" in the extension popup

Owner (translated): "I don't like how 'About us' looks in the footer. With protection off it appears ugly, with a
scroll. Maybe don't show it at all when protection is off? Or is that wrong too? How can we show this information to
the user nicely, if needed? How is it usually done in interfaces? Think it over with Astra and Argon."

## Facts
- Chrome MV3 extension popup "Anti-Spoiler for YouTube™", 352 px wide; the browser sizes the popup window to the
  content height (max 600 px). Files: `E:\vt\pet\projects\youtube-anti-spoiler-extension\.claude\worktrees\project-overview-62c71a\popup\popup.html`,
  `popup.css`, `popup.js` (bindAboutSheet).
- Screens (dark theme, 2× scale): `C:\Users\vtshk\AppData\Local\Temp\yas-store\about-footer\on.png` (protection on,
  412 px tall), `off.png` (protection off: settings cards are hidden, the popup is only 192 px tall),
  `on-advanced.png`, `off-about.png` (the About sheet drawn in a 600 px tall page — in the real 192 px popup it
  cannot fit, so it opens with an inner scroll; that is the owner's complaint).
- Current footer: a thin line and a muted "ⓘ About us" button. It opens a bottom sheet (`<dialog>`): header
  "About us" + ×, "Thank you for using Anti-Spoiler!", one sentence, "Contact" block with the email and a copy button.
- The header already has a language button (globe "EN ▾") and a theme button (moon).
- The About content is low-priority: users open it rarely (to thank, report a bug, suggest an idea). The popup's
  main job is the protection switch and the settings.
- Code rules: simple code a person can read without agents; 10 locales; keyboard and screen-reader access.

## Question
How do good extensions/apps usually place this kind of info (about, contact, feedback, version)? Give the patterns
you know with real-world examples (popular extensions, apps, OS conventions). Then recommend ONE solution for this
popup that: looks calm and intentional, works the same with protection on and off, never scrolls inside a 192 px
popup, stays reachable but does not pull attention from the switch, and is simple to build. Say whether hiding it
when protection is off is good or bad, and why.

## Reply (≤ 40 lines, no code files; you cannot write files)
1. Patterns (3–5 lines each max): name, where, example, fit for us yes/no and why.
2. Recommendation: exact placement, look (sizes, icon, text), what opens, how it closes, behaviour in the 192 px
   popup, accessibility. Mention anything to remove.
3. One alternative if the owner dislikes the recommendation.
Read-only: do not edit files.
