# Release Checklist - Anti-Spoiler for YouTube

## Local Verification

- Run `npm test`.
- Run `npm run build:release`.
- Load the project folder as an unpacked extension in Chrome.
- Open YouTube and verify each popup setting.
- Verify that the toolbar icon switches to gray when protection is off and back to color when protection is on.
- Verify that there are no extension errors in `chrome://extensions`.

## Package

- Upload `dist/youtube-anti-spoiler-extension-0.1.0.zip`.
- Confirm `manifest.json` is at the ZIP root.
- Confirm the uploaded version matches `manifest.json`.

## Store Listing

- Copy the name, short description, detailed description, category suggestion, and keywords from `store/listing.md`.
- Upload screenshots or promotional images in the Chrome Developer Dashboard.
- Include the statement that the extension is not affiliated with YouTube or Google.

## Privacy

- Copy the single purpose and permission justifications from `store/permissions.md`.
- Select that Anti-Spoiler for YouTube does not collect user data.
- Select that the extension does not use remote code.
- Publish `docs/privacy.md` at a public URL and add that URL to the dashboard.

## Distribution

- Choose the intended visibility.
- Choose the intended countries or regions.
- Confirm the extension is free unless a paid distribution model is intentionally configured.

## Test Instructions

- Copy reviewer instructions from `store/reviewer-notes.md`.
- Submit for review only after the local verification steps pass.
