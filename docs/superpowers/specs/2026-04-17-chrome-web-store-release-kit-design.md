# Chrome Web Store Release Kit Design

## Goal

Prepare the extension repository for a first Chrome Web Store submission in English.

## Scope

The release kit includes a production ZIP, dashboard-ready listing text, privacy text, permission justifications, reviewer notes, and a release checklist. It does not create or host an external privacy policy URL, because that requires an external site or account.

## Approach

Keep the extension runtime unchanged. Add store-facing documentation under `store/` and a local release packaging script under `scripts/`. The ZIP package must include only runtime files and place `manifest.json` at the root.

The release flow is:

1. Run the test suite.
2. Run the release build script.
3. Upload the generated ZIP in Chrome Developer Dashboard.
4. Copy the prepared listing, privacy, permission, and reviewer text into the dashboard.
5. Publish only after manual local testing in Chrome succeeds.

## Files

- `store/listing.md`: English Chrome Web Store listing copy.
- `store/privacy.md`: English privacy policy draft and dashboard data-use notes.
- `store/permissions.md`: permission and host-permission justifications.
- `store/reviewer-notes.md`: reviewer testing instructions.
- `store/release-checklist.md`: dashboard checklist.
- `store/package-contents.md`: package include/exclude rules.
- `scripts/build-release.ps1`: repeatable ZIP builder.
- `tests/release.test.js`: release kit and ZIP packaging tests.
- `package.json`: npm script for release build.
- `.gitignore`: ignore generated `dist/` release artifacts.

## Acceptance Criteria

- `npm test` passes.
- `npm run build:release` creates `dist/youtube-anti-spoiler-extension-0.1.0.zip`.
- The ZIP contains `manifest.json` at the root plus runtime `icons/`, `popup/`, and `src/` files.
- The ZIP excludes `.git/`, `tests/`, `docs/`, `store/`, `scripts/`, `package.json`, and generated artifacts.
- Store documents are written in English and include privacy, permissions, reviewer, and listing material.
