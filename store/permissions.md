# Permissions - Anti-Spoiler for YouTube

## Single Purpose

Anti-Spoiler for YouTube hides spoiler-prone YouTube interface elements, such as durations, progress bars, and video previews, so users can watch result-sensitive videos without accidental spoilers.

## `storage`

The `storage` permission is required to save the user's extension settings:

- whether protection is enabled;
- whether time indicators should be hidden;
- whether progress bars should be hidden;
- whether video previews should be blurred.

The extension uses `chrome.storage.sync` so settings persist across browser sessions and can sync with the user's Chrome profile.

## `https://www.youtube.com/*`

The YouTube host permission is required because the extension's content script needs to run on YouTube pages and apply local CSS that hides or blurs spoiler-prone interface elements.

The extension does not use this permission to collect, transmit, sell, or share YouTube browsing activity.

## Remote Code Declaration

Anti-Spoiler for YouTube does not load or execute remote code. All JavaScript, CSS, HTML, and image assets are packaged with the extension.
