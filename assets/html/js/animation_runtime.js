// === MulmoCast Animation Runtime ===
// Extracted from tailwind_animated.html for maintainability and testability.
// This file is loaded by the template at runtime via fs.readFileSync.

/**
 * Easing functions for non-linear interpolation.
 */
var Easing = {
  linear: function(t) { return t; },
  easeIn: function(t) { return t * t; },
  easeOut: function(t) { return 1 - (1 - t) * (1 - t); },
  easeInOut: function(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
};

/**
 * Interpolation with clamping and optional easing.
 *
 * @param {number} value - Current value (typically frame number)
 * @param {Object} opts - { input: { inMin, inMax }, output: { outMin, outMax }, easing?: string | function }
 * @returns {number} Interpolated and clamped value
 */
function interpolate(value, opts) {
  var inMin = opts.input.inMin;
  var inMax = opts.input.inMax;
  var outMin = opts.output.outMin;
  var outMax = opts.output.outMax;
  if (inMax === inMin) {
    return outMin;
  }
  var easing = !opts.easing ? Easing.linear
    : typeof opts.easing === 'function' ? opts.easing
    : Easing[opts.easing] || Easing.linear;
  var progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + easing(progress) * (outMax - outMin);
}

// === MulmoAnimation Helper Class ===

var TRANSFORM_PROPS = { translateX: 'px', translateY: 'px', scale: '', rotate: 'deg', rotateX: 'deg', rotateY: 'deg', rotateZ: 'deg' };
var SVG_PROPS = ['r', 'cx', 'cy', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'rx', 'ry',
                 'width', 'height', 'stroke-width', 'stroke-dashoffset', 'stroke-dasharray', 'opacity'];

function MulmoAnimation() {
  this._entries = [];
}

/**
 * Register a property animation on a single element.
 * @param {string} selector - CSS selector (e.g. '#title')
 * @param {Object} props - { opacity: [0, 1], translateY: [30, 0], width: [0, 80, '%'] }
 * @param {Object} opts - { start, end, easing }  (start/end in seconds)
 */
MulmoAnimation.prototype.animate = function(selector, props, opts) {
  this._entries.push({ kind: 'animate', selector: selector, props: props, opts: opts || {} });
  return this;
};

/**
 * Stagger animation across numbered elements.
 * Selector must contain {i} placeholder (e.g. '#item{i}').
 */
MulmoAnimation.prototype.stagger = function(selector, count, props, opts) {
  this._entries.push({ kind: 'stagger', selector: selector, count: count, props: props, opts: opts || {} });
  return this;
};

/** Typewriter effect — reveal text character by character. */
MulmoAnimation.prototype.typewriter = function(selector, text, opts) {
  this._entries.push({ kind: 'typewriter', selector: selector, text: text, opts: opts || {} });
  return this;
};

/** Animated counter — interpolate a number and display with optional prefix/suffix. */
MulmoAnimation.prototype.counter = function(selector, range, opts) {
  this._entries.push({ kind: 'counter', selector: selector, range: range, opts: opts || {} });
  return this;
};

/** Code reveal — show lines of code one by one. */
MulmoAnimation.prototype.codeReveal = function(selector, lines, opts) {
  this._entries.push({ kind: 'codeReveal', selector: selector, lines: lines, opts: opts || {} });
  return this;
};

/** Blink — periodic show/hide toggle. */
MulmoAnimation.prototype.blink = function(selector, opts) {
  this._entries.push({ kind: 'blink', selector: selector, opts: opts || {} });
  return this;
};

/** Cover zoom for image/video elements. */
MulmoAnimation.prototype.coverZoom = function(selector, opts) {
  this._entries.push({ kind: 'coverZoom', selector: selector, opts: opts || {} });
  return this;
};

/** Cover pan for image/video elements with automatic black-border prevention. */
MulmoAnimation.prototype.coverPan = function(selector, opts) {
  this._entries.push({ kind: 'coverPan', selector: selector, opts: opts || {} });
  return this;
};

/** Resolve easing name string or function to an easing function */
MulmoAnimation.prototype._resolveEasing = function(e) {
  if (!e) return Easing.linear;
  if (typeof e === 'function') return e;
  return Easing[e] || Easing.linear;
};

/** Convert value to finite number, otherwise return fallback */
MulmoAnimation.prototype._toFiniteNumber = function(value, fallback) {
  var n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Apply props to element at a given progress (0-1) with easing */
MulmoAnimation.prototype._applyProps = function(el, props, progress, easingFn) {
  if (!el) return;
  var self = this;
  var transforms = [];
  Object.keys(props).forEach(function(prop) {
    var spec = props[prop];
    var from = self._toFiniteNumber(spec[0], 0);
    var to = self._toFiniteNumber(spec[1], from);
    var unit = (spec.length > 2) ? spec[2] : null;
    var val = from + easingFn(progress) * (to - from);

    if (TRANSFORM_PROPS.hasOwnProperty(prop)) {
      var tUnit = unit || TRANSFORM_PROPS[prop];
      transforms.push(prop === 'scale' ? 'scale(' + val + ')' : prop + '(' + val + tUnit + ')');
    } else if (el instanceof SVGElement && SVG_PROPS.indexOf(prop) !== -1) {
      el.setAttribute(prop, val);
    } else if (prop === 'opacity') {
      el.style.opacity = val;
    } else {
      var cssUnit = unit || 'px';
      el.style[prop] = val + cssUnit;
    }
  });
  if (transforms.length > 0) {
    el.style.transform = transforms.join(' ');
  }
};

/** Resolve container for cover-based helpers */
MulmoAnimation.prototype._resolveContainer = function(el, selector) {
  if (selector) return document.querySelector(selector) || (el ? el.parentElement : null);
  return el ? el.parentElement : null;
};

/** Ensure cover target is positioned in the same container used for sizing */
MulmoAnimation.prototype._prepareCoverContext = function(el, container) {
  if (!el || !container) return null;
  if (el.contains(container)) {
    container = el.parentElement;
    if (!container) return null;
  }
  var computed = window.getComputedStyle(container);
  if (computed.position === 'static') {
    container.style.position = 'relative';
  }
  if (el.parentElement !== container) {
    try {
      container.appendChild(el);
    } catch (e) {
      console.warn('MulmoAnimation: failed to move cover element into container', e);
    }
  }
  return container;
};

/** Calculate cover-scaled dimensions from intrinsic media size */
MulmoAnimation.prototype._coverSize = function(el, container, zoom) {
  if (!el || !container) return null;
  var intrinsicW = el.naturalWidth || el.videoWidth;
  var intrinsicH = el.naturalHeight || el.videoHeight;
  if (!intrinsicW || !intrinsicH) return null;
  var ww = container.clientWidth || container.offsetWidth;
  var wh = container.clientHeight || container.offsetHeight;
  if (!ww || !wh) return null;
  var cover = Math.max(ww / intrinsicW, wh / intrinsicH);
  var s = cover * zoom;
  return { ww: ww, wh: wh, iw: intrinsicW * s, ih: intrinsicH * s };
};

/** Apply absolute-centered base style for cover helpers */
MulmoAnimation.prototype._applyCoverBaseStyle = function(el, iw, ih) {
  el.style.position = 'absolute';
  el.style.top = '50%';
  el.style.left = '50%';
  el.style.transform = 'translate(-50%,-50%)';
  el.style.maxWidth = 'none';
  el.style.maxHeight = 'none';
  el.style.width = iw + 'px';
  el.style.height = ih + 'px';
};

/**
 * Update all registered animations for the given frame.
 * @param {number} frame - current frame number
 * @param {number} fps - frames per second
 */
MulmoAnimation.prototype.update = function(frame, fps) {
  var self = this;
  var autoEndFrame = Math.max(0, window.__MULMO.totalFrames - 1);
  this._entries.forEach(function(entry) {
    var opts = entry.opts;
    var easingFn = self._resolveEasing(opts.easing);

    if (entry.kind === 'animate') {
      var startFrame = (opts.start || 0) * fps;
      var endFrame = opts.end === 'auto' ? autoEndFrame : (opts.end || 0) * fps;
      var progress = Math.max(0, Math.min(1, endFrame === startFrame ? 1 : (frame - startFrame) / (endFrame - startFrame)));
      var el = document.querySelector(entry.selector);
      self._applyProps(el, entry.props, progress, easingFn);

    } else if (entry.kind === 'stagger') {
      var baseStart = (opts.start || 0) * fps;
      var staggerDelay = (opts.stagger !== undefined ? opts.stagger : 0.2) * fps;
      var dur = (opts.duration !== undefined ? opts.duration : 0.5) * fps;
      for (var j = 0; j < entry.count; j++) {
        var sel = entry.selector.replace(/\{i\}/g, j);
        var sEl = document.querySelector(sel);
        var sStart = baseStart + j * staggerDelay;
        var sEnd = sStart + dur;
        var sProgress = Math.max(0, Math.min(1, sEnd === sStart ? 1 : (frame - sStart) / (sEnd - sStart)));
        self._applyProps(sEl, entry.props, sProgress, easingFn);
      }

    } else if (entry.kind === 'typewriter') {
      var twStart = (opts.start || 0) * fps;
      var twEnd = opts.end === 'auto' ? autoEndFrame : (opts.end || 0) * fps;
      var twProgress = Math.max(0, Math.min(1, twEnd === twStart ? 1 : (frame - twStart) / (twEnd - twStart)));
      var charCount = Math.floor(twProgress * entry.text.length);
      var twEl = document.querySelector(entry.selector);
      if (twEl) twEl.textContent = entry.text.substring(0, charCount);

    } else if (entry.kind === 'counter') {
      var cStart = (opts.start || 0) * fps;
      var cEnd = opts.end === 'auto' ? autoEndFrame : (opts.end || 0) * fps;
      var cProgress = Math.max(0, Math.min(1, cEnd === cStart ? 1 : (frame - cStart) / (cEnd - cStart)));
      var cVal = entry.range[0] + easingFn(cProgress) * (entry.range[1] - entry.range[0]);
      var decimals = opts.decimals || 0;
      var display = (opts.prefix || '') + cVal.toFixed(decimals) + (opts.suffix || '');
      var cEl = document.querySelector(entry.selector);
      if (cEl) cEl.textContent = display;

    } else if (entry.kind === 'codeReveal') {
      var crStart = (opts.start || 0) * fps;
      var crEnd = opts.end === 'auto' ? autoEndFrame : (opts.end || 0) * fps;
      var crProgress = Math.max(0, Math.min(1, crEnd === crStart ? 1 : (frame - crStart) / (crEnd - crStart)));
      var lineCount = Math.floor(crProgress * entry.lines.length);
      var crEl = document.querySelector(entry.selector);
      if (crEl) crEl.textContent = entry.lines.slice(0, lineCount).join('\n');

    } else if (entry.kind === 'blink') {
      var interval_s = opts.interval || 0.5;
      var blinkEl = document.querySelector(entry.selector);
      if (blinkEl) {
        var cycle = (frame / fps) / interval_s;
        blinkEl.style.opacity = (Math.floor(cycle) % 2 === 0) ? 1 : 0;
      }
    } else if (entry.kind === 'coverZoom') {
      var zEl = document.querySelector(entry.selector);
      if (!zEl) return;
      var zContainer = self._prepareCoverContext(zEl, self._resolveContainer(zEl, opts.containerSelector));
      if (!zContainer) return;
      var zStart = (opts.start || 0) * fps;
      var zEnd = opts.end === 'auto' ? autoEndFrame : (opts.end || 0) * fps;
      var zProgress = Math.max(0, Math.min(1, zEnd === zStart ? 1 : (frame - zStart) / (zEnd - zStart)));
      var zFrom = opts.zoomFrom === undefined
        ? (opts.from === undefined ? 1 : self._toFiniteNumber(opts.from, 1))
        : self._toFiniteNumber(opts.zoomFrom, 1);
      var safeZFrom = Math.max(1e-6, zFrom);
      var zTo = opts.zoomTo === undefined
        ? (opts.to === undefined ? safeZFrom : self._toFiniteNumber(opts.to, safeZFrom))
        : self._toFiniteNumber(opts.zoomTo, safeZFrom);
      var safeZTo = Math.max(1e-6, zTo);
      var zCurrent = safeZFrom + easingFn(zProgress) * (safeZTo - safeZFrom);
      var zSize = self._coverSize(zEl, zContainer, zCurrent);
      if (!zSize) return;
      self._applyCoverBaseStyle(zEl, zSize.iw, zSize.ih);
    } else if (entry.kind === 'coverPan') {
      var pEl = document.querySelector(entry.selector);
      if (!pEl) return;
      var pContainer = self._prepareCoverContext(pEl, self._resolveContainer(pEl, opts.containerSelector));
      if (!pContainer) return;
      var pStart = (opts.start || 0) * fps;
      var pEnd = opts.end === 'auto' ? autoEndFrame : (opts.end || 0) * fps;
      var pProgress = Math.max(0, Math.min(1, pEnd === pStart ? 1 : (frame - pStart) / (pEnd - pStart)));
      var pAxis = opts.axis === 'y' ? 'y' : 'x';
      var pDirection = self._toFiniteNumber(opts.direction, 1) < 0 ? -1 : 1;
      var pRequested = Math.abs(self._toFiniteNumber(opts.distance, 0));
      var pZoom = Math.max(1e-6, self._toFiniteNumber(opts.zoom, 1));
      var pSize = self._coverSize(pEl, pContainer, pZoom);
      if (!pSize) return;
      self._applyCoverBaseStyle(pEl, pSize.iw, pSize.ih);

      var viewport = pAxis === 'x' ? pSize.ww : pSize.wh;
      var imageSize = pAxis === 'x' ? pSize.iw : pSize.ih;
      var maxDistancePercent = Math.max(0, (((imageSize - viewport) / 2) / viewport) * 100);
      var minPos = 50 - maxDistancePercent;
      var maxPos = 50 + maxDistancePercent;
      var safeRange = maxPos - minPos;
      var clampPercent = function(v) { return Math.max(0, Math.min(100, v)); };
      var mapToSafePos = function(v) { return minPos + (safeRange * (clampPercent(v) / 100)); };

      var panFrom = 50;
      var panTo = 50;
      if (opts.from !== undefined || opts.to !== undefined) {
        var fromNorm = opts.from === undefined ? 50 : self._toFiniteNumber(opts.from, 50);
        var toNorm = opts.to === undefined ? fromNorm : self._toFiniteNumber(opts.to, fromNorm);
        panFrom = mapToSafePos(fromNorm);
        panTo = mapToSafePos(toNorm);
      } else {
        var distancePercent = Math.min(pRequested, maxDistancePercent);
        panFrom = 50;
        panTo = panFrom + pDirection * distancePercent;
      }

      var clampedFrom = Math.max(minPos, Math.min(maxPos, panFrom));
      var clampedTo = Math.max(minPos, Math.min(maxPos, panTo));
      var current = clampedFrom + easingFn(pProgress) * (clampedTo - clampedFrom);
      if (pAxis === 'x') {
        pEl.style.left = current + '%';
        pEl.style.top = '50%';
      } else {
        pEl.style.top = current + '%';
        pEl.style.left = '50%';
      }
    }
  });
};
