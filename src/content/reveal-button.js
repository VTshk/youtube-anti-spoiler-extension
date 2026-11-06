(function initRevealButton(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    require("../shared/i18n.js");
  }

  const api = factory(root);

  root.YouTubeAntiSpoiler = Object.assign(root.YouTubeAntiSpoiler || {}, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createRevealButton(root) {
  // i18n.js is loaded before this file (see manifest.json).
  const { setLabel } = root.YouTubeAntiSpoiler;

  // "Show spoilers for this video": one eye button next to the player's own
  // controls (and after the skip buttons). content.js decides what a click
  // does and whether the button is shown; this file only draws it.
  const REVEAL_BUTTON_CLASS = "yas-reveal-button";
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  function createSvgElement(doc, tagName, attributes) {
    const element = doc.createElementNS(SVG_NAMESPACE, tagName);

    Object.keys(attributes).forEach((name) => {
      element.setAttribute(name, attributes[name]);
    });

    return element;
  }

  // An eye; while the video is shown, a slash crosses it out (CSS draws the
  // slash only then), so the icon tells what a click will do.
  function createEyeIcon(doc) {
    const icon = createSvgElement(doc, "svg", {
      viewBox: "0 0 24 24",
      width: "24",
      height: "24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    });

    icon.appendChild(createSvgElement(doc, "path", {
      d: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z",
    }));
    icon.appendChild(createSvgElement(doc, "circle", { cx: "12", cy: "12", r: "3" }));
    icon.appendChild(createSvgElement(doc, "path", {
      class: "yas-reveal-slash",
      d: "M4 4l16 16",
    }));

    return icon;
  }

  // Inserts the button once per player controls bar and returns it, or null
  // while the player has no controls yet. Called on navigation and once a
  // second, like the skip buttons, because YouTube rebuilds the player now
  // and then.
  function ensureRevealButton(doc, onClick) {
    const controls = doc.querySelector("#movie_player .ytp-left-controls");

    if (!controls) {
      return null;
    }

    const existingButton = controls.querySelector(`.${REVEAL_BUTTON_CLASS}`);

    if (existingButton) {
      return existingButton;
    }

    const button = doc.createElement("button");
    button.type = "button";
    button.className = REVEAL_BUTTON_CLASS;
    button.appendChild(createEyeIcon(doc));
    setLabel(button, "revealShowButton");
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", (event) => {
      // The player has its own click handlers (play/pause); this click is
      // ours alone.
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    controls.appendChild(button);
    return button;
  }

  // state is { available, revealed } from content.js. Runs once a second, so
  // it writes only what changed: every write is a DOM mutation YouTube's own
  // observers would see.
  function renderRevealButton(button, state) {
    if (button.hidden !== !state.available) {
      button.hidden = !state.available;
    }

    const pressed = String(state.revealed);

    if (button.getAttribute("aria-pressed") !== pressed) {
      button.setAttribute("aria-pressed", pressed);
    }

    const labelKey = state.revealed ? "revealHideButton" : "revealShowButton";

    if (button.dataset.yasI18nLabel !== labelKey) {
      setLabel(button, labelKey);
    }
  }

  return {
    REVEAL_BUTTON_CLASS,
    ensureRevealButton,
    renderRevealButton,
  };
});
