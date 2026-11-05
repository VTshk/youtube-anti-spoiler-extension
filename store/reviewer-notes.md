# Reviewer Notes - Anti-Spoiler for YouTube

## Purpose

Anti-Spoiler for YouTube hides spoiler-prone YouTube interface elements, including durations, progress bars, comments, live-stream positions, and optional video previews and titles.

## Test Instructions

1. In `chrome://extensions`, use **Load unpacked** and select the extension project folder.
2. Open `https://www.youtube.com/`.
3. Confirm that video durations in lists, recommendations, search results, and player controls are hidden when protection is on.
4. Confirm that player and preview progress bars are hidden when **Hide progress bar** is enabled.
5. Open the extension popup.
6. Turn **Protection is on** off.
7. Confirm that YouTube appears normally and the toolbar icon switches to the disabled gray variant.
8. Turn protection back on.
9. Confirm that the hiding behavior returns and the toolbar icon switches back to the normal colored variant.
10. Enable **Blur previews** and confirm that YouTube video previews are blurred.
11. Open any video: with **Hide progress bar** on, the player controls show `−10m … +10m` skip buttons; scroll down and confirm that comments are blurred behind **Show comments**.
12. Enable **Hide video titles** and confirm that titles are blurred and the browser tab shows `YouTube` on the video page.
13. Open a live stream that is currently live: the player is covered and muted until **Start from beginning** or **Continue live** is chosen.
14. Press **Alt+Shift+S** to turn protection off and on.

No login credentials are required.

## Notes

The extension stores only user settings in `chrome.storage.sync`. It does not call remote services and does not transmit user data.
