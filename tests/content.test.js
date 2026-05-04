const assert = require("node:assert/strict");
const test = require("node:test");

const content = require("../src/content/content.js");

test("getEnabledClassNames maps enabled settings to stable root classes", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: true,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
    }),
    [
      "yas-extension-enabled",
      "yas-hide-time",
      "yas-hide-player-progress-bar",
      "yas-hide-video-previews",
    ],
  );
});

test("getEnabledClassNames returns no hiding classes when the extension is disabled", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: false,
      hideTime: true,
      hidePlayerProgressBar: true,
      hideVideoPreviews: true,
    }),
    [],
  );
});

test("getEnabledClassNames keeps time hiding enabled when stored setting is false", () => {
  assert.deepEqual(
    content.getEnabledClassNames({
      extensionEnabled: true,
      hideTime: false,
      hidePlayerProgressBar: true,
      hideVideoPreviews: false,
    }),
    [
      "yas-extension-enabled",
      "yas-hide-time",
      "yas-hide-player-progress-bar",
    ],
  );
});

test("buildSpoilerCss targets YouTube thumbnail, player time, and progress selectors", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /ytd-thumbnail-overlay-time-status-renderer/);
  assert.match(css, /\.ytp-time-display/);
  assert.match(css, /\.ytp-progress-bar-container/);
  assert.match(css, /yas-hide-time/);
});

test("buildSpoilerCss targets compact video list duration badges", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /ytd-compact-video-renderer[^\n]+badge-shape-wiz/);
  assert.match(css, /yt-lockup-view-model[^\n]+badge-shape-wiz/);
});

test("buildSpoilerCss targets YouTube's ytBadgeShapeText duration class", () => {
  const css = content.buildSpoilerCss();

  assert.match(css, /\.ytBadgeShapeText/);
});

test("buildSpoilerCss keeps live thumbnail badges visible when hiding time", () => {
  const css = content.buildSpoilerCss();
  const thumbnailTimeRule = css.match(
    /html\.yas-hide-time[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(thumbnailTimeRule, /\.ytBadgeShapeText:not\(\.ytBadgeShapeThumbnailLive\)/);
  assert.match(thumbnailTimeRule, /:not\(\.ytBadgeShapeThumbnailLive \*\)/);
  assert.match(thumbnailTimeRule, /:not\(:has\(\.ytBadgeShapeThumbnailLive\)\)/);
});

test("buildSpoilerCss hides player seek preview time with the time setting", () => {
  const css = content.buildSpoilerCss();
  const playerTimeRule = css.match(
    /html\.yas-hide-time \.ytp-time-display[\s\S]+?\{[\s\S]+?\}/,
  )[0];
  const progressRule = css.match(
    /html\.yas-hide-player-progress-bar[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(playerTimeRule, /\.ytp-tooltip-text/);
  assert.match(playerTimeRule, /\.ytp-tooltip-bottom-text/);
  assert.match(playerTimeRule, /\.ytp-tooltip-duration/);
  assert.match(playerTimeRule, /\.ytp-tooltip-progress-bar-pill-time-stamp/);
  assert.match(playerTimeRule, /\.ytPlayerStoryboardTimestamp/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-text/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-bottom-text/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-duration/);
  assert.doesNotMatch(progressRule, /\.ytp-tooltip-progress-bar-pill-time-stamp/);
  assert.doesNotMatch(progressRule, /\.ytPlayerStoryboardTimestamp/);
});

test("buildSpoilerCss hides progress overlays with the progress setting", () => {
  const css = content.buildSpoilerCss();
  const progressRule = css.match(
    /html\.yas-hide-player-progress-bar[\s\S]+?\{[\s\S]+?\}/,
  )[0];
  const playerTimeRule = css.match(
    /html\.yas-hide-time \.ytp-time-display[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.doesNotMatch(progressRule, /ytThumbnailBottomOverlayViewModelHost/);
  assert.doesNotMatch(progressRule, /ThumbnailBottomOverlayViewModelHost/);
  assert.doesNotMatch(progressRule, /\.ytPlayerProgressBarProgressBar/);
  assert.match(progressRule, /\.ytPlayerProgressBarHost/);
  assert.match(progressRule, /\.ytPlayerProgressBarHostBottomInset/);
  assert.match(progressRule, /\.ytThumbnailOverlayProgressBarHostWatchedProgressBar/);
  assert.match(progressRule, /\.ytThumbnailOverlayProgressBarHostUseLegacyBar/);
  assert.doesNotMatch(playerTimeRule, /\.ytPlayerProgressBarHost/);
  assert.doesNotMatch(playerTimeRule, /\.ytPlayerProgressBarHostBottomInset/);
  assert.doesNotMatch(playerTimeRule, /\.ytThumbnailOverlayProgressBarHostWatchedProgressBar/);
  assert.doesNotMatch(playerTimeRule, /\.ytThumbnailOverlayProgressBarHostUseLegacyBar/);
  assert.match(progressRule, /ytd-thumbnail-overlay-resume-playback-renderer/);
});

test("buildSpoilerCss blurs video preview thumbnails separately", () => {
  const css = content.buildSpoilerCss();
  const previewRule = css.match(
    /html\.yas-hide-video-previews[\s\S]+?\{[\s\S]+?\}/,
  )[0];

  assert.match(css, /yas-hide-video-previews/);
  assert.match(css, /ytd-thumbnail[^\n]+img/);
  assert.match(css, /yt-thumbnail-view-model[^\n]+video/);
  assert.match(previewRule, /filter:\s*blur\(24px\)/);
  assert.doesNotMatch(previewRule, /visibility:\s*hidden/);
  assert.doesNotMatch(previewRule, /opacity:\s*0/);
});
