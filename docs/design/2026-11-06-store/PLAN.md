# Store screenshots, English listing and AI discoverability (2026-11-06)

Owner's request, translated:

> Now we need beautiful, clear screenshots for the extension store, showing clearly what the extension does and how to
> use it. Write everything in English, both the screenshots and the description. Think especially about what to do so
> that AI assistants find this extension right away and recommend it. Bring in Codex and Argon to help.

Inputs:
- Codex web research (Sol, live search): `C:\Users\vtshk\AppData\Local\Temp\yas-store\codex-research\round1.out.md`.
- Argon storyboard: summarised in the "Storyboard" section below.

## Key findings

- **The listing already exists.** "Anti-Spoiler for YouTube" is in the Chrome Web Store, `ofplbhckbbeohimppkfbcfjagcheiaia`:
  version 0.1.0, 57 users, 5.0 from 2 ratings, updated 2026-04-21. Codex could not confirm it is the owner's. If it is,
  the plan is to update this listing to 0.4.0, not to create a new one.
- **Assets** (Google docs):
  - screenshots: 1280×800, 1 to 5 of them, square corners, no padding;
  - small promo tile: 440×280, shown in search and categories; without it the listing is less visible;
  - marquee: 1400×560, used only for editorial placement;
  - store icon: 128×128.
  - The tiles cannot be localized; the screenshots and the description can.
- **Limits:**
  - the name: 75 characters (ours: 24);
  - the short description: 132 characters (ours: 97);
  - keyword stuffing is banned, for example the same word more than about 5 times or bare keyword lists.
  - `store/listing.md` "Keywords" is our own list only: there is no public keywords field.
- **Ranking:** CWS search ranks on the listing text, ratings, and the ratio of installs to uninstalls. The weights are
  not published.
- **Branding:**
  - "for YouTube™" with attribution is the allowed way to show compatibility;
  - plain screenshots of Google services are allowed for illustration;
  - other people's videos, thumbnails and faces are not licensed to us. So the screenshots use our own or generated
    content.
- **Competitors**, with users: Hide video duration on YouTube by Denis (2,000), YouTube Progress Bar Hider (1,000),
  Infinity for Youtube (330), Video spoilerless (143), Spoiler Shield (53), No Spoilers (2, YouTube and Twitch).
  - Most of them only hide the duration and the bar.
  - Our extras are the live-stream guard, the skip pills, comments and chat, blur, and 10 languages.
- **What users write:**
  - "hide YouTube video length";
  - "hide YouTube progress bar";
  - "spoiler-free VODs";
  - "video length spoils the match": esports, Smash, Overwatch, AoE2.
- **AI assistants:**
  - ChatGPT Search, Perplexity, Copilot (Bing), Claude and Gemini cite web pages found by their own crawlers:
    OAI-SearchBot, PerplexityBot, Claude-SearchBot and Bing.
  - There is no evidence that `llms.txt` helps: Google ignores it, and 97% of such files were never fetched.
  - What helps, as far as evidence goes: clear public pages that answer the question in natural words. That means the
    store page, the GitHub README and About, and a landing page with an FAQ. Also real community mentions such as
    Reddit, plus ratings.

## Storyboard (5 screenshots, 1280×800, English)

Style:
- a dark canvas `#18181b` with a soft glow in the logo red;
- white headlines at 48 px, weight 800, so they stay readable at search-thumbnail size;
- sub-captions at 22 px in `#d6d3d1`;
- no browser chrome;
- captures in rounded dark cards;
- where time used to be, a dashed red outline with a crossed-out time.

| # | Headline | What it shows |
|---|---|---|
| 1 | Watch matches without spoilers | Before/after of the same player and feed. Before: the duration, a red bar at 88%, a spoiling comment. After: no time, the skip pills, "Show comments", and the popup on top. |
| 2 | Skip without seeing the timeline | A zoomed player bar with the ±10 s, ±1 min and ±10 min pills; no time and no chapter times. |
| 3 | Join live streams from the start (Beta) | A live player behind the panel with "Start from beginning" and "Continue live"; the chat behind "Show chat". |
| 4 | Clean feeds, no video lengths | A grid in three steps: time hidden → previews blurred → titles blurred. |
| 5 | One switch. Private by design. | The popup in light and dark, the 10 language chips, "Runs locally, no tracking", and Alt+Shift+S. |

Small tile, 440×280: the logo capsule, "No Time Spoilers" and "For sports & esports on YouTube™".

Marquee, 1400×560: "Watch sports & streams without spoilers", 4 feature pills, and the popup over a player.

Content of the captures:
- real YouTube in real Chrome with the extension, so its behaviour is genuine;
- before each shot, swap the thumbnails, the video frame, titles and channels for our own generated sports images and
  fictional teams, for example "APEX FC vs NOVA UNITED — Grand Final";
- crop away the YouTube masthead and logo.

## AI discoverability actions

1. Store text: open with the problem in users' own words: "hide video length", "progress bar", "spoiler-free VODs",
   "sports and esports". Write it as natural sentences, never a keyword list.
2. Name, if the owner agrees: "Anti-Spoiler for YouTube™ – Hide Video Length & Progress Bar". That is 56 characters,
   within 75.
3. GitHub:
   - About description, website link and topics: `youtube`, `spoilers`, `chrome-extension`, `esports`, `sports`;
   - a README "FAQ" in plain questions, for example "How do I hide video length on YouTube to avoid spoilers?";
   - a link to the store.
4. A simple landing page on GitHub Pages with:
   - the same FAQ;
   - screenshots;
   - schema.org `SoftwareApplication`;
   - a `robots.txt` that allows OAI-SearchBot, PerplexityBot, Claude-SearchBot and Bingbot.
5. Community: the owner posts in relevant subreddits, following their rules. No bought or swapped reviews: that is
   against the store policy.
6. Measure: monthly, ask 5 assistants the same 3 questions and log the answers.

## Owner decisions (2026-11-06)

- **Name:** "With keywords". In the store the name becomes **Anti-Spoiler for YouTube™ – Hide Video Length & Progress
  Bar**. The extension name in Chrome stays as it is.
- **Content:** "Own images". The screenshots use real YouTube in real Chrome with the extension running. Thumbnails,
  video frames and titles are swapped for our generated images and fictional teams, and the YouTube logo is cropped out.
- **Existing listing:** the owner asked «почему 0.4 а не 1.0?» ("why 0.4 and not 1.0?"). We read that as the listing
  being theirs. The version is still open: 0.4.0 or 1.0.0.
- **New feature:** the owner says a neighbouring session, "Улучшение качества и удобства", is adding a new feature,
  "снять защиту для этого видео" ("remove protection for this video"). It works on branch
  `claude/improve-quality-convenience-dce7b1`. The owner: «это тоже все надо будет в описание добавлять и в скриншоты»
  ("all of this will need to go into the description and the screenshots too"). Add it to the storyboard: slot 5, or
  its own screenshot in place of the weakest one.

## Status

- **Beta badge:** done in the popup but not committed. "Beta" stays in English in every language, in a tint of the logo
  red.
- **Order of work:**
  1. the docs/0.4.0 session commits, because it edits `store/listing*.md` too;
  2. the "remove protection for this video" branch is merged here;
  3. a new session produces the screenshots and the English listing from this plan.
