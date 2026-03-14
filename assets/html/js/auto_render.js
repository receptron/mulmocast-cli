// === Auto-render and playAnimation ===
// Auto-render: if MulmoAnimation is used but render() is not defined, generate it.
// Check both local var (from user_script) and window.animation (from data-attribute auto-registration).
var _autoAnim =
  typeof animation !== "undefined" && animation instanceof MulmoAnimation ? animation : window.animation instanceof MulmoAnimation ? window.animation : null;
if (typeof window.render !== "function" && typeof render === "function") {
  window.render = render;
} else if (typeof window.render !== "function" && _autoAnim) {
  window.render = function (frame, totalFrames, fps) {
    _autoAnim.update(frame, fps);
  };
}

// Initial render (frame 0)
if (typeof window.render === "function") {
  var _initResult = window.render(0, window.__MULMO.totalFrames, window.__MULMO.fps);
  if (_initResult && typeof _initResult.then === "function") {
    _initResult.catch(console.error);
  }
}

/**
 * Play animation in real-time using requestAnimationFrame.
 * Returns a Promise that resolves when all frames have been rendered.
 * Called by Puppeteer's page.evaluate() during screencast recording.
 */
window.playAnimation = function () {
  return new Promise(function (resolve, reject) {
    var mulmo = window.__MULMO;
    var fps = mulmo.fps;
    var totalFrames = mulmo.totalFrames;
    var frameDuration = 1000 / fps;
    var startTime = null;

    async function tick(timestamp) {
      if (startTime === null) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var frame = Math.min(Math.floor(elapsed / frameDuration), totalFrames - 1);

      mulmo.frame = frame;
      if (typeof window.render === "function") {
        await Promise.resolve(window.render(frame, totalFrames, fps));
      }

      if (frame < totalFrames - 1) {
        requestAnimationFrame(function (nextTimestamp) {
          tick(nextTimestamp).catch(reject);
        });
      } else {
        resolve();
      }
    }

    requestAnimationFrame(function (timestamp) {
      tick(timestamp).catch(reject);
    });
  });
};
