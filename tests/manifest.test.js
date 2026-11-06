const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { en } = require("./helpers/english-messages.js");

test("manifest declares a Chrome MV3 YouTube content script with storage permission", () => {
  const manifestPath = path.join(__dirname, "..", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  // Chrome fills the name in from _locales; English is the default.
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_manifestName__");
  assert.equal(en("manifestName"), "Anti-Spoiler for YouTube");
  // The MAIN-world content script needs Chrome 111+; without this floor the
  // bridge silently loads isolated on older Chrome and the live guard degrades.
  assert.equal(manifest.minimum_chrome_version, "111");
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://www.youtube.com/*"]);
  assert.equal(manifest.action.default_popup, "popup/popup.html");
  assert.equal(manifest.action.default_title, "__MSG_manifestName__");
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
    // Before every script that shows text.
    "src/shared/i18n.js",
    "src/content/live-start-controller.js",
    "src/content/skip-buttons.js",
    "src/content/reveal-button.js",
    "src/content/content.js",
  ]);
  assert.equal(contentScript.run_at, "document_start");
});

test("manifest declares the protection shortcut without new permissions", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));

  assert.deepEqual(manifest.commands["toggle-protection"].suggested_key, { default: "Alt+Shift+S" });
  assert.equal(manifest.commands["toggle-protection"].description, "__MSG_manifestToggleCommand__");
  assert.equal(en("manifestToggleCommand"), "Turn spoiler protection on or off");
  assert.deepEqual(manifest.commands["reveal-video"].suggested_key, { default: "Alt+Shift+V" });
  assert.equal(manifest.commands["reveal-video"].description, "__MSG_manifestRevealCommand__");
  assert.equal(en("manifestRevealCommand"), "Show or hide spoilers for the open video");
  assert.deepEqual(manifest.permissions, ["storage"]);
  // The popup stores the chosen language's texts, so content scripts need
  // no access to packaged files.
  assert.equal(manifest.web_accessible_resources, undefined);
});
