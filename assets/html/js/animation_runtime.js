// === MulmoCast Animation Runtime ===
// Extracted from tailwind_animated.html for maintainability and testability.
// This file is loaded by the template at runtime via fs.readFileSync.
//
// NOTE: Top-level declarations use `var` intentionally — these files run in
// browser global scope AND are tested via Node.js `vm.runInContext`, where
// only `var` (not `const`/`let`) creates properties on the sandbox context.

/**
 * Easing functions for non-linear interpolation.
 */
var Easing = {
  linear: function (t) {
    return t;
  },
  easeIn: function (t) {
    return t * t;
  },
  easeOut: function (t) {
    return 1 - (1 - t) * (1 - t);
  },
  easeInOut: function (t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
};

/**
 * Parse a numeric value, returning fallback if not finite.
 * Shared utility used by MulmoAnimation and data-attribute registration.
 *
 * @param {*} value - Value to parse
 * @param {number} fallback - Default if value is not a finite number
 * @returns {number}
 */
var toFiniteNumber = function (value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Interpolation with clamping and optional easing.
 *
 * @param {number} value - Current value (typically frame number)
 * @param {Object} opts - { input: { inMin, inMax }, output: { outMin, outMax }, easing?: string | function }
 * @returns {number} Interpolated and clamped value
 */
var interpolate = function (value, opts) {
  const inMin = opts.input.inMin;
  const inMax = opts.input.inMax;
  const outMin = opts.output.outMin;
  const outMax = opts.output.outMax;
  if (inMax === inMin) {
    return outMin;
  }
  const easing = !opts.easing ? Easing.linear : typeof opts.easing === "function" ? opts.easing : Easing[opts.easing] || Easing.linear;
  const progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + easing(progress) * (outMax - outMin);
};

// === MulmoAnimation Helper Class ===

var TRANSFORM_PROPS = { translateX: "px", translateY: "px", scale: "", rotate: "deg", rotateX: "deg", rotateY: "deg", rotateZ: "deg" };
var SVG_PROPS = [
  "r",
  "cx",
  "cy",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "rx",
  "ry",
  "width",
  "height",
  "stroke-width",
  "stroke-dashoffset",
  "stroke-dasharray",
  "opacity",
];

var MulmoAnimation = function () {
  this._entries = [];
};

/**
 * Register a property animation on a single element.
 * @param {string} selector - CSS selector (e.g. '#title')
 * @param {Object} props - { opacity: [0, 1], translateY: [30, 0], width: [0, 80, '%'] }
 * @param {Object} opts - { start, end, easing }  (start/end in seconds)
 */
MulmoAnimation.prototype.animate = function (selector, props, opts) {
  this._entries.push({ kind: "animate", selector: selector, props: props, opts: opts || {} });
  return this;
};

/**
 * Stagger animation across numbered elements.
 * Selector must contain {i} placeholder (e.g. '#item{i}').
 */
MulmoAnimation.prototype.stagger = function (selector, count, props, opts) {
  this._entries.push({ kind: "stagger", selector: selector, count: count, props: props, opts: opts || {} });
  return this;
};

/** Typewriter effect — reveal text character by character. */
MulmoAnimation.prototype.typewriter = function (selector, text, opts) {
  this._entries.push({ kind: "typewriter", selector: selector, text: text, opts: opts || {} });
  return this;
};

/** Animated counter — interpolate a number and display with optional prefix/suffix. */
MulmoAnimation.prototype.counter = function (selector, range, opts) {
  this._entries.push({ kind: "counter", selector: selector, range: range, opts: opts || {} });
  return this;
};

/** Code reveal — show lines of code one by one. */
MulmoAnimation.prototype.codeReveal = function (selector, lines, opts) {
  this._entries.push({ kind: "codeReveal", selector: selector, lines: lines, opts: opts || {} });
  return this;
};

/** Blink — periodic show/hide toggle. */
MulmoAnimation.prototype.blink = function (selector, opts) {
  this._entries.push({ kind: "blink", selector: selector, opts: opts || {} });
  return this;
};

/** Cover zoom for image/video elements. */
MulmoAnimation.prototype.coverZoom = function (selector, opts) {
  this._entries.push({ kind: "coverZoom", selector: selector, opts: opts || {} });
  return this;
};

/** Cover pan for image/video elements with automatic black-border prevention. */
MulmoAnimation.prototype.coverPan = function (selector, opts) {
  this._entries.push({ kind: "coverPan", selector: selector, opts: opts || {} });
  return this;
};

/** Resolve easing name string or function to an easing function */
MulmoAnimation.prototype._resolveEasing = function (e) {
  if (!e) return Easing.linear;
  if (typeof e === "function") return e;
  return Easing[e] || Easing.linear;
};

/** Convert value to finite number, otherwise return fallback */
MulmoAnimation.prototype._toFiniteNumber = function (value, fallback) {
  return toFiniteNumber(value, fallback);
};

/** Apply props to element at a given progress (0-1) with easing */
MulmoAnimation.prototype._applyProps = function (el, props, progress, easingFn) {
  if (!el) return;
  const self = this;
  const transforms = [];
  Object.keys(props).forEach(function (prop) {
    const spec = props[prop];
    const from = self._toFiniteNumber(spec[0], 0);
    const to = self._toFiniteNumber(spec[1], from);
    const unit = spec.length > 2 ? spec[2] : null;
    const val = from + easingFn(progress) * (to - from);

    if (TRANSFORM_PROPS.hasOwnProperty(prop)) {
      const tUnit = unit || TRANSFORM_PROPS[prop];
      transforms.push(prop === "scale" ? "scale(" + val + ")" : prop + "(" + val + tUnit + ")");
    } else if (el instanceof SVGElement && SVG_PROPS.indexOf(prop) !== -1) {
      el.setAttribute(prop, val);
    } else if (prop === "opacity") {
      el.style.opacity = val;
    } else {
      const cssUnit = unit || "px";
      el.style[prop] = val + cssUnit;
    }
  });
  if (transforms.length > 0) {
    el.style.transform = transforms.join(" ");
  }
};

/** Resolve container for cover-based helpers */
MulmoAnimation.prototype._resolveContainer = function (el, selector) {
  if (selector) return document.querySelector(selector) || (el ? el.parentElement : null);
  return el ? el.parentElement : null;
};

/** Ensure cover target is positioned in the same container used for sizing */
MulmoAnimation.prototype._prepareCoverContext = function (el, container) {
  if (!el || !container) return null;
  if (el.contains(container)) {
    container = el.parentElement;
    if (!container) return null;
  }
  const computed = window.getComputedStyle(container);
  if (computed.position === "static") {
    container.style.position = "relative";
  }
  if (el.parentElement !== container) {
    try {
      container.appendChild(el);
    } catch (e) {
      console.warn("MulmoAnimation: failed to move cover element into container", e);
    }
  }
  return container;
};

/** Calculate cover-scaled dimensions from intrinsic media size */
MulmoAnimation.prototype._coverSize = function (el, container, zoom) {
  if (!el || !container) return null;
  const intrinsicW = el.naturalWidth || el.videoWidth;
  const intrinsicH = el.naturalHeight || el.videoHeight;
  if (!intrinsicW || !intrinsicH) return null;
  const ww = container.clientWidth || container.offsetWidth;
  const wh = container.clientHeight || container.offsetHeight;
  if (!ww || !wh) return null;
  const cover = Math.max(ww / intrinsicW, wh / intrinsicH);
  const s = cover * zoom;
  return { ww: ww, wh: wh, iw: intrinsicW * s, ih: intrinsicH * s };
};

/** Apply absolute-centered base style for cover helpers */
MulmoAnimation.prototype._applyCoverBaseStyle = function (el, iw, ih) {
  el.style.position = "absolute";
  el.style.top = "50%";
  el.style.left = "50%";
  el.style.transform = "translate(-50%,-50%)";
  el.style.maxWidth = "none";
  el.style.maxHeight = "none";
  el.style.width = iw + "px";
  el.style.height = ih + "px";
};

/**
 * Update all registered animations for the given frame.
 * @param {number} frame - current frame number
 * @param {number} fps - frames per second
 */
MulmoAnimation.prototype.update = function (frame, fps) {
  const self = this;
  const autoEndFrame = Math.max(0, window.__MULMO.totalFrames - 1);
  this._entries.forEach(function (entry) {
    const opts = entry.opts;
    const easingFn = self._resolveEasing(opts.easing);

    if (entry.kind === "animate") {
      const startFrame = (opts.start || 0) * fps;
      const endFrame = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;
      const progress = Math.max(0, Math.min(1, endFrame === startFrame ? 1 : (frame - startFrame) / (endFrame - startFrame)));
      const el = document.querySelector(entry.selector);
      self._applyProps(el, entry.props, progress, easingFn);
    } else if (entry.kind === "stagger") {
      const baseStart = (opts.start || 0) * fps;
      const staggerDelay = (opts.stagger !== undefined ? opts.stagger : 0.2) * fps;
      const dur = (opts.duration !== undefined ? opts.duration : 0.5) * fps;
      for (let j = 0; j < entry.count; j++) {
        const sel = entry.selector.replace(/\{i\}/g, j);
        const sEl = document.querySelector(sel);
        const sStart = baseStart + j * staggerDelay;
        const sEnd = sStart + dur;
        const sProgress = Math.max(0, Math.min(1, sEnd === sStart ? 1 : (frame - sStart) / (sEnd - sStart)));
        self._applyProps(sEl, entry.props, sProgress, easingFn);
      }
    } else if (entry.kind === "typewriter") {
      const twStart = (opts.start || 0) * fps;
      const twEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;
      const twProgress = Math.max(0, Math.min(1, twEnd === twStart ? 1 : (frame - twStart) / (twEnd - twStart)));
      const charCount = Math.floor(twProgress * entry.text.length);
      const twEl = document.querySelector(entry.selector);
      if (twEl) twEl.textContent = entry.text.substring(0, charCount);
    } else if (entry.kind === "counter") {
      const cStart = (opts.start || 0) * fps;
      const cEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;
      const cProgress = Math.max(0, Math.min(1, cEnd === cStart ? 1 : (frame - cStart) / (cEnd - cStart)));
      const cVal = entry.range[0] + easingFn(cProgress) * (entry.range[1] - entry.range[0]);
      const decimals = opts.decimals || 0;
      const display = (opts.prefix || "") + cVal.toFixed(decimals) + (opts.suffix || "");
      const cEl = document.querySelector(entry.selector);
      if (cEl) cEl.textContent = display;
    } else if (entry.kind === "codeReveal") {
      const crStart = (opts.start || 0) * fps;
      const crEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;
      const crProgress = Math.max(0, Math.min(1, crEnd === crStart ? 1 : (frame - crStart) / (crEnd - crStart)));
      const lineCount = Math.floor(crProgress * entry.lines.length);
      const crEl = document.querySelector(entry.selector);
      if (crEl) crEl.textContent = entry.lines.slice(0, lineCount).join("\n");
    } else if (entry.kind === "blink") {
      const interval_s = opts.interval || 0.5;
      const blinkEl = document.querySelector(entry.selector);
      if (blinkEl) {
        const cycle = frame / fps / interval_s;
        blinkEl.style.opacity = Math.floor(cycle) % 2 === 0 ? 1 : 0;
      }
    } else if (entry.kind === "coverZoom") {
      const zEl = document.querySelector(entry.selector);
      if (!zEl) return;
      const zContainer = self._prepareCoverContext(zEl, self._resolveContainer(zEl, opts.containerSelector));
      if (!zContainer) return;
      const zStart = (opts.start || 0) * fps;
      const zEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;
      const zProgress = Math.max(0, Math.min(1, zEnd === zStart ? 1 : (frame - zStart) / (zEnd - zStart)));
      const zFrom = opts.zoomFrom === undefined ? (opts.from === undefined ? 1 : self._toFiniteNumber(opts.from, 1)) : self._toFiniteNumber(opts.zoomFrom, 1);
      const safeZFrom = Math.max(1e-6, zFrom);
      const zTo =
        opts.zoomTo === undefined
          ? opts.to === undefined
            ? safeZFrom
            : self._toFiniteNumber(opts.to, safeZFrom)
          : self._toFiniteNumber(opts.zoomTo, safeZFrom);
      const safeZTo = Math.max(1e-6, zTo);
      const zCurrent = safeZFrom + easingFn(zProgress) * (safeZTo - safeZFrom);
      const zSize = self._coverSize(zEl, zContainer, zCurrent);
      if (!zSize) return;
      self._applyCoverBaseStyle(zEl, zSize.iw, zSize.ih);
    } else if (entry.kind === "coverPan") {
      const pEl = document.querySelector(entry.selector);
      if (!pEl) return;
      const pContainer = self._prepareCoverContext(pEl, self._resolveContainer(pEl, opts.containerSelector));
      if (!pContainer) return;
      const pStart = (opts.start || 0) * fps;
      const pEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;
      const pProgress = Math.max(0, Math.min(1, pEnd === pStart ? 1 : (frame - pStart) / (pEnd - pStart)));
      const pAxis = opts.axis === "y" ? "y" : "x";
      const pDirection = self._toFiniteNumber(opts.direction, 1) < 0 ? -1 : 1;
      const pRequested = Math.abs(self._toFiniteNumber(opts.distance, 0));
      const pZoom = Math.max(1e-6, self._toFiniteNumber(opts.zoom, 1));
      const pSize = self._coverSize(pEl, pContainer, pZoom);
      if (!pSize) return;
      self._applyCoverBaseStyle(pEl, pSize.iw, pSize.ih);

      const viewport = pAxis === "x" ? pSize.ww : pSize.wh;
      const imageSize = pAxis === "x" ? pSize.iw : pSize.ih;
      const maxDistancePercent = Math.max(0, ((imageSize - viewport) / 2 / viewport) * 100);
      const minPos = 50 - maxDistancePercent;
      const maxPos = 50 + maxDistancePercent;
      const safeRange = maxPos - minPos;
      const clampPercent = function (v) {
        return Math.max(0, Math.min(100, v));
      };
      const mapToSafePos = function (v) {
        return minPos + safeRange * (clampPercent(v) / 100);
      };

      let panFrom, panTo;
      if (opts.from !== undefined || opts.to !== undefined) {
        const fromNorm = opts.from === undefined ? 50 : self._toFiniteNumber(opts.from, 50);
        const toNorm = opts.to === undefined ? fromNorm : self._toFiniteNumber(opts.to, fromNorm);
        panFrom = mapToSafePos(fromNorm);
        panTo = mapToSafePos(toNorm);
      } else {
        const distancePercent = Math.min(pRequested, maxDistancePercent);
        panFrom = 50;
        panTo = panFrom + pDirection * distancePercent;
      }

      const clampedFrom = Math.max(minPos, Math.min(maxPos, panFrom));
      const clampedTo = Math.max(minPos, Math.min(maxPos, panTo));
      const current = clampedFrom + easingFn(pProgress) * (clampedTo - clampedFrom);
      if (pAxis === "x") {
        pEl.style.left = current + "%";
        pEl.style.top = "50%";
      } else {
        pEl.style.top = current + "%";
        pEl.style.left = "50%";
      }
    }
  });
};
