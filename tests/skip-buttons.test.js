const assert = require("node:assert/strict");
const test = require("node:test");

const { en, installEnglishI18n } = require("./helpers/english-messages.js");

// The button labels come from _locales/en through chrome.i18n.
installEnglishI18n();

const skipButtons = require("../src/content/skip-buttons.js");
const content = require("../src/content/content.js");

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    listeners: {},
    textContent: "",
    title: "",
    type: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    querySelector(selector) {
      assert.equal(selector.startsWith("."), true, `class selector expected, got ${selector}`);
      const className = selector.slice(1);
      const queue = [...this.children];

      while (queue.length > 0) {
        const candidate = queue.shift();

        if (candidate.className.split(" ").includes(className)) {
          return candidate;
        }

        queue.push(...candidate.children);
      }

      return null;
    },
  };
}

function createPlayerDocument({ controls = createElement("div"), video = null } = {}) {
  return {
    controls,
    video,
    createElement,
    querySelector(selector) {
      if (selector === "#movie_player .ytp-left-controls") {
        return this.controls;
      }

      if (selector === "#movie_player video") {
        return this.video;
      }

      return null;
    },
  };
}

function createVideo({ currentTime, duration = NaN, seekable = { length: 0 } }) {
  return { currentTime, duration, seekable };
}

function createSeekable(start, end) {
  return {
    length: 1,
    start(index) {
      assert.equal(index, 0);
      return start;
    },
    end(index) {
      assert.equal(index, 0);
      return end;
    },
  };
}

function clickButton(button) {
  const calls = { preventDefault: 0, stopPropagation: 0 };

  button.listeners.click({
    preventDefault() {
      calls.preventDefault += 1;
    },
    stopPropagation() {
      calls.stopPropagation += 1;
    },
  });

  return calls;
}

function findButton(doc, seconds) {
  const container = doc.controls.querySelector(`.${skipButtons.SKIP_BUTTONS_CLASS}`);
  return container.children.find(
    (button) => button.dataset.skipSeconds === String(seconds),
  );
}

test("skip buttons are inserted once into the player's left controls", () => {
  const doc = createPlayerDocument();

  assert.equal(skipButtons.ensureSkipButtons(doc), true);
  assert.equal(skipButtons.ensureSkipButtons(doc), true);

  assert.equal(doc.controls.children.length, 1);
  const container = doc.controls.children[0];
  assert.equal(container.className, skipButtons.SKIP_BUTTONS_CLASS);
  assert.deepEqual(
    container.children.map((button) => button.textContent),
    ["−10m", "−1m", "+1m", "+10m"],
  );
  assert.deepEqual(
    container.children.map((button) => button.dataset.skipSeconds),
    ["-600", "-60", "60", "600"],
  );
  container.children.forEach((button) => {
    assert.equal(button.type, "button");
    assert.equal(typeof button.attributes["aria-label"], "string");
  });
});

test("skip buttons wait for the player controls to exist", () => {
  const doc = createPlayerDocument({ controls: null });

  assert.equal(skipButtons.ensureSkipButtons(doc), false);
});

test("skip buttons come back after YouTube rebuilds the player controls", () => {
  const doc = createPlayerDocument();

  skipButtons.ensureSkipButtons(doc);
  doc.controls = createElement("div");
  skipButtons.ensureSkipButtons(doc);

  assert.equal(doc.controls.children.length, 1);
  assert.equal(doc.controls.children[0].className, skipButtons.SKIP_BUTTONS_CLASS);
});

test("skip button click seeks the player's video and does not reach the player", () => {
  const video = createVideo({ currentTime: 100, duration: 1000 });
  const doc = createPlayerDocument({ video });

  skipButtons.ensureSkipButtons(doc);

  const calls = clickButton(findButton(doc, 60));

  assert.equal(video.currentTime, 160);
  assert.deepEqual(calls, { preventDefault: 1, stopPropagation: 1 });

  clickButton(findButton(doc, -60));
  assert.equal(video.currentTime, 100);
});

test("skip button click without a video does nothing", () => {
  const doc = createPlayerDocument({ video: null });

  skipButtons.ensureSkipButtons(doc);

  const calls = clickButton(findButton(doc, 60));

  assert.deepEqual(calls, { preventDefault: 1, stopPropagation: 1 });
});

test("skipVideo keeps a regular video between 0 and its duration", () => {
  const video = createVideo({ currentTime: 30, duration: 500 });

  assert.equal(skipButtons.skipVideo(video, -600), true);
  assert.equal(video.currentTime, 0);

  video.currentTime = 450;
  skipButtons.skipVideo(video, 600);
  assert.equal(video.currentTime, 500);
});

test("skipVideo keeps a live stream inside its seekable window", () => {
  const video = createVideo({
    currentTime: 1000,
    duration: Infinity,
    seekable: createSeekable(400, 1200),
  });

  skipButtons.skipVideo(video, -600);
  assert.equal(video.currentTime, 400);

  skipButtons.skipVideo(video, 600);
  assert.equal(video.currentTime, 1000);

  skipButtons.skipVideo(video, 600);
  assert.equal(video.currentTime, 1200);
});

test("getSkipBounds uses the last seekable range end", () => {
  const video = createVideo({
    currentTime: 0,
    duration: 900,
    seekable: {
      length: 2,
      start(index) {
        return [5, 300][index];
      },
      end(index) {
        return [200, 880][index];
      },
    },
  });

  assert.deepEqual(skipButtons.getSkipBounds(video), { start: 5, end: 880 });
});

test("skipVideo does nothing before the video knows its length", () => {
  const video = createVideo({ currentTime: 0, duration: NaN });

  assert.equal(skipButtons.skipVideo(video, 10), false);
  assert.equal(video.currentTime, 0);
});

test("skip buttons are hidden by default and shown only with a hidden timeline, no live guard, and a seekable player", () => {
  const css = content.buildSpoilerCss();
  const containerSelector = `#movie_player .${skipButtons.SKIP_BUTTONS_CLASS}`;
  // The page-world bridge marks the player when a live stream without
  // rewinding refuses every seek; the buttons would be dead there.
  // No setting of their own: they come with the hidden progress bar, so an
  // uncovered video, whose timeline is visible, has none.
  const showSelector =
    "html.yas-extension-enabled.yas-hide-player-progress-bar" +
    `:not(.${content.LIVE_START_OBSCURED_CLASS})` +
    `:not(.${content.REVEAL_VIDEO_CLASS}) ` +
    `#movie_player:not(.ad-showing):not([data-yas-seek-blocked]):not([data-yas-fit~="no-skip"]) .${skipButtons.SKIP_BUTTONS_CLASS}`;

  assert.equal(content.LIVE_START_OBSCURED_CLASS, "yas-live-start-obscured");
  assert.match(
    css,
    new RegExp(`(^|\\n)${escapeRegExp(containerSelector)} \\{\\n  display: none !important;`),
  );
  assert.match(
    css,
    new RegExp(`(^|\\n)${escapeRegExp(showSelector)} \\{\\n  display: inline-flex !important;`),
  );
  assert.doesNotMatch(css, /yas-show-skip-buttons/);
});

test("skip buttons follow the progress bar setting and the protection switch", () => {
  assert.equal(Object.prototype.hasOwnProperty.call(content.CLASS_BY_SETTING, "showSkipButtons"), false);
  assert.ok(content.getEnabledClassNames({ extensionEnabled: true }).includes("yas-hide-player-progress-bar"));
  assert.equal(
    content.getEnabledClassNames({ extensionEnabled: true, hidePlayerProgressBar: false })
      .includes("yas-hide-player-progress-bar"),
    false,
  );
  // An old stored value of the removed setting adds no class.
  assert.equal(
    content.getEnabledClassNames({ extensionEnabled: true, showSkipButtons: true })
      .includes("yas-show-skip-buttons"),
    false,
  );
  assert.deepEqual(content.getEnabledClassNames({ extensionEnabled: false }), []);
});

test("skip buttons hide while an ad plays, so they never seek the ad", () => {
  const css = content.buildSpoilerCss();
  const showRule = css.split("\n").find((line) => line.includes(`.${skipButtons.SKIP_BUTTONS_CLASS} {`) && line.startsWith("html."));

  assert.ok(showRule, "the rule that shows the skip buttons");
  assert.match(showRule, /#movie_player:not\(\.ad-showing\)/);
});

test("skip buttons are drawn like YouTube's player pills, with hover and a focus ring", () => {
  const css = content.buildSpoilerCss();
  const buttonSelector = `#movie_player .${skipButtons.SKIP_BUTTONS_CLASS} .yas-skip-button`;
  const ruleOf = (selector) => {
    const match = css.match(new RegExp(`(^|\\n)${escapeRegExp(selector)} \\{([^}]*)\\}`));
    assert.ok(match, selector);
    return match[2];
  };
  const containerRule = css.match(/yas-skip-buttons \{\n  display: inline-flex !important;([^}]*)\}/)[1];

  assert.match(containerRule, /height: 40px !important;/);
  assert.match(containerRule, /border-radius: 28px !important;/);
  assert.match(containerRule, /background: rgba\(0, 0, 0, 0\.3\) !important;/);
  assert.match(ruleOf(buttonSelector), /font-size: 14px !important;/);
  assert.match(ruleOf(buttonSelector), /font-weight: 500 !important;/);
  assert.match(ruleOf(buttonSelector), /color: #ffffff !important;/);
  assert.match(ruleOf(`${buttonSelector}:hover`), /background: rgba\(255, 255, 255, 0\.1\) !important;/);
  assert.match(ruleOf(`${buttonSelector}:focus-visible`), /outline: 2px solid #ffffff !important;/);
});

// A player whose left controls need less room with each fit step: the
// width the steps leave is what the real CSS would leave.
function createFitPlayer(availableWidth) {
  const neededWidth = { "": 400, compact: 370, "compact no-eye": 320, "compact no-eye short": 280, "compact no-eye short no-skip": 110 };
  const player = {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelector(selector) { return selector === ".ytp-left-controls" ? controls : null; },
  };
  const controls = {
    clientWidth: availableWidth,
    get scrollWidth() { return neededWidth[player.attributes["data-yas-fit"] || ""]; },
  };
  const doc = { querySelector: (selector) => (selector === "#movie_player" ? player : null) };
  return { doc, player };
}

test("on a narrow player the buttons give way step by step until they fit", () => {
  const fits = (availableWidth) => {
    const { doc, player } = createFitPlayer(availableWidth);
    player.attributes["data-yas-fit"] = "compact no-eye";
    skipButtons.fitPlayerButtons(doc);
    return player.attributes["data-yas-fit"];
  };

  // A wide player drops an earlier fit: everything is shown again.
  assert.equal(fits(500), undefined);
  assert.equal(fits(380), "compact");
  assert.equal(fits(330), "compact no-eye");
  assert.equal(fits(300), "compact no-eye short");
  assert.equal(fits(200), "compact no-eye short no-skip");
  // Nothing more to take away: the last step stays.
  assert.equal(fits(50), "compact no-eye short no-skip");
});

test("the fit steps tighten the pills, drop the eye, then ±10m, then the skip buttons", () => {
  const css = content.buildSpoilerCss();

  const has = (text) => assert.ok(css.includes(text), text);

  has('#movie_player[data-yas-fit~="compact"] .yas-skip-buttons .yas-skip-button {\n  padding: 0 5px !important;');
  has(
    '#movie_player[data-yas-fit~="short"] .yas-skip-buttons .yas-skip-button[data-skip-seconds="-600"],\n' +
      '#movie_player[data-yas-fit~="short"] .yas-skip-buttons .yas-skip-button[data-skip-seconds="600"] {\n' +
      "  display: none !important;",
  );
  has("#movie_player .yas-skip-buttons,\n#movie_player .yas-reveal-button {\n  flex-shrink: 0 !important;");
});

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
