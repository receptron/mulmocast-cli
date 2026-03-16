// === Auto-render and playAnimation ===
// Auto-render: if MulmoAnimation is used but render() is not defined, generate it.
// Check both local var (from user_script) and window.animation (from data-attribute auto-registration).
//
// NOTE: Top-level declarations use `var` intentionally — see animation_runtime.js header comment.
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
  try {
    var _initResult = window.render(0, window.__MULMO.totalFrames, window.__MULMO.fps);
    if (_initResult && typeof _initResult.then === "function") {
      _initResult.catch(console.error);
    }
  } catch (e) {
    console.error("MulmoAnimation: initial render failed", e);
  }
}

/**
 * Render the final frame of the animation (all content fully visible).
 * Used by Puppeteer to capture a static image for PDF/thumbnail generation.
 * Returns a Promise (or value) from the render function.
 */
window.renderFinal = function () {
  const mulmo = window.__MULMO;
  const lastFrame = Math.max(0, mulmo.totalFrames - 1);
  mulmo.frame = lastFrame;
  if (typeof window.render === "function") {
    return window.render(lastFrame, mulmo.totalFrames, mulmo.fps);
  }
};

/**
 * Play animation in real-time using requestAnimationFrame.
 * Returns a Promise that resolves when all frames have been rendered.
 * Called by Puppeteer's page.evaluate() during screencast recording.
 */
window.playAnimation = function () {
  return new Promise(function (resolve, reject) {
    const mulmo = window.__MULMO;
    const fps = mulmo.fps;
    const totalFrames = mulmo.totalFrames;
    const frameDuration = 1000 / fps;
    let startTime = null;

    async function tick(timestamp) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const frame = Math.min(Math.floor(elapsed / frameDuration), totalFrames - 1);

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
