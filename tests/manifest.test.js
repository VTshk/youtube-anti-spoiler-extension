const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("manifest declares a Chrome MV3 YouTube content script with storage permission", () => {
  const manifestPath = path.join(__dirname, "..", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Anti-Spoiler for YouTube");
  // The MAIN-world content script needs Chrome 111+; without this floor the
  // bridge silently loads isolated on older Chrome and the live guard degrades.
  assert.equal(manifest.minimum_chrome_version, "111");
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://www.youtube.com/*"]);
  assert.equal(manifest.action.default_popup, "popup/popup.html");
  assert.equal(manifest.action.default_title, "Anti-Spoiler for YouTube");
  assert.deepEqual(manifest.background, {
    service_worker: "src/background/background.js",
  });
  assert.deepEqual(manifest.icons, {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  });

  const iconSourcePath = path.join(__dirname, "..", "icons", "icon.svg");
  const iconSource = fs.readFileSync(iconSourcePath, "utf8");
  assert.match(iconSource, /viewBox="0 0 149 81"/);
  assert.match(iconSource, /x="0" y="0" width="149" height="81" rx="30" fill="#c85252"/);
  assert.match(iconSource, /M65 21v27l25-13\.5L65 21Z/);
  assert.match(iconSource, /x="0" y="35" width="149" height="30" fill="#222222"/);
  assert.match(iconSource, />ANTI-SPOILER</);
  assert.doesNotMatch(iconSource, /YouTube Anti-Spoiler/);
  assert.doesNotMatch(iconSource, /M45 27c15 11 44 11 59 0/);
  assert.doesNotMatch(iconSource, /SPOILER GUARD/);
  assert.doesNotMatch(iconSource, /width="184" height="121" rx="24" fill="#222222"/);

  [
    "icon-disabled16.png",
    "icon-disabled32.png",
    "icon-disabled48.png",
    "icon-disabled128.png",
  ].forEach((fileName) => {
    const disabledIconPath = path.join(__dirname, "..", "icons", fileName);
    assert.equal(fs.existsSync(disabledIconPath), true, `${fileName} should exist`);
  });

  const [playerBridgeScript, contentScript] = manifest.content_scripts;
  assert.deepEqual(playerBridgeScript.matches, ["https://www.youtube.com/*"]);
  assert.deepEqual(playerBridgeScript.js, [
    "src/content/live-player-bridge.js",
  ]);
  assert.equal(playerBridgeScript.run_at, "document_start");
  assert.equal(playerBridgeScript.world, "MAIN");

  assert.deepEqual(contentScript.matches, ["https://www.youtube.com/*"]);
  assert.deepEqual(contentScript.js, [
    "src/shared/settings.js",
    "src/content/live-start-controller.js",
    "src/content/content.js",
  ]);
  assert.equal(contentScript.run_at, "document_start");
});
