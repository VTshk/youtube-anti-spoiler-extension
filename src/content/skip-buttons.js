(function initSkipButtons(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    require("../shared/i18n.js");
  }

  const api = factory(root);

  root.YouTubeAntiSpoiler = Object.assign(root.YouTubeAntiSpoiler || {}, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSkipButtons(root) {
  // i18n.js is loaded before this file (see manifest.json).
  const { setLabel } = root.YouTubeAntiSpoiler;

  // With the timeline hidden there is no way to jump around a video, so
  // these buttons sit next to the player's own controls. They never show
  // where the video ends up: the time stays hidden on purpose.
  const SKIP_BUTTONS_CLASS = "yas-skip-buttons";
  const SKIP_BUTTONS_CHECK_MS = 1000;

  const SKIP_STEPS = Object.freeze([
    { label: "−10m", seconds: -600, labelKey: "skipBack10Minutes" },
    { label: "−1m", seconds: -60, labelKey: "skipBack1Minute" },
    { label: "−10s", seconds: -10, labelKey: "skipBack10Seconds" },
    { label: "+10s", seconds: 10, labelKey: "skipForward10Seconds" },
    { label: "+1m", seconds: 60, labelKey: "skipForward1Minute" },
    { label: "+10m", seconds: 600, labelKey: "skipForward10Minutes" },
  ]);

  // Live streams can only be rewound inside their DVR window, which is what
  // `seekable` describes. Before the video has loaded neither range is known.
  function getSkipBounds(video) {
    const seekable = video.seekable;

    if (seekable && seekable.length > 0) {
      return {
        start: seekable.start(0),
        end: seekable.end(seekable.length - 1),
      };
    }

    if (Number.isFinite(video.duration)) {
      return { start: 0, end: video.duration };
    }

    return null;
  }

  function skipVideo(video, seconds) {
    const bounds = getSkipBounds(video);

    if (!bounds) {
      return false;
    }

    const target = video.currentTime + seconds;
    video.currentTime = Math.min(Math.max(target, bounds.start), bounds.end);
    return true;
  }

  function createSkipButton(doc, step) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "yas-skip-button";
    // The short label stays as it is in every language; the tooltip and
    // the screen reader label are translated.
    button.textContent = step.label;
    setLabel(button, step.labelKey);
    button.dataset.skipSeconds = String(step.seconds);

    button.addEventListener("click", (event) => {
      // The player has its own click handlers (play/pause, seek); this click
      // is ours alone.
      event.preventDefault();
      event.stopPropagation();

      // Looked up on every click: YouTube can swap the <video> element.
      const video = doc.querySelector("#movie_player video");

      if (video) {
        skipVideo(video, step.seconds);
      }
    });

    return button;
  }

  // Inserts the buttons once per player controls bar. Called on navigation
  // and once a second, because YouTube rebuilds the player now and then.
  // Whether they are visible is decided by CSS from the classes on <html>.
  function ensureSkipButtons(doc) {
    const controls = doc.querySelector("#movie_player .ytp-left-controls");

    if (!controls) {
      return false;
    }

    if (controls.querySelector(`.${SKIP_BUTTONS_CLASS}`)) {
      return true;
    }

    const container = doc.createElement("div");
    container.className = SKIP_BUTTONS_CLASS;

    SKIP_STEPS.forEach((step) => {
      container.appendChild(createSkipButton(doc, step));
    });

    controls.appendChild(container);
    return true;
  }

  return {
    SKIP_BUTTONS_CLASS,
    SKIP_BUTTONS_CHECK_MS,
    SKIP_STEPS,
    getSkipBounds,
    skipVideo,
    ensureSkipButtons,
  };
});
