# Reviewer Notes - Anti-Spoiler for YouTube

## Purpose

Anti-Spoiler for YouTube hides spoiler-prone YouTube interface elements, including durations, progress bars, and optional video previews.

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

No login credentials are required.

## Notes

The extension stores only user settings in `chrome.storage.sync`. It does not call remote services and does not transmit user data.
