# Permissions - Anti-Spoiler for YouTube

## Single Purpose

Anti-Spoiler for YouTube hides spoiler-prone YouTube interface elements, such as durations, progress bars, video previews, titles, comments, and live-stream positions, so users can watch result-sensitive videos without accidental spoilers.

## `storage`

The `storage` permission is required to save the user's extension settings:

- whether protection is enabled;
- whether progress bars should be hidden (skip buttons are shown in their place while they are hidden);
- whether video previews and titles should be blurred;
- whether comments should be hidden;
- whether live streams should be protected.

The extension uses `chrome.storage.sync` so settings persist across browser sessions and can sync with the user's Chrome profile.

It also uses `chrome.storage.local` for two display choices made in the popup: the interface language picked by the user (with that language's packaged interface texts, so the YouTube page buttons can use them) and the popup theme (automatic, light, or dark). Both stay on the device.

## `https://www.youtube.com/*`

The YouTube host permission is required because the extension's content script needs to run on YouTube pages and apply local CSS that hides or blurs spoiler-prone interface elements. A small script in the page context keeps the live-stream guard in sync with YouTube's player and stops YouTube from passing titles, artwork, and the playback position to the browser's media controls while protection is on.

The extension does not use this permission to collect, transmit, sell, or share YouTube browsing activity.

## Remote Code Declaration

Anti-Spoiler for YouTube does not load or execute remote code. All JavaScript, CSS, HTML, and image assets are packaged with the extension.
