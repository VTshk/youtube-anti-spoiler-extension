# Reviewer Notes - Anti-Spoiler for YouTube

## Purpose

Anti-Spoiler for YouTube hides spoiler-prone YouTube interface elements, including durations, progress bars, comments, live-stream positions, and optional video previews and titles.

## Test Instructions

1. In `chrome://extensions`, use **Load unpacked** and select the extension project folder.
2. Open `https://www.youtube.com/`.
3. Confirm that video durations in lists, recommendations, search results, and player controls are hidden when protection is on.
4. Confirm that player and preview progress bars are hidden when **Hide progress bar** is enabled.
5. Open the extension popup.
6. Click the red **Protection on** card at the top of the popup to turn protection off.
7. Confirm that YouTube appears normally and the toolbar icon switches to the disabled gray variant.
8. Turn protection back on.
9. Confirm that the hiding behavior returns and the toolbar icon switches back to the normal colored variant.
10. Enable **Blur previews** and confirm that YouTube video previews are blurred.
11. Open any video: with **Hide progress bar** on, the player controls show `−10m … +10m` skip buttons; scroll down and confirm that comments are blurred behind **Show comments**.
12. Under **Advanced settings**, enable **Blur video titles** and confirm that titles are blurred and the browser tab shows `YouTube` on the video page.
13. Open a live stream that is currently live: the player is covered and muted until **Start from beginning** or **Continue live** is chosen.
14. Press **Alt+Shift+S** to turn protection off and on.
15. On a video page, press **Alt+Shift+V** (or the eye button in the player controls): the player time, timeline, and comments of this video appear while thumbnails and durations of other videos stay hidden; press it again to hide them.

No login credentials are required.

## Notes

The extension stores only user settings in `chrome.storage.sync`, plus the popup's language and theme choice in `chrome.storage.local`. It does not call remote services and does not transmit user data.

The popup's language chip and theme button sit in the red card's top bar; a click on them does not toggle protection.

Support contact: vtshka8@gmail.com.
