const assert = require("node:assert/strict");
const test = require("node:test");

const content = require("../src/content/content.js");

// Settings for these tests: the live guard and its chat cover stay off, so
// only the comments guard and the tab title are in play.
const BASE_SETTINGS = Object.freeze({
  extensionEnabled: true,
  startLiveFromBeginning: false,
});

function createClassList() {
  const classes = new Set();

  return {
    add(className) {
      classes.add(className);
    },
    remove(className) {
      classes.delete(className);
    },
    contains(className) {
      return classes.has(className);
    },
  };
}

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    className: "",
    dataset: {},
    id: "",
    listeners: {},
    parentNode: null,
    textContent: "",
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    remove() {
      if (!this.parentNode) {
        return;
      }

      this.parentNode.children = this.parentNode.children.filter(
        (child) => child !== this,
      );
      this.parentNode = null;
    },
    findById(id) {
      const queue = [...this.children];

      while (queue.length > 0) {
        const candidate = queue.shift();

        if (candidate.id === id) {
          return candidate;
        }

        queue.push(...candidate.children);
      }

      return null;
    },
    findByClass(className) {
      return this.findAllByClass(className)[0] || null;
    },
    findAllByClass(className) {
      const found = [];
      const queue = [...this.children];

      while (queue.length > 0) {
        const candidate = queue.shift();

        if (candidate.className === className) {
          found.push(candidate);
        }

        queue.push(...candidate.children);
      }

      return found;
    },
    // The two child lookups the comments panel cover makes.
    querySelector(selector) {
      if (selector === ":scope > #content") {
        return this.children.find((child) => child.id === "content") || null;
      }

      if (selector === `:scope > .${OVERLAY_CLASS}`) {
        return this.children.find((child) => child.className === OVERLAY_CLASS) || null;
      }

      return null;
    },
  };
}

const OVERLAY_CLASS = "yas-comments-guard-overlay";
const COMMENTS_PANEL_SELECTOR =
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]';

function createPage({
  comments = null,
  panels = [],
  titleElement = null,
  title = "",
} = {}) {
  const body = createElement("body");
  const head = createElement("head");

  if (comments) {
    body.appendChild(comments);
  }

  panels.forEach((commentsPanel) => body.appendChild(commentsPanel));

  return {
    body,
    head,
    comments,
    panels,
    titleElement,
    title,
    documentElement: {
      classList: createClassList(),
      appendChild(child) {
        return head.appendChild(child);
      },
    },
    createElement,
    getElementById(id) {
      return body.findById(id) || head.findById(id);
    },
    // Comments panels and comments covers; no hovered or stashed titles in
    // these pages.
    querySelectorAll(selector) {
      if (selector === COMMENTS_PANEL_SELECTOR) {
        return this.panels;
      }

      if (selector === `.${OVERLAY_CLASS}`) {
        return body.findAllByClass(OVERLAY_CLASS);
      }

      return [];
    },
    querySelector(selector) {
      if (selector === "ytd-comments#comments") {
        return this.comments;
      }

      if (selector === "title") {
        return this.titleElement;
      }

      return null;
    },
  };
}

function createComments() {
  const comments = createElement("ytd-comments");
  comments.id = "comments";
  return comments;
}

// The comments panel as measured live (2026-11-05), on /watch and Shorts:
// #header (title, sort, Close) and #content with the comment list.
function createCommentsPanel() {
  const commentsPanel = createElement("ytd-engagement-panel-section-list-renderer");
  const header = createElement("div");
  header.id = "header";
  const panelContent = createElement("div");
  panelContent.id = "content";
  panelContent.appendChild(createElement("ytd-section-list-renderer"));
  commentsPanel.appendChild(header);
  commentsPanel.appendChild(panelContent);
  return commentsPanel;
}

function getPanelContent(commentsPanel) {
  return commentsPanel.children.find((child) => child.id === "content");
}

function getPanelOverlays(commentsPanel) {
  return getPanelContent(commentsPanel).children.filter(
    (child) => child.className === OVERLAY_CLASS,
  );
}

function clickShowCommentsIn(overlay) {
  const button = overlay.findByClass("yas-comments-guard-panel")
    .children.find((child) => child.dataset.commentsGuardAction === "show");

  button.listeners.click({ preventDefault() {} });
}

function captureTimers() {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];

  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, done: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    timer.done = true;
  };

  return {
    pending() {
      return timers.filter((timer) => !timer.done);
    },
    runPending() {
      this.pending().forEach((timer) => {
        timer.done = true;
        timer.callback();
      });
    },
    restore() {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

// Runs a test body on a YouTube URL with captured timers, then leaves the
// module-level guards switched off for the next test.
function onPage(href, body) {
  const timers = captureTimers();
  globalThis.location = { href };

  try {
    body(timers);
  } finally {
    delete globalThis.location;
    content.applySettings(BASE_SETTINGS, createPage());
    timers.restore();
  }
}

function getCommentsOverlay(doc) {
  return doc.getElementById(content.COMMENTS_GUARD_OVERLAY_ID);
}

function isCommentsObscured(doc) {
  return doc.documentElement.classList.contains(content.COMMENTS_GUARD_OBSCURED_CLASS);
}

function clickShowComments(doc) {
  const button = getCommentsOverlay(doc).findByClass("yas-comments-guard-panel")
    .children.find((child) => child.dataset.commentsGuardAction === "show");

  button.listeners.click({ preventDefault() {} });
}

// --- F3: comments behind "Show comments" ---

test("comments guard blurs comments under a video behind a Show comments button", () => {
  onPage("https://www.youtube.com/watch?v=match-1", () => {
    const doc = createPage({ comments: createComments() });

    content.applySettings(BASE_SETTINGS, doc);

    assert.equal(isCommentsObscured(doc), true);
    const overlay = getCommentsOverlay(doc);
    assert.equal(overlay.parentNode, doc.comments);

    const panel = overlay.findByClass("yas-comments-guard-panel");
    assert.equal(panel.findByClass("yas-comments-guard-title").textContent, "Comments hidden");
    assert.equal(
      panel.children.find((child) => child.dataset.commentsGuardAction === "show").textContent,
      "Show comments",
    );
  });
});

test("comments guard CSS blurs the comment list and the comment teaser only while obscured", () => {
  const css = content.buildSpoilerCss();

  assert.equal(content.COMMENTS_GUARD_OBSCURED_CLASS, "yas-comments-obscured");
  assert.equal(content.COMMENTS_GUARD_OVERLAY_ID, "youtube-anti-spoiler-comments-guard");
  assert.match(
    css,
    /html\.yas-comments-obscured ytd-comments#comments #contents \{\n  filter: blur\(18px\) !important;\n  pointer-events: none !important;/,
  );
  assert.match(
    css,
    /html\.yas-comments-obscured ytd-comments-entry-point-header-renderer \{\n  filter: blur\(18px\) !important;\n\}/,
  );
  // Every cover shares one look; only the one under the video keeps its
  // button in view while the page scrolls.
  assert.match(css, /(^|\n)\.yas-comments-guard-overlay \{\n  position: absolute !important;\n  inset: 0 !important;/);
  assert.match(
    css,
    /#youtube-anti-spoiler-comments-guard \.yas-comments-guard-panel \{\n  position: sticky !important;/,
  );
});

test("Show comments uncovers this video's comments and stops the checks", () => {
  onPage("https://www.youtube.com/watch?v=match-1", (timers) => {
    const doc = createPage({ comments: createComments() });

    content.applySettings(BASE_SETTINGS, doc);
    clickShowComments(doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getCommentsOverlay(doc), null);
    assert.equal(timers.pending().length, 0);

    // A refresh on the same video keeps the choice.
    content.applySettings(BASE_SETTINGS, doc);
    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getCommentsOverlay(doc), null);
  });
});

test("comments guard covers the comments again on the next video", () => {
  onPage("https://www.youtube.com/watch?v=match-1", () => {
    const doc = createPage({ comments: createComments() });

    content.applySettings(BASE_SETTINGS, doc);
    clickShowComments(doc);

    globalThis.location = { href: "https://www.youtube.com/watch?v=match-2" };
    content.applySettings(BASE_SETTINGS, doc);

    assert.equal(isCommentsObscured(doc), true);
    assert.equal(getCommentsOverlay(doc).parentNode, doc.comments);
  });
});

test("comments guard stays off when the setting or protection is off", () => {
  onPage("https://www.youtube.com/watch?v=match-1", (timers) => {
    const doc = createPage({ comments: createComments() });

    content.applySettings(BASE_SETTINGS, doc);
    content.applySettings({ ...BASE_SETTINGS, hideComments: false }, doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getCommentsOverlay(doc), null);
    assert.equal(timers.pending().length, 0);

    content.applySettings({ ...BASE_SETTINGS, extensionEnabled: false }, doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getCommentsOverlay(doc), null);
    assert.equal(timers.pending().length, 0);
  });
});

test("comments guard does not run or schedule checks outside video pages", () => {
  onPage("https://www.youtube.com/feed/subscriptions", (timers) => {
    const doc = createPage({ comments: createComments() });

    content.applySettings(BASE_SETTINGS, doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getCommentsOverlay(doc), null);
    assert.equal(timers.pending().length, 0);
  });
});

test("comments guard checks once a second for lazily loaded and re-created comments", () => {
  onPage("https://www.youtube.com/watch?v=match-1", (timers) => {
    const doc = createPage();

    content.applySettings(BASE_SETTINGS, doc);

    // The comments section has not rendered yet.
    assert.equal(isCommentsObscured(doc), true);
    assert.equal(getCommentsOverlay(doc), null);
    assert.deepEqual(timers.pending().map((timer) => timer.delay), [1000]);

    doc.comments = createComments();
    doc.body.appendChild(doc.comments);
    timers.runPending();

    assert.equal(getCommentsOverlay(doc).parentNode, doc.comments);
    assert.deepEqual(timers.pending().map((timer) => timer.delay), [1000]);

    // YouTube re-creates the section; the overlay went with the old one.
    doc.comments.remove();
    doc.comments = createComments();
    doc.body.appendChild(doc.comments);
    timers.runPending();

    assert.equal(getCommentsOverlay(doc).parentNode, doc.comments);

    // Leaving the video page ends the checks and the cover.
    globalThis.location = { href: "https://www.youtube.com/" };
    timers.runPending();

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getCommentsOverlay(doc), null);
    assert.equal(timers.pending().length, 0);
  });
});

// --- Portion 5: the comments panel on /watch and on Shorts ---

test("comments guard covers the comments panel on a Short", () => {
  onPage("https://www.youtube.com/shorts/short-1", (timers) => {
    const commentsPanel = createCommentsPanel();
    const doc = createPage({ panels: [commentsPanel] });

    content.applySettings(BASE_SETTINGS, doc);

    assert.equal(isCommentsObscured(doc), true);
    const overlays = getPanelOverlays(commentsPanel);
    assert.equal(overlays.length, 1);
    const panel = overlays[0].findByClass("yas-comments-guard-panel");
    assert.equal(panel.findByClass("yas-comments-guard-title").textContent, "Comments hidden");
    assert.equal(
      panel.children.find((child) => child.dataset.commentsGuardAction === "show").textContent,
      "Show comments",
    );
    // The header (title, sort, Close) stays uncovered.
    assert.equal(commentsPanel.children[0].children.length, 0);
    assert.deepEqual(timers.pending().map((timer) => timer.delay), [1000]);
  });
});

test("comments guard covers every comments panel on /watch once, next to the comments under the video", () => {
  onPage("https://www.youtube.com/watch?v=match-1", (timers) => {
    // SPA moves leave a hidden earlier panel in the document.
    const openPanel = createCommentsPanel();
    const hiddenPanel = createCommentsPanel();
    const doc = createPage({ comments: createComments(), panels: [openPanel, hiddenPanel] });

    content.applySettings(BASE_SETTINGS, doc);
    content.applySettings(BASE_SETTINGS, doc);
    timers.runPending();

    assert.equal(getCommentsOverlay(doc).parentNode, doc.comments);
    assert.equal(getPanelOverlays(openPanel).length, 1);
    assert.equal(getPanelOverlays(hiddenPanel).length, 1);
    // The cover sits next to the blurred list, not inside it.
    assert.equal(getPanelOverlays(openPanel)[0].parentNode, getPanelContent(openPanel));
    assert.equal(getPanelContent(openPanel).children[0].tagName, "YTD-SECTION-LIST-RENDERER");
    assert.equal(getPanelContent(openPanel).children[0].children.length, 0);
  });
});

test("comments guard covers a comments panel that YouTube creates or re-creates later", () => {
  onPage("https://www.youtube.com/watch?v=match-1", (timers) => {
    const doc = createPage();

    content.applySettings(BASE_SETTINGS, doc);

    const commentsPanel = createCommentsPanel();
    doc.panels.push(commentsPanel);
    doc.body.appendChild(commentsPanel);
    timers.runPending();

    assert.equal(getPanelOverlays(commentsPanel).length, 1);

    // YouTube re-renders the panel content; the cover went with the old one.
    const panelContent = getPanelContent(commentsPanel);
    panelContent.children = panelContent.children.filter(
      (child) => child.className !== OVERLAY_CLASS,
    );
    timers.runPending();

    assert.equal(getPanelOverlays(commentsPanel).length, 1);
  });
});

test("Show comments in a panel uncovers every cover of this video; the next Short is covered again", () => {
  onPage("https://www.youtube.com/shorts/short-1", (timers) => {
    const commentsPanel = createCommentsPanel();
    const doc = createPage({ comments: createComments(), panels: [commentsPanel] });

    content.applySettings(BASE_SETTINGS, doc);
    assert.notEqual(getCommentsOverlay(doc), null);

    clickShowCommentsIn(getPanelOverlays(commentsPanel)[0]);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getPanelOverlays(commentsPanel).length, 0);
    assert.equal(getCommentsOverlay(doc), null);
    assert.equal(timers.pending().length, 0);

    // A refresh on the same Short keeps the choice.
    content.applySettings(BASE_SETTINGS, doc);
    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getPanelOverlays(commentsPanel).length, 0);

    // Scrolling to the next Short with the panel open.
    globalThis.location = { href: "https://www.youtube.com/shorts/short-2" };
    content.applySettings(BASE_SETTINGS, doc);

    assert.equal(isCommentsObscured(doc), true);
    assert.equal(getPanelOverlays(commentsPanel).length, 1);
  });
});

test("Show comments under a video uncovers the comments panel too", () => {
  onPage("https://www.youtube.com/watch?v=match-1", () => {
    const commentsPanel = createCommentsPanel();
    const doc = createPage({ comments: createComments(), panels: [commentsPanel] });

    content.applySettings(BASE_SETTINGS, doc);
    clickShowComments(doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getPanelOverlays(commentsPanel).length, 0);
  });
});

test("comments guard uncovers the comments panels when the setting or protection is off", () => {
  onPage("https://www.youtube.com/shorts/short-1", (timers) => {
    const commentsPanel = createCommentsPanel();
    const doc = createPage({ panels: [commentsPanel] });

    content.applySettings(BASE_SETTINGS, doc);
    content.applySettings({ ...BASE_SETTINGS, hideComments: false }, doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getPanelOverlays(commentsPanel).length, 0);
    assert.equal(timers.pending().length, 0);

    content.applySettings(BASE_SETTINGS, doc);
    assert.equal(getPanelOverlays(commentsPanel).length, 1);

    content.applySettings({ ...BASE_SETTINGS, extensionEnabled: false }, doc);

    assert.equal(isCommentsObscured(doc), false);
    assert.equal(getPanelOverlays(commentsPanel).length, 0);
    assert.equal(timers.pending().length, 0);
  });
});

test("comments guard CSS blurs the panel's comment list under a cover that spans #content", () => {
  const css = content.buildSpoilerCss();
  const panel = escapeRegExp(COMMENTS_PANEL_SELECTOR);

  assert.match(
    css,
    new RegExp(`html\\.yas-comments-obscured ${panel} > #content \\{\\n  position: relative !important;\\n\\}`),
  );
  assert.match(
    css,
    new RegExp(
      `html\\.yas-comments-obscured ${panel} > #content > ytd-section-list-renderer \\{\\n` +
        "  filter: blur\\(18px\\) !important;\\n  pointer-events: none !important;",
    ),
  );
  // The panel header (title, sort, Close) is not blurred.
  assert.doesNotMatch(css, new RegExp(`${panel} > #header`));
});

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- F4: tab title ---

function installFakeMutationObserver() {
  const originalMutationObserver = globalThis.MutationObserver;
  const observers = [];

  globalThis.MutationObserver = class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.target = null;
      this.options = null;
      observers.push(this);
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
    }

    disconnect() {
      this.target = null;
    }
  };

  return {
    // Delivers a mutation of the <title> element to whoever watches it.
    titleChanged(titleElement) {
      observers
        .filter((observer) => observer.target === titleElement)
        .forEach((observer) => observer.callback([]));
    },
    observing(titleElement) {
      return observers.find((observer) => observer.target === titleElement) || null;
    },
    restore() {
      if (originalMutationObserver === undefined) {
        delete globalThis.MutationObserver;
      } else {
        globalThis.MutationObserver = originalMutationObserver;
      }
    },
  };
}

const TITLE_SETTINGS = Object.freeze({
  ...BASE_SETTINGS,
  hideComments: false,
  hideVideoTitles: true,
});

function withTitleObserver(href, body) {
  const observers = installFakeMutationObserver();

  try {
    onPage(href, () => body(observers));
  } finally {
    observers.restore();
  }
}

test("tab title shows YouTube on a watch page while video titles are hidden", () => {
  withTitleObserver("https://www.youtube.com/watch?v=final", (observers) => {
    const titleElement = createElement("title");
    const doc = createPage({ titleElement, title: "Team A 3-0 Team B - YouTube" });

    content.applySettings(TITLE_SETTINGS, doc);

    assert.equal(doc.title, content.HIDDEN_TAB_TITLE);
    assert.equal(doc.title, "YouTube");
    assert.deepEqual(observers.observing(titleElement).options, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
});

test("tab title replaces every title YouTube sets and ignores its own write", () => {
  withTitleObserver("https://www.youtube.com/watch?v=final", (observers) => {
    const titleElement = createElement("title");
    const doc = createPage({ titleElement, title: "Team A 3-0 Team B - YouTube" });

    content.applySettings(TITLE_SETTINGS, doc);

    // YouTube navigates to another video and writes its title.
    globalThis.location = { href: "https://www.youtube.com/watch?v=rematch" };
    doc.title = "Rematch highlights - YouTube";
    observers.titleChanged(titleElement);
    assert.equal(doc.title, "YouTube");

    // Our own write comes back through the observer; it must not replace
    // the stashed YouTube title.
    observers.titleChanged(titleElement);
    assert.equal(doc.title, "YouTube");

    content.applySettings({ ...TITLE_SETTINGS, hideVideoTitles: false }, doc);
    assert.equal(doc.title, "Rematch highlights - YouTube");
  });
});

test("tab title comes back when protection is switched off", () => {
  withTitleObserver("https://www.youtube.com/watch?v=final", () => {
    const titleElement = createElement("title");
    const doc = createPage({ titleElement, title: "Team A 3-0 Team B - YouTube" });

    content.applySettings(TITLE_SETTINGS, doc);
    content.applySettings({ ...TITLE_SETTINGS, extensionEnabled: false }, doc);

    assert.equal(doc.title, "Team A 3-0 Team B - YouTube");
  });
});

test("tab title is hidden on live and Shorts pages too", () => {
  [
    "https://www.youtube.com/live/stream-id",
    "https://www.youtube.com/shorts/short-id",
  ].forEach((href) => {
    withTitleObserver(href, () => {
      const doc = createPage({
        titleElement: createElement("title"),
        title: "Spoiler title - YouTube",
      });

      content.applySettings(TITLE_SETTINGS, doc);

      assert.equal(doc.title, "YouTube", href);
    });
  });
});

test("tab title is left alone on other pages and when titles are not hidden", () => {
  withTitleObserver("https://www.youtube.com/feed/subscriptions", () => {
    const doc = createPage({
      titleElement: createElement("title"),
      title: "Subscriptions - YouTube",
    });

    content.applySettings(TITLE_SETTINGS, doc);
    assert.equal(doc.title, "Subscriptions - YouTube");
  });

  withTitleObserver("https://www.youtube.com/watch?v=final", () => {
    const doc = createPage({
      titleElement: createElement("title"),
      title: "Team A 3-0 Team B - YouTube",
    });

    content.applySettings({ ...TITLE_SETTINGS, hideVideoTitles: false }, doc);
    assert.equal(doc.title, "Team A 3-0 Team B - YouTube");
  });
});

test("tab title of a video that was left does not come back on the next page", () => {
  withTitleObserver("https://www.youtube.com/watch?v=final", (observers) => {
    const titleElement = createElement("title");
    const doc = createPage({ titleElement, title: "Team A 3-0 Team B - YouTube" });

    content.applySettings(TITLE_SETTINGS, doc);

    // Going home, YouTube may write the home page title ("YouTube", the same
    // text as ours) before the address changes.
    doc.title = "YouTube";
    observers.titleChanged(titleElement);
    globalThis.location = { href: "https://www.youtube.com/" };
    content.applySettings(TITLE_SETTINGS, doc);

    assert.equal(doc.title, "YouTube");

    content.applySettings({ ...TITLE_SETTINGS, hideVideoTitles: false }, doc);
    assert.equal(doc.title, "YouTube");
  });
});

test("tab title is replaced as soon as the parser adds <title>, without another sync", () => {
  withTitleObserver("https://www.youtube.com/watch?v=final", (observers) => {
    const doc = createPage({ title: "" });

    content.applySettings(TITLE_SETTINGS, doc);
    assert.equal(doc.title, "");
    // No <title> yet: the whole document is watched until it appears.
    assert.notEqual(observers.observing(doc.documentElement), null);

    // The parser adds <title> with the video's name; only the observer runs.
    doc.titleElement = createElement("title");
    doc.title = "Team A 3-0 Team B - YouTube";
    observers.titleChanged(doc.documentElement);

    assert.equal(doc.title, "YouTube");
    assert.notEqual(observers.observing(doc.titleElement), null);
    assert.equal(observers.observing(doc.documentElement), null);
  });
});
