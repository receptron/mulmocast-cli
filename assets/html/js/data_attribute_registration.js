// === Data-attribute animation auto-registration ===
// Scan [data-animation] elements and register MulmoAnimation entries automatically.
// This lets users declare animations in HTML without writing JS.
//
// Supported data-animation values and their data-* params:
//   animate    — data-opacity, data-translate-x, data-translate-y, data-scale,
//                data-rotate, data-rotate-x, data-rotate-y, data-rotate-z,
//                data-width (use "80,%" for value+unit)
//   stagger    — same props as animate + data-count, data-stagger, data-duration
//   counter    — data-from, data-to, data-prefix, data-suffix, data-decimals
//   typewriter — data-text
//   codeReveal — data-lines (JSON array string)
//   blink      — data-interval
//   coverZoom  — data-zoom-from, data-zoom-to (or data-from, data-to)
//   coverPan   — data-axis, data-direction, data-distance, data-from, data-to, data-zoom
//
// Common opts: data-start, data-end, data-easing, data-container
(function () {
  const els = document.querySelectorAll("[data-animation]");
  if (els.length === 0) return;

  // Reuse existing animation instance from user script, or create new one
  const _anim = typeof animation !== "undefined" && animation instanceof MulmoAnimation ? animation : new MulmoAnimation();

  function parseRange(v) {
    // "0,1" → [0, 1] or "0,80,%" → [0, 80, '%']
    if (!v) return null;
    const parts = v.split(",");
    const result = [];
    parts.forEach(function (p) {
      const trimmed = p.trim();
      const n = Number(trimmed);
      result.push(Number.isFinite(n) ? n : trimmed);
    });
    return result;
  }

  function commonOpts(el) {
    const opts = {};
    const start = el.getAttribute("data-start");
    const end = el.getAttribute("data-end");
    const easing = el.getAttribute("data-easing");
    const container = el.getAttribute("data-container");
    if (start !== null) opts.start = toFiniteNumber(start, 0);
    if (end !== null) opts.end = end === "auto" ? "auto" : toFiniteNumber(end, 0);
    else opts.end = "auto";
    if (easing) opts.easing = easing;
    if (container) opts.containerSelector = container;
    return opts;
  }

  // Animate prop names that map to data-* attributes
  const ANIMATE_ATTRS = [
    ["data-opacity", "opacity"],
    ["data-translate-x", "translateX"],
    ["data-translate-y", "translateY"],
    ["data-scale", "scale"],
    ["data-rotate", "rotate"],
    ["data-rotate-x", "rotateX"],
    ["data-rotate-y", "rotateY"],
    ["data-rotate-z", "rotateZ"],
    ["data-width", "width"],
    ["data-height", "height"],
  ];

  function parseAnimateProps(el) {
    const props = {};
    ANIMATE_ATTRS.forEach(function (pair) {
      const val = el.getAttribute(pair[0]);
      if (val !== null) {
        const range = parseRange(val);
        if (range) props[pair[1]] = range;
      }
    });
    return props;
  }

  // Generate unique selector for element (add id if missing)
  let autoIdCounter = 0;
  function ensureSelector(el) {
    if (el.id) return "#" + el.id;
    const id = "__mulmo_da_" + autoIdCounter++;
    el.id = id;
    return "#" + id;
  }

  els.forEach(function (el) {
    const kind = el.getAttribute("data-animation");
    const selector = ensureSelector(el);
    const opts = commonOpts(el);

    switch (kind) {
      case "animate": {
        const props = parseAnimateProps(el);
        if (Object.keys(props).length > 0) {
          _anim.animate(selector, props, opts);
        }
        break;
      }
      case "stagger": {
        const sProps = parseAnimateProps(el);
        const count = toFiniteNumber(el.getAttribute("data-count"), 0);
        opts.stagger = toFiniteNumber(el.getAttribute("data-stagger"), 0.2);
        opts.duration = toFiniteNumber(el.getAttribute("data-duration"), 0.5);
        if (Object.keys(sProps).length > 0 && count > 0) {
          _anim.stagger(selector, count, sProps, opts);
        }
        break;
      }
      case "counter": {
        const from = toFiniteNumber(el.getAttribute("data-from"), 0);
        const to = toFiniteNumber(el.getAttribute("data-to"), 0);
        opts.prefix = el.getAttribute("data-prefix") || "";
        opts.suffix = el.getAttribute("data-suffix") || "";
        opts.decimals = toFiniteNumber(el.getAttribute("data-decimals"), 0);
        _anim.counter(selector, [from, to], opts);
        break;
      }
      case "typewriter": {
        const text = el.getAttribute("data-text") || el.textContent || "";
        _anim.typewriter(selector, text, opts);
        break;
      }
      case "codeReveal": {
        const linesStr = el.getAttribute("data-lines");
        let lines = [];
        if (linesStr) {
          try {
            const parsed = JSON.parse(linesStr);
            lines = Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch (e) {
            console.warn("MulmoAnimation: failed to parse data-lines", e);
            lines = [linesStr];
          }
        }
        _anim.codeReveal(selector, lines, opts);
        break;
      }
      case "blink": {
        opts.interval = toFiniteNumber(el.getAttribute("data-interval"), 0.5);
        _anim.blink(selector, opts);
        break;
      }
      case "coverZoom": {
        const zf = el.getAttribute("data-zoom-from");
        const zt = el.getAttribute("data-zoom-to");
        if (zf !== null) opts.zoomFrom = toFiniteNumber(zf, 1);
        if (zt !== null) opts.zoomTo = toFiniteNumber(zt, 1);
        if (zf === null && zt === null) {
          const cf = el.getAttribute("data-from");
          const ct = el.getAttribute("data-to");
          if (cf !== null) opts.from = toFiniteNumber(cf, 1);
          if (ct !== null) opts.to = toFiniteNumber(ct, 1);
        }
        _anim.coverZoom(selector, opts);
        break;
      }
      case "coverPan": {
        opts.axis = el.getAttribute("data-axis") || "x";
        const dir = el.getAttribute("data-direction");
        const dist = el.getAttribute("data-distance");
        const pFrom = el.getAttribute("data-from");
        const pTo = el.getAttribute("data-to");
        const pZoom = el.getAttribute("data-zoom");
        if (dir !== null) opts.direction = toFiniteNumber(dir, 1);
        if (dist !== null) opts.distance = toFiniteNumber(dist, 0);
        if (pFrom !== null) opts.from = toFiniteNumber(pFrom, 50);
        if (pTo !== null) opts.to = toFiniteNumber(pTo, 50);
        if (pZoom !== null) opts.zoom = toFiniteNumber(pZoom, 1);
        _anim.coverPan(selector, opts);
        break;
      }
    }
  });

  // Expose as global so auto-render picks it up
  window.animation = _anim;
})();
