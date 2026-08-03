const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const rootPath = path.join(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(rootPath, relativePath), "utf8");
}

function getZipEntryNames(zipPath) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "yas-release-"));

  try {
    execFileSync("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replaceAll("'", "''")}' -DestinationPath '${tempDirectory.replaceAll("'", "''")}' -Force`,
    ], {
      cwd: rootPath,
      stdio: "pipe",
    });

    return fs.readdirSync(tempDirectory, { recursive: true })
      .map((entry) => entry.replaceAll("\\", "/"))
      .sort();
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

test("store release documents cover Chrome Web Store dashboard fields", () => {
  const expectedDocuments = [
    "listing.md",
    "privacy.md",
    "permissions.md",
    "reviewer-notes.md",
    "release-checklist.md",
    "package-contents.md",
  ];

  expectedDocuments.forEach((fileName) => {
    const content = readText(path.join("store", fileName));

    assert.match(content, /Anti-Spoiler for YouTube/);
    assert.doesNotMatch(content, /TODO|TBD|placeholder/i);
  });

  assert.match(readText("store/listing.md"), /Chrome Web Store Listing/);
  assert.match(readText("store/privacy.md"), /Privacy Policy/);
  assert.match(readText("docs/privacy.md"), /permalink: \/privacy\//);
  assert.doesNotMatch(readText("docs/privacy.md"), /Chrome Web Store Dashboard Notes/);
  assert.match(readText("store/permissions.md"), /storage/);
  assert.match(readText("store/permissions.md"), /https:\/\/www\.youtube\.com\/\*/);
  assert.match(readText("store/reviewer-notes.md"), /Load unpacked/);
  assert.match(readText("store/release-checklist.md"), /Privacy/);
  assert.match(readText("store/package-contents.md"), /manifest\.json/);
});

test("project declares a release build script and ignores generated dist artifacts", () => {
  const packageJson = JSON.parse(readText("package.json"));

  assert.equal(
    packageJson.scripts["build:release"],
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1",
  );
  assert.match(readText(".gitignore"), /^dist\/$/m);
});

test("release build script creates a runtime-only Chrome Web Store zip", () => {
  execFileSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootPath, "scripts", "build-release.ps1"),
  ], {
    cwd: rootPath,
    stdio: "pipe",
  });

  const manifest = JSON.parse(readText("manifest.json"));
  const zipPath = path.join(
    rootPath,
    "dist",
    `youtube-anti-spoiler-extension-${manifest.version}.zip`,
  );
  const entries = getZipEntryNames(zipPath);

  assert.equal(fs.existsSync(zipPath), true);
  assert.ok(entries.includes("manifest.json"));
  assert.ok(entries.includes("popup/popup.html"));
  assert.ok(entries.includes("popup/popup.css"));
  assert.ok(entries.includes("popup/popup.js"));
  assert.ok(entries.includes("src/shared/settings.js"));
  assert.ok(entries.includes("src/content/content.js"));
  assert.ok(entries.includes("src/content/live-player-bridge.js"));
  assert.ok(entries.includes("src/background/background.js"));
  assert.ok(entries.includes("icons/icon128.png"));
  assert.ok(entries.includes("icons/icon-disabled128.png"));

  [
    ".git",
    "tests",
    "docs",
    "store",
    "scripts",
    "dist",
    "package.json",
    "package-lock.json",
  ].forEach((excludedEntry) => {
    assert.equal(
      entries.some((entry) => entry === excludedEntry || entry.startsWith(`${excludedEntry}/`)),
      false,
      `${excludedEntry} should not be packaged`,
    );
  });
});
