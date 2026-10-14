export const animationRuntime = {
  animation_runtime:
    "// === MulmoCast Animation Runtime ===\n" +
    "// Extracted from tailwind_animated.html for maintainability and testability.\n" +
    "// This file is loaded by the template at runtime via fs.readFileSync.\n" +
    "//\n" +
    "// NOTE: Top-level declarations use `var` intentionally — these files run in\n" +
    "// browser global scope AND are tested via Node.js `vm.runInContext`, where\n" +
    "// only `var` (not `const`/`let`) creates properties on the sandbox context.\n" +
    "\n" +
    "/**\n" +
    " * Easing functions for non-linear interpolation.\n" +
    " */\n" +
    "var Easing = {\n" +
    "  linear: function (t) {\n" +
    "    return t;\n" +
    "  },\n" +
    "  easeIn: function (t) {\n" +
    "    return t * t;\n" +
    "  },\n" +
    "  easeOut: function (t) {\n" +
    "    return 1 - (1 - t) * (1 - t);\n" +
    "  },\n" +
    "  easeInOut: function (t) {\n" +
    "    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;\n" +
    "  },\n" +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Parse a numeric value, returning fallback if not finite.\n" +
    " * Shared utility used by MulmoAnimation and data-attribute registration.\n" +
    " *\n" +
    " * @param {*} value - Value to parse\n" +
    " * @param {number} fallback - Default if value is not a finite number\n" +
    " * @returns {number}\n" +
    " */\n" +
    "var toFiniteNumber = function (value, fallback) {\n" +
    "  const n = Number(value);\n" +
    "  return Number.isFinite(n) ? n : fallback;\n" +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Interpolation with clamping and optional easing.\n" +
    " *\n" +
    " * @param {number} value - Current value (typically frame number)\n" +
    " * @param {Object} opts - { input: { inMin, inMax }, output: { outMin, outMax }, easing?: string | function }\n" +
    " * @returns {number} Interpolated and clamped value\n" +
    " */\n" +
    "var interpolate = function (value, opts) {\n" +
    "  const inMin = opts.input.inMin;\n" +
    "  const inMax = opts.input.inMax;\n" +
    "  const outMin = opts.output.outMin;\n" +
    "  const outMax = opts.output.outMax;\n" +
    "  if (inMax === inMin) {\n" +
    "    return outMin;\n" +
    "  }\n" +
    '  const easing = !opts.easing ? Easing.linear : typeof opts.easing === "function" ? opts.easing : Easing[opts.easing] || Easing.linear;\n' +
    "  const progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));\n" +
    "  return outMin + easing(progress) * (outMax - outMin);\n" +
    "};\n" +
    "\n" +
    "// === MulmoAnimation Helper Class ===\n" +
    "\n" +
    'var TRANSFORM_PROPS = { translateX: "px", translateY: "px", scale: "", rotate: "deg", rotateX: "deg", rotateY: "deg", rotateZ: "deg" };\n' +
    "var SVG_PROPS = [\n" +
    '  "r",\n' +
    '  "cx",\n' +
    '  "cy",\n' +
    '  "x",\n' +
    '  "y",\n' +
    '  "x1",\n' +
    '  "y1",\n' +
    '  "x2",\n' +
    '  "y2",\n' +
    '  "rx",\n' +
    '  "ry",\n' +
    '  "width",\n' +
    '  "height",\n' +
    '  "stroke-width",\n' +
    '  "stroke-dashoffset",\n' +
    '  "stroke-dasharray",\n' +
    '  "opacity",\n' +
    "];\n" +
    "\n" +
    "var MulmoAnimation = function () {\n" +
    "  this._entries = [];\n" +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Register a property animation on a single element.\n" +
    " * @param {string} selector - CSS selector (e.g. '#title')\n" +
    " * @param {Object} props - { opacity: [0, 1], translateY: [30, 0], width: [0, 80, '%'] }\n" +
    " * @param {Object} opts - { start, end, easing }  (start/end in seconds)\n" +
    " */\n" +
    "MulmoAnimation.prototype.animate = function (selector, props, opts) {\n" +
    '  this._entries.push({ kind: "animate", selector: selector, props: props, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Stagger animation across numbered elements.\n" +
    " * Selector must contain {i} placeholder (e.g. '#item{i}').\n" +
    " */\n" +
    "MulmoAnimation.prototype.stagger = function (selector, count, props, opts) {\n" +
    '  this._entries.push({ kind: "stagger", selector: selector, count: count, props: props, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Typewriter effect — reveal text character by character. */\n" +
    "MulmoAnimation.prototype.typewriter = function (selector, text, opts) {\n" +
    '  this._entries.push({ kind: "typewriter", selector: selector, text: text, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Animated counter — interpolate a number and display with optional prefix/suffix. */\n" +
    "MulmoAnimation.prototype.counter = function (selector, range, opts) {\n" +
    '  this._entries.push({ kind: "counter", selector: selector, range: range, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Code reveal — show lines of code one by one. */\n" +
    "MulmoAnimation.prototype.codeReveal = function (selector, lines, opts) {\n" +
    '  this._entries.push({ kind: "codeReveal", selector: selector, lines: lines, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Blink — periodic show/hide toggle. */\n" +
    "MulmoAnimation.prototype.blink = function (selector, opts) {\n" +
    '  this._entries.push({ kind: "blink", selector: selector, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Cover zoom for image/video elements. */\n" +
    "MulmoAnimation.prototype.coverZoom = function (selector, opts) {\n" +
    '  this._entries.push({ kind: "coverZoom", selector: selector, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Cover pan for image/video elements with automatic black-border prevention. */\n" +
    "MulmoAnimation.prototype.coverPan = function (selector, opts) {\n" +
    '  this._entries.push({ kind: "coverPan", selector: selector, opts: opts || {} });\n' +
    "  return this;\n" +
    "};\n" +
    "\n" +
    "/** Resolve easing name string or function to an easing function */\n" +
    "MulmoAnimation.prototype._resolveEasing = function (e) {\n" +
    "  if (!e) return Easing.linear;\n" +
    '  if (typeof e === "function") return e;\n' +
    "  return Easing[e] || Easing.linear;\n" +
    "};\n" +
    "\n" +
    "/** Convert value to finite number, otherwise return fallback */\n" +
    "MulmoAnimation.prototype._toFiniteNumber = function (value, fallback) {\n" +
    "  return toFiniteNumber(value, fallback);\n" +
    "};\n" +
    "\n" +
    "/** Apply props to element at a given progress (0-1) with easing */\n" +
    "MulmoAnimation.prototype._applyProps = function (el, props, progress, easingFn) {\n" +
    "  if (!el) return;\n" +
    "  const self = this;\n" +
    "  const transforms = [];\n" +
    "  Object.keys(props).forEach(function (prop) {\n" +
    "    const spec = props[prop];\n" +
    "    const from = self._toFiniteNumber(spec[0], 0);\n" +
    "    const to = self._toFiniteNumber(spec[1], from);\n" +
    "    const unit = spec.length > 2 ? spec[2] : null;\n" +
    "    const val = from + easingFn(progress) * (to - from);\n" +
    "\n" +
    "    if (TRANSFORM_PROPS.hasOwnProperty(prop)) {\n" +
    "      const tUnit = unit || TRANSFORM_PROPS[prop];\n" +
    '      transforms.push(prop === "scale" ? "scale(" + val + ")" : prop + "(" + val + tUnit + ")");\n' +
    "    } else if (el instanceof SVGElement && SVG_PROPS.indexOf(prop) !== -1) {\n" +
    "      el.setAttribute(prop, val);\n" +
    '    } else if (prop === "opacity") {\n' +
    "      el.style.opacity = val;\n" +
    "    } else {\n" +
    '      const cssUnit = unit || "px";\n' +
    "      el.style[prop] = val + cssUnit;\n" +
    "    }\n" +
    "  });\n" +
    "  if (transforms.length > 0) {\n" +
    '    el.style.transform = transforms.join(" ");\n' +
    "  }\n" +
    "};\n" +
    "\n" +
    "/** Resolve container for cover-based helpers */\n" +
    "MulmoAnimation.prototype._resolveContainer = function (el, selector) {\n" +
    "  if (selector) return document.querySelector(selector) || (el ? el.parentElement : null);\n" +
    "  return el ? el.parentElement : null;\n" +
    "};\n" +
    "\n" +
    "/** Ensure cover target is positioned in the same container used for sizing */\n" +
    "MulmoAnimation.prototype._prepareCoverContext = function (el, container) {\n" +
    "  if (!el || !container) return null;\n" +
    "  if (el.contains(container)) {\n" +
    "    container = el.parentElement;\n" +
    "    if (!container) return null;\n" +
    "  }\n" +
    "  const computed = window.getComputedStyle(container);\n" +
    '  if (computed.position === "static") {\n' +
    '    container.style.position = "relative";\n' +
    "  }\n" +
    "  if (el.parentElement !== container) {\n" +
    "    try {\n" +
    "      container.appendChild(el);\n" +
    "    } catch (e) {\n" +
    '      console.warn("MulmoAnimation: failed to move cover element into container", e);\n' +
    "    }\n" +
    "  }\n" +
    "  return container;\n" +
    "};\n" +
    "\n" +
    "/** Calculate cover-scaled dimensions from intrinsic media size */\n" +
    "MulmoAnimation.prototype._coverSize = function (el, container, zoom) {\n" +
    "  if (!el || !container) return null;\n" +
    "  const intrinsicW = el.naturalWidth || el.videoWidth;\n" +
    "  const intrinsicH = el.naturalHeight || el.videoHeight;\n" +
    "  if (!intrinsicW || !intrinsicH) return null;\n" +
    "  const ww = container.clientWidth || container.offsetWidth;\n" +
    "  const wh = container.clientHeight || container.offsetHeight;\n" +
    "  if (!ww || !wh) return null;\n" +
    "  const cover = Math.max(ww / intrinsicW, wh / intrinsicH);\n" +
    "  const s = cover * zoom;\n" +
    "  return { ww: ww, wh: wh, iw: intrinsicW * s, ih: intrinsicH * s };\n" +
    "};\n" +
    "\n" +
    "/** Apply absolute-centered base style for cover helpers */\n" +
    "MulmoAnimation.prototype._applyCoverBaseStyle = function (el, iw, ih) {\n" +
    '  el.style.position = "absolute";\n' +
    '  el.style.top = "50%";\n' +
    '  el.style.left = "50%";\n' +
    '  el.style.transform = "translate(-50%,-50%)";\n' +
    '  el.style.maxWidth = "none";\n' +
    '  el.style.maxHeight = "none";\n' +
    '  el.style.width = iw + "px";\n' +
    '  el.style.height = ih + "px";\n' +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Render all animations at their final state (last frame).\n" +
    " * Used for generating static images (PDF, thumbnails) from animated content.\n" +
    " * @param {number} fps - frames per second\n" +
    " */\n" +
    "MulmoAnimation.prototype.renderFinal = function (fps) {\n" +
    "  const lastFrame = Math.max(0, window.__MULMO.totalFrames - 1);\n" +
    "  this.update(lastFrame, fps);\n" +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Update all registered animations for the given frame.\n" +
    " * @param {number} frame - current frame number\n" +
    " * @param {number} fps - frames per second\n" +
    " */\n" +
    "MulmoAnimation.prototype.update = function (frame, fps) {\n" +
    "  const self = this;\n" +
    "  const autoEndFrame = Math.max(0, window.__MULMO.totalFrames - 1);\n" +
    "  this._entries.forEach(function (entry) {\n" +
    "    const opts = entry.opts;\n" +
    "    const easingFn = self._resolveEasing(opts.easing);\n" +
    "\n" +
    '    if (entry.kind === "animate") {\n' +
    "      const startFrame = (opts.start || 0) * fps;\n" +
    '      const endFrame = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;\n' +
    "      const progress = Math.max(0, Math.min(1, endFrame === startFrame ? 1 : (frame - startFrame) / (endFrame - startFrame)));\n" +
    "      const el = document.querySelector(entry.selector);\n" +
    "      self._applyProps(el, entry.props, progress, easingFn);\n" +
    '    } else if (entry.kind === "stagger") {\n' +
    "      const baseStart = (opts.start || 0) * fps;\n" +
    "      const staggerDelay = (opts.stagger !== undefined ? opts.stagger : 0.2) * fps;\n" +
    "      const dur = (opts.duration !== undefined ? opts.duration : 0.5) * fps;\n" +
    "      for (let j = 0; j < entry.count; j++) {\n" +
    "        const sel = entry.selector.replace(/\\{i\\}/g, j);\n" +
    "        const sEl = document.querySelector(sel);\n" +
    "        const sStart = baseStart + j * staggerDelay;\n" +
    "        const sEnd = sStart + dur;\n" +
    "        const sProgress = Math.max(0, Math.min(1, sEnd === sStart ? 1 : (frame - sStart) / (sEnd - sStart)));\n" +
    "        self._applyProps(sEl, entry.props, sProgress, easingFn);\n" +
    "      }\n" +
    '    } else if (entry.kind === "typewriter") {\n' +
    "      const twStart = (opts.start || 0) * fps;\n" +
    '      const twEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;\n' +
    "      const twProgress = Math.max(0, Math.min(1, twEnd === twStart ? 1 : (frame - twStart) / (twEnd - twStart)));\n" +
    "      const charCount = Math.floor(twProgress * entry.text.length);\n" +
    "      const twEl = document.querySelector(entry.selector);\n" +
    "      if (twEl) twEl.textContent = entry.text.substring(0, charCount);\n" +
    '    } else if (entry.kind === "counter") {\n' +
    "      const cStart = (opts.start || 0) * fps;\n" +
    '      const cEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;\n' +
    "      const cProgress = Math.max(0, Math.min(1, cEnd === cStart ? 1 : (frame - cStart) / (cEnd - cStart)));\n" +
    "      const cVal = entry.range[0] + easingFn(cProgress) * (entry.range[1] - entry.range[0]);\n" +
    "      const decimals = opts.decimals || 0;\n" +
    '      const display = (opts.prefix || "") + cVal.toFixed(decimals) + (opts.suffix || "");\n' +
    "      const cEl = document.querySelector(entry.selector);\n" +
    "      if (cEl) cEl.textContent = display;\n" +
    '    } else if (entry.kind === "codeReveal") {\n' +
    "      const crStart = (opts.start || 0) * fps;\n" +
    '      const crEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;\n' +
    "      const crProgress = Math.max(0, Math.min(1, crEnd === crStart ? 1 : (frame - crStart) / (crEnd - crStart)));\n" +
    "      const lineCount = Math.floor(crProgress * entry.lines.length);\n" +
    "      const crEl = document.querySelector(entry.selector);\n" +
    '      if (crEl) crEl.textContent = entry.lines.slice(0, lineCount).join("\\n");\n' +
    '    } else if (entry.kind === "blink") {\n' +
    "      const interval_s = opts.interval || 0.5;\n" +
    "      const blinkEl = document.querySelector(entry.selector);\n" +
    "      if (blinkEl) {\n" +
    "        const cycle = frame / fps / interval_s;\n" +
    "        blinkEl.style.opacity = Math.floor(cycle) % 2 === 0 ? 1 : 0;\n" +
    "      }\n" +
    '    } else if (entry.kind === "coverZoom") {\n' +
    "      const zEl = document.querySelector(entry.selector);\n" +
    "      if (!zEl) return;\n" +
    "      const zContainer = self._prepareCoverContext(zEl, self._resolveContainer(zEl, opts.containerSelector));\n" +
    "      if (!zContainer) return;\n" +
    "      const zStart = (opts.start || 0) * fps;\n" +
    '      const zEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;\n' +
    "      const zProgress = Math.max(0, Math.min(1, zEnd === zStart ? 1 : (frame - zStart) / (zEnd - zStart)));\n" +
    "      const zFrom = opts.zoomFrom === undefined ? (opts.from === undefined ? 1 : self._toFiniteNumber(opts.from, 1)) : self._toFiniteNumber(opts.zoomFrom, 1);\n" +
    "      const safeZFrom = Math.max(1e-6, zFrom);\n" +
    "      const zTo =\n" +
    "        opts.zoomTo === undefined\n" +
    "          ? opts.to === undefined\n" +
    "            ? safeZFrom\n" +
    "            : self._toFiniteNumber(opts.to, safeZFrom)\n" +
    "          : self._toFiniteNumber(opts.zoomTo, safeZFrom);\n" +
    "      const safeZTo = Math.max(1e-6, zTo);\n" +
    "      const zCurrent = safeZFrom + easingFn(zProgress) * (safeZTo - safeZFrom);\n" +
    "      const zSize = self._coverSize(zEl, zContainer, zCurrent);\n" +
    "      if (!zSize) return;\n" +
    "      self._applyCoverBaseStyle(zEl, zSize.iw, zSize.ih);\n" +
    '    } else if (entry.kind === "coverPan") {\n' +
    "      const pEl = document.querySelector(entry.selector);\n" +
    "      if (!pEl) return;\n" +
    "      const pContainer = self._prepareCoverContext(pEl, self._resolveContainer(pEl, opts.containerSelector));\n" +
    "      if (!pContainer) return;\n" +
    "      const pStart = (opts.start || 0) * fps;\n" +
    '      const pEnd = opts.end === "auto" ? autoEndFrame : (opts.end || 0) * fps;\n' +
    "      const pProgress = Math.max(0, Math.min(1, pEnd === pStart ? 1 : (frame - pStart) / (pEnd - pStart)));\n" +
    '      const pAxis = opts.axis === "y" ? "y" : "x";\n' +
    "      const pDirection = self._toFiniteNumber(opts.direction, 1) < 0 ? -1 : 1;\n" +
    "      const pRequested = Math.abs(self._toFiniteNumber(opts.distance, 0));\n" +
    "      const pZoom = Math.max(1e-6, self._toFiniteNumber(opts.zoom, 1));\n" +
    "      const pSize = self._coverSize(pEl, pContainer, pZoom);\n" +
    "      if (!pSize) return;\n" +
    "      self._applyCoverBaseStyle(pEl, pSize.iw, pSize.ih);\n" +
    "\n" +
    '      const viewport = pAxis === "x" ? pSize.ww : pSize.wh;\n' +
    '      const imageSize = pAxis === "x" ? pSize.iw : pSize.ih;\n' +
    "      const maxDistancePercent = Math.max(0, ((imageSize - viewport) / 2 / viewport) * 100);\n" +
    "      const minPos = 50 - maxDistancePercent;\n" +
    "      const maxPos = 50 + maxDistancePercent;\n" +
    "      const safeRange = maxPos - minPos;\n" +
    "      const clampPercent = function (v) {\n" +
    "        return Math.max(0, Math.min(100, v));\n" +
    "      };\n" +
    "      const mapToSafePos = function (v) {\n" +
    "        return minPos + safeRange * (clampPercent(v) / 100);\n" +
    "      };\n" +
    "\n" +
    "      let panFrom, panTo;\n" +
    "      if (opts.from !== undefined || opts.to !== undefined) {\n" +
    "        const fromNorm = opts.from === undefined ? 50 : self._toFiniteNumber(opts.from, 50);\n" +
    "        const toNorm = opts.to === undefined ? fromNorm : self._toFiniteNumber(opts.to, fromNorm);\n" +
    "        panFrom = mapToSafePos(fromNorm);\n" +
    "        panTo = mapToSafePos(toNorm);\n" +
    "      } else {\n" +
    "        const distancePercent = Math.min(pRequested, maxDistancePercent);\n" +
    "        panFrom = 50;\n" +
    "        panTo = panFrom + pDirection * distancePercent;\n" +
    "      }\n" +
    "\n" +
    "      const clampedFrom = Math.max(minPos, Math.min(maxPos, panFrom));\n" +
    "      const clampedTo = Math.max(minPos, Math.min(maxPos, panTo));\n" +
    "      const current = clampedFrom + easingFn(pProgress) * (clampedTo - clampedFrom);\n" +
    '      if (pAxis === "x") {\n' +
    '        pEl.style.left = current + "%";\n' +
    '        pEl.style.top = "50%";\n' +
    "      } else {\n" +
    '        pEl.style.top = current + "%";\n' +
    '        pEl.style.left = "50%";\n' +
    "      }\n" +
    "    }\n" +
    "  });\n" +
    "};\n",
  auto_render:
    "// === Auto-render and playAnimation ===\n" +
    "// Auto-render: if MulmoAnimation is used but render() is not defined, generate it.\n" +
    "// Check both local var (from user_script) and window.animation (from data-attribute auto-registration).\n" +
    "//\n" +
    "// NOTE: Top-level declarations use `var` intentionally — see animation_runtime.js header comment.\n" +
    "var _autoAnim =\n" +
    '  typeof animation !== "undefined" && animation instanceof MulmoAnimation ? animation : window.animation instanceof MulmoAnimation ? window.animation : null;\n' +
    'if (typeof window.render !== "function" && typeof render === "function") {\n' +
    "  window.render = render;\n" +
    '} else if (typeof window.render !== "function" && _autoAnim) {\n' +
    "  window.render = function (frame, totalFrames, fps) {\n" +
    "    _autoAnim.update(frame, fps);\n" +
    "  };\n" +
    "}\n" +
    "\n" +
    "// Initial render (frame 0)\n" +
    'if (typeof window.render === "function") {\n' +
    "  try {\n" +
    "    var _initResult = window.render(0, window.__MULMO.totalFrames, window.__MULMO.fps);\n" +
    '    if (_initResult && typeof _initResult.then === "function") {\n' +
    "      _initResult.catch(console.error);\n" +
    "    }\n" +
    "  } catch (e) {\n" +
    '    console.error("MulmoAnimation: initial render failed", e);\n' +
    "  }\n" +
    "}\n" +
    "\n" +
    "/**\n" +
    " * Render the final frame of the animation (all content fully visible).\n" +
    " * Used by Puppeteer to capture a static image for PDF/thumbnail generation.\n" +
    " * Returns a Promise (or value) from the render function.\n" +
    " */\n" +
    "window.renderFinal = function () {\n" +
    "  const mulmo = window.__MULMO;\n" +
    "  const lastFrame = Math.max(0, (mulmo.totalFrames || 0) - 1);\n" +
    "  mulmo.frame = lastFrame;\n" +
    '  if (typeof window.render === "function") {\n' +
    "    return window.render(lastFrame, mulmo.totalFrames, mulmo.fps);\n" +
    "  }\n" +
    "};\n" +
    "\n" +
    "/**\n" +
    " * Play animation in real-time using requestAnimationFrame.\n" +
    " * Returns a Promise that resolves when all frames have been rendered.\n" +
    " * Called by Puppeteer's page.evaluate() during screencast recording.\n" +
    " */\n" +
    "window.playAnimation = function () {\n" +
    "  return new Promise(function (resolve, reject) {\n" +
    "    const mulmo = window.__MULMO;\n" +
    "    const fps = mulmo.fps;\n" +
    "    const totalFrames = mulmo.totalFrames;\n" +
    "    const frameDuration = 1000 / fps;\n" +
    "    let startTime = null;\n" +
    "\n" +
    "    async function tick(timestamp) {\n" +
    "      if (startTime === null) startTime = timestamp;\n" +
    "      const elapsed = timestamp - startTime;\n" +
    "      const frame = Math.min(Math.floor(elapsed / frameDuration), totalFrames - 1);\n" +
    "\n" +
    "      mulmo.frame = frame;\n" +
    '      if (typeof window.render === "function") {\n' +
    "        await Promise.resolve(window.render(frame, totalFrames, fps));\n" +
    "      }\n" +
    "\n" +
    "      if (frame < totalFrames - 1) {\n" +
    "        requestAnimationFrame(function (nextTimestamp) {\n" +
    "          tick(nextTimestamp).catch(reject);\n" +
    "        });\n" +
    "      } else {\n" +
    "        resolve();\n" +
    "      }\n" +
    "    }\n" +
    "\n" +
    "    requestAnimationFrame(function (timestamp) {\n" +
    "      tick(timestamp).catch(reject);\n" +
    "    });\n" +
    "  });\n" +
    "};\n",
  data_attribute_registration:
    "// === Data-attribute animation auto-registration ===\n" +
    "// Scan [data-animation] elements and register MulmoAnimation entries automatically.\n" +
    "// This lets users declare animations in HTML without writing JS.\n" +
    "//\n" +
    "// Supported data-animation values and their data-* params:\n" +
    "//   animate    — data-opacity, data-translate-x, data-translate-y, data-scale,\n" +
    "//                data-rotate, data-rotate-x, data-rotate-y, data-rotate-z,\n" +
    '//                data-width (use "80,%" for value+unit)\n' +
    "//   stagger    — same props as animate + data-count, data-stagger, data-duration\n" +
    "//   counter    — data-from, data-to, data-prefix, data-suffix, data-decimals\n" +
    "//   typewriter — data-text\n" +
    "//   codeReveal — data-lines (JSON array string)\n" +
    "//   blink      — data-interval\n" +
    "//   coverZoom  — data-zoom-from, data-zoom-to (or data-from, data-to)\n" +
    "//   coverPan   — data-axis, data-direction, data-distance, data-from, data-to, data-zoom\n" +
    "//\n" +
    "// Common opts: data-start, data-end, data-easing, data-container\n" +
    "(function () {\n" +
    '  const els = document.querySelectorAll("[data-animation]");\n' +
    "  if (els.length === 0) return;\n" +
    "\n" +
    "  // Reuse existing animation instance from user script, or create new one\n" +
    '  const _anim = typeof animation !== "undefined" && animation instanceof MulmoAnimation ? animation : new MulmoAnimation();\n' +
    "\n" +
    "  function parseRange(v) {\n" +
    `    // "0,1" → [0, 1] or "0,80,%" → [0, 80, '%']\n` +
    "    if (!v) return null;\n" +
    '    const parts = v.split(",");\n' +
    "    const result = [];\n" +
    "    parts.forEach(function (p) {\n" +
    "      const trimmed = p.trim();\n" +
    "      const n = Number(trimmed);\n" +
    "      result.push(Number.isFinite(n) ? n : trimmed);\n" +
    "    });\n" +
    "    return result;\n" +
    "  }\n" +
    "\n" +
    "  function commonOpts(el) {\n" +
    "    const opts = {};\n" +
    '    const start = el.getAttribute("data-start");\n' +
    '    const end = el.getAttribute("data-end");\n' +
    '    const easing = el.getAttribute("data-easing");\n' +
    '    const container = el.getAttribute("data-container");\n' +
    "    if (start !== null) opts.start = toFiniteNumber(start, 0);\n" +
    '    if (end !== null) opts.end = end === "auto" ? "auto" : toFiniteNumber(end, 0);\n' +
    '    else opts.end = "auto";\n' +
    "    if (easing) opts.easing = easing;\n" +
    "    if (container) opts.containerSelector = container;\n" +
    "    return opts;\n" +
    "  }\n" +
    "\n" +
    "  // Animate prop names that map to data-* attributes\n" +
    "  const ANIMATE_ATTRS = [\n" +
    '    ["data-opacity", "opacity"],\n' +
    '    ["data-translate-x", "translateX"],\n' +
    '    ["data-translate-y", "translateY"],\n' +
    '    ["data-scale", "scale"],\n' +
    '    ["data-rotate", "rotate"],\n' +
    '    ["data-rotate-x", "rotateX"],\n' +
    '    ["data-rotate-y", "rotateY"],\n' +
    '    ["data-rotate-z", "rotateZ"],\n' +
    '    ["data-width", "width"],\n' +
    '    ["data-height", "height"],\n' +
    "  ];\n" +
    "\n" +
    "  function parseAnimateProps(el) {\n" +
    "    const props = {};\n" +
    "    ANIMATE_ATTRS.forEach(function (pair) {\n" +
    "      const val = el.getAttribute(pair[0]);\n" +
    "      if (val !== null) {\n" +
    "        const range = parseRange(val);\n" +
    "        if (range) props[pair[1]] = range;\n" +
    "      }\n" +
    "    });\n" +
    "    return props;\n" +
    "  }\n" +
    "\n" +
    "  // Generate unique selector for element (add id if missing)\n" +
    "  let autoIdCounter = 0;\n" +
    "  function ensureSelector(el) {\n" +
    '    if (el.id) return "#" + el.id;\n' +
    '    const id = "__mulmo_da_" + autoIdCounter++;\n' +
    "    el.id = id;\n" +
    '    return "#" + id;\n' +
    "  }\n" +
    "\n" +
    "  els.forEach(function (el) {\n" +
    '    const kind = el.getAttribute("data-animation");\n' +
    "    const selector = ensureSelector(el);\n" +
    "    const opts = commonOpts(el);\n" +
    "\n" +
    "    switch (kind) {\n" +
    '      case "animate": {\n' +
    "        const props = parseAnimateProps(el);\n" +
    "        if (Object.keys(props).length > 0) {\n" +
    "          _anim.animate(selector, props, opts);\n" +
    "        }\n" +
    "        break;\n" +
    "      }\n" +
    '      case "stagger": {\n' +
    "        const sProps = parseAnimateProps(el);\n" +
    '        const count = toFiniteNumber(el.getAttribute("data-count"), 0);\n' +
    '        opts.stagger = toFiniteNumber(el.getAttribute("data-stagger"), 0.2);\n' +
    '        opts.duration = toFiniteNumber(el.getAttribute("data-duration"), 0.5);\n' +
    "        if (Object.keys(sProps).length > 0 && count > 0) {\n" +
    "          _anim.stagger(selector, count, sProps, opts);\n" +
    "        }\n" +
    "        break;\n" +
    "      }\n" +
    '      case "counter": {\n' +
    '        const from = toFiniteNumber(el.getAttribute("data-from"), 0);\n' +
    '        const to = toFiniteNumber(el.getAttribute("data-to"), 0);\n' +
    '        opts.prefix = el.getAttribute("data-prefix") || "";\n' +
    '        opts.suffix = el.getAttribute("data-suffix") || "";\n' +
    '        opts.decimals = toFiniteNumber(el.getAttribute("data-decimals"), 0);\n' +
    "        _anim.counter(selector, [from, to], opts);\n" +
    "        break;\n" +
    "      }\n" +
    '      case "typewriter": {\n' +
    '        const text = el.getAttribute("data-text") || el.textContent || "";\n' +
    "        _anim.typewriter(selector, text, opts);\n" +
    "        break;\n" +
    "      }\n" +
    '      case "codeReveal": {\n' +
    '        const linesStr = el.getAttribute("data-lines");\n' +
    "        let lines = [];\n" +
    "        if (linesStr) {\n" +
    "          try {\n" +
    "            const parsed = JSON.parse(linesStr);\n" +
    "            lines = Array.isArray(parsed) ? parsed : [String(parsed)];\n" +
    "          } catch (e) {\n" +
    '            console.warn("MulmoAnimation: failed to parse data-lines", e);\n' +
    "            lines = [linesStr];\n" +
    "          }\n" +
    "        }\n" +
    "        _anim.codeReveal(selector, lines, opts);\n" +
    "        break;\n" +
    "      }\n" +
    '      case "blink": {\n' +
    '        opts.interval = toFiniteNumber(el.getAttribute("data-interval"), 0.5);\n' +
    "        _anim.blink(selector, opts);\n" +
    "        break;\n" +
    "      }\n" +
    '      case "coverZoom": {\n' +
    '        const zf = el.getAttribute("data-zoom-from");\n' +
    '        const zt = el.getAttribute("data-zoom-to");\n' +
    "        if (zf !== null) opts.zoomFrom = toFiniteNumber(zf, 1);\n" +
    "        if (zt !== null) opts.zoomTo = toFiniteNumber(zt, 1);\n" +
    "        if (zf === null && zt === null) {\n" +
    '          const cf = el.getAttribute("data-from");\n' +
    '          const ct = el.getAttribute("data-to");\n' +
    "          if (cf !== null) opts.from = toFiniteNumber(cf, 1);\n" +
    "          if (ct !== null) opts.to = toFiniteNumber(ct, 1);\n" +
    "        }\n" +
    "        _anim.coverZoom(selector, opts);\n" +
    "        break;\n" +
    "      }\n" +
    '      case "coverPan": {\n' +
    '        opts.axis = el.getAttribute("data-axis") || "x";\n' +
    '        const dir = el.getAttribute("data-direction");\n' +
    '        const dist = el.getAttribute("data-distance");\n' +
    '        const pFrom = el.getAttribute("data-from");\n' +
    '        const pTo = el.getAttribute("data-to");\n' +
    '        const pZoom = el.getAttribute("data-zoom");\n' +
    "        if (dir !== null) opts.direction = toFiniteNumber(dir, 1);\n" +
    "        if (dist !== null) opts.distance = toFiniteNumber(dist, 0);\n" +
    "        if (pFrom !== null) opts.from = toFiniteNumber(pFrom, 50);\n" +
    "        if (pTo !== null) opts.to = toFiniteNumber(pTo, 50);\n" +
    "        if (pZoom !== null) opts.zoom = toFiniteNumber(pZoom, 1);\n" +
    "        _anim.coverPan(selector, opts);\n" +
    "        break;\n" +
    "      }\n" +
    "    }\n" +
    "  });\n" +
    "\n" +
    "  // Expose as global so auto-render picks it up\n" +
    "  window.animation = _anim;\n" +
    "})();\n",
};
