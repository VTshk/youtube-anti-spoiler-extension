# Chrome Web Store Release Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a store-ready release kit and ZIP package for the extension.

**Architecture:** Keep runtime code unchanged. Add a PowerShell packaging script that copies only runtime files into a temporary staging directory, compresses that staging directory into `dist/`, and leaves dashboard copy in `store/`.

**Tech Stack:** Chrome Manifest V3, PowerShell `Compress-Archive`, Node `node:test`, Markdown store docs.

---

### Task 1: Release Kit Tests

**Files:**
- Create: `tests/release.test.js`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing tests**

```js
test("store release documents cover Chrome Web Store dashboard fields", () => {
  [
    "listing.md",
    "privacy.md",
    "permissions.md",
    "reviewer-notes.md",
    "release-checklist.md",
    "package-contents.md",
  ].forEach((fileName) => {
    const content = fs.readFileSync(path.join(rootPath, "store", fileName), "utf8");
    assert.match(content, /Anti-Spoiler for YouTube/);
  });
});

test("release build script creates a runtime-only zip", () => {
  execFileSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootPath, "scripts", "build-release.ps1"),
  ]);

  const zipPath = path.join(rootPath, "dist", "youtube-anti-spoiler-extension-0.1.0.zip");
  assert.equal(fs.existsSync(zipPath), true);
});
```

- [ ] **Step 2: Run release test to verify it fails**

Run: `node --test tests/release.test.js`

Expected: fail because `store/` docs and build script do not exist.

### Task 2: Store Documentation

**Files:**
- Create: `store/listing.md`
- Create: `store/privacy.md`
- Create: `store/permissions.md`
- Create: `store/reviewer-notes.md`
- Create: `store/release-checklist.md`
- Create: `store/package-contents.md`

- [ ] **Step 1: Add English dashboard copy**

Write concise text for the store listing, privacy policy draft, permission justifications, reviewer instructions, release checklist, and package rules.

### Task 3: Release Builder

**Files:**
- Create: `scripts/build-release.ps1`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add build script**

Create a script that reads the version from `manifest.json`, stages only runtime files, and creates `dist/youtube-anti-spoiler-extension-<version>.zip`.

- [ ] **Step 2: Add npm script**

Add:

```json
"build:release": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1"
```

- [ ] **Step 3: Ignore generated release artifacts**

Add `dist/` to `.gitignore`.

### Task 4: Verification

**Files:**
- Test only

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Build release ZIP**

Run: `npm run build:release`

Expected: `dist/youtube-anti-spoiler-extension-0.1.0.zip` exists.

- [ ] **Step 3: Inspect ZIP contents**

Run a command that lists the archive and confirm `manifest.json` is at the root and no source-control, test, docs, store, or script files are included.
