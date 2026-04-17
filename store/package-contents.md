# Package Contents - Anti-Spoiler for YouTube

The Chrome Web Store ZIP package should contain only runtime extension files.

## Included

- `manifest.json`
- `icons/`
- `popup/`
- `src/`

## Excluded

- `.git/`
- `dist/`
- `docs/`
- `store/`
- `scripts/`
- `tests/`
- `.gitignore`
- `package.json`
- `package-lock.json`
- temporary logs and local preview artifacts

## Output

The release script creates:

`dist/youtube-anti-spoiler-extension-0.1.0.zip`

The ZIP must have `manifest.json` at the root.
