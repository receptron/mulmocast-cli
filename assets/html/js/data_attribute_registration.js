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
(function() {
  var els = document.querySelectorAll('[data-animation]');
  if (els.length === 0) return;

  // Reuse existing animation instance from user script, or create new one
  var _anim = (typeof animation !== 'undefined' && animation instanceof MulmoAnimation)
    ? animation : new MulmoAnimation();

  function parseNum(v, fallback) {
    if (v === undefined || v === null) return fallback;
    var n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseRange(v) {
    // "0,1" → [0, 1] or "0,80,%" → [0, 80, '%']
    if (!v) return null;
    var parts = v.split(',');
    var result = [];
    parts.forEach(function(p) {
      var trimmed = p.trim();
      var n = Number(trimmed);
      result.push(Number.isFinite(n) ? n : trimmed);
    });
    return result;
  }

  function commonOpts(el) {
    var opts = {};
    var start = el.getAttribute('data-start');
    var end = el.getAttribute('data-end');
    var easing = el.getAttribute('data-easing');
    var container = el.getAttribute('data-container');
    if (start !== null) opts.start = parseNum(start, 0);
    if (end !== null) opts.end = end === 'auto' ? 'auto' : parseNum(end, 0);
    else opts.end = 'auto';
    if (easing) opts.easing = easing;
    if (container) opts.containerSelector = container;
    return opts;
  }

  // Animate prop names that map to data-* attributes
  var ANIMATE_ATTRS = [
    ['data-opacity', 'opacity'],
    ['data-translate-x', 'translateX'],
    ['data-translate-y', 'translateY'],
    ['data-scale', 'scale'],
    ['data-rotate', 'rotate'],
    ['data-rotate-x', 'rotateX'],
    ['data-rotate-y', 'rotateY'],
    ['data-rotate-z', 'rotateZ'],
    ['data-width', 'width'],
    ['data-height', 'height'],
  ];

  function parseAnimateProps(el) {
    var props = {};
    ANIMATE_ATTRS.forEach(function(pair) {
      var val = el.getAttribute(pair[0]);
      if (val !== null) {
        var range = parseRange(val);
        if (range) props[pair[1]] = range;
      }
    });
    return props;
  }

  // Generate unique selector for element (add id if missing)
  var autoIdCounter = 0;
  function ensureSelector(el) {
    if (el.id) return '#' + el.id;
    var id = '__mulmo_da_' + (autoIdCounter++);
    el.id = id;
    return '#' + id;
  }

  els.forEach(function(el) {
    var kind = el.getAttribute('data-animation');
    var selector = ensureSelector(el);
    var opts = commonOpts(el);

    switch (kind) {
      case 'animate': {
        var props = parseAnimateProps(el);
        if (Object.keys(props).length > 0) {
          _anim.animate(selector, props, opts);
        }
        break;
      }
      case 'stagger': {
        var sProps = parseAnimateProps(el);
        var count = parseNum(el.getAttribute('data-count'), 0);
        opts.stagger = parseNum(el.getAttribute('data-stagger'), 0.2);
        opts.duration = parseNum(el.getAttribute('data-duration'), 0.5);
        if (Object.keys(sProps).length > 0 && count > 0) {
          _anim.stagger(selector, count, sProps, opts);
        }
        break;
      }
      case 'counter': {
        var from = parseNum(el.getAttribute('data-from'), 0);
        var to = parseNum(el.getAttribute('data-to'), 0);
        opts.prefix = el.getAttribute('data-prefix') || '';
        opts.suffix = el.getAttribute('data-suffix') || '';
        opts.decimals = parseNum(el.getAttribute('data-decimals'), 0);
        _anim.counter(selector, [from, to], opts);
        break;
      }
      case 'typewriter': {
        var text = el.getAttribute('data-text') || el.textContent || '';
        _anim.typewriter(selector, text, opts);
        break;
      }
      case 'codeReveal': {
        var linesStr = el.getAttribute('data-lines');
        var lines = linesStr ? JSON.parse(linesStr) : [];
        _anim.codeReveal(selector, lines, opts);
        break;
      }
      case 'blink': {
        opts.interval = parseNum(el.getAttribute('data-interval'), 0.5);
        _anim.blink(selector, opts);
        break;
      }
      case 'coverZoom': {
        var zf = el.getAttribute('data-zoom-from');
        var zt = el.getAttribute('data-zoom-to');
        if (zf !== null) opts.zoomFrom = parseNum(zf, 1);
        if (zt !== null) opts.zoomTo = parseNum(zt, 1);
        if (zf === null && zt === null) {
          var cf = el.getAttribute('data-from');
          var ct = el.getAttribute('data-to');
          if (cf !== null) opts.from = parseNum(cf, 1);
          if (ct !== null) opts.to = parseNum(ct, 1);
        }
        _anim.coverZoom(selector, opts);
        break;
      }
      case 'coverPan': {
        opts.axis = el.getAttribute('data-axis') || 'x';
        var dir = el.getAttribute('data-direction');
        var dist = el.getAttribute('data-distance');
        var pFrom = el.getAttribute('data-from');
        var pTo = el.getAttribute('data-to');
        var pZoom = el.getAttribute('data-zoom');
        if (dir !== null) opts.direction = parseNum(dir, 1);
        if (dist !== null) opts.distance = parseNum(dist, 0);
        if (pFrom !== null) opts.from = parseNum(pFrom, 50);
        if (pTo !== null) opts.to = parseNum(pTo, 50);
        if (pZoom !== null) opts.zoom = parseNum(pZoom, 1);
        _anim.coverPan(selector, opts);
        break;
      }
    }
  });

  // Expose as global so auto-render picks it up
  window.animation = _anim;
})();
