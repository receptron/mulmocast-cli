export interface SwipeTransition {
  opacity?: number;
  rotate?: number;
  scale?: number | [number, number];
  translate?: [number, number];
  bc?: string;
  timing?: [number, number];
}

export interface SwipeLoop {
  style: "vibrate" | "blink" | "wiggle" | "spin" | "shift" | "bounce" | "pulse";
  count?: number;
  delta?: number;
  duration?: number;
  direction?: "n" | "s" | "e" | "w";
  clockwise?: boolean;
}

export interface SwipeShadow {
  color?: string;
  offset?: [number, number];
  opacity?: number;
  radius?: number;
}

export interface SwipeElement {
  id?: string;
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number | string;
  pos?: [number | string, number | string];
  bc?: string;
  opacity?: number;
  rotate?: number;
  scale?: number | [number, number];
  translate?: [number, number];
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: SwipeShadow;
  clip?: boolean;
  text?: string;
  fontSize?: number | string;
  fontWeight?: string;
  textColor?: string;
  textAlign?: "center" | "left" | "right";
  lineHeight?: number | string;
  img?: string;
  imgFit?: "contain" | "cover" | "fill";
  to?: SwipeTransition;
  loop?: SwipeLoop;
  elements?: SwipeElement[];
}

const escapeHtml = (str: string): string => {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
};

const toCssValue = (value: number | string): string => {
  return typeof value === "number" ? `${value}px` : value;
};

const buildElementStyle = (el: SwipeElement): string => {
  const styles: string[] = ["position: absolute;"];

  if (el.pos) {
    styles.push(`left: ${toCssValue(el.pos[0])};`);
    styles.push(`top: ${toCssValue(el.pos[1])};`);
  } else {
    if (el.x !== undefined) styles.push(`left: ${toCssValue(el.x)};`);
    if (el.y !== undefined) styles.push(`top: ${toCssValue(el.y)};`);
  }

  if (el.w !== undefined) styles.push(`width: ${toCssValue(el.w)};`);
  if (el.h !== undefined) styles.push(`height: ${toCssValue(el.h)};`);
  if (el.bc) styles.push(`background: ${el.bc};`);
  if (el.opacity !== undefined) styles.push(`opacity: ${el.opacity};`);
  if (el.cornerRadius !== undefined) styles.push(`border-radius: ${el.cornerRadius}px;`);
  if (el.borderWidth !== undefined) styles.push(`border: ${el.borderWidth}px solid ${el.borderColor ?? "black"};`);
  if (el.clip) styles.push("overflow: hidden;");

  if (el.shadow) {
    const s = el.shadow;
    const ox = s.offset?.[0] ?? 1;
    const oy = s.offset?.[1] ?? 1;
    const opacity = s.opacity ?? 0.5;
    const radius = s.radius ?? 1;
    styles.push(`filter: drop-shadow(${ox}px ${oy}px ${radius}px rgba(0,0,0,${opacity}));`);
  }

  const transforms: string[] = [];
  if (el.pos) transforms.push("translate(-50%, -50%)");
  if (el.rotate) transforms.push(`rotate(${el.rotate}deg)`);
  if (el.scale !== undefined) {
    const [sx, sy] = Array.isArray(el.scale) ? el.scale : [el.scale, el.scale];
    transforms.push(`scale(${sx}, ${sy})`);
  }
  if (el.translate) transforms.push(`translate(${el.translate[0]}px, ${el.translate[1]}px)`);
  if (transforms.length > 0) {
    styles.push(`transform: ${transforms.join(" ")};`);
  }

  return styles.join(" ");
};

const buildTextStyle = (el: SwipeElement): string => {
  const styles: string[] = [];
  if (el.fontSize) styles.push(`font-size: ${toCssValue(el.fontSize)};`);
  if (el.fontWeight) styles.push(`font-weight: ${el.fontWeight};`);
  if (el.textColor) styles.push(`color: ${el.textColor};`);
  if (el.textAlign) styles.push(`text-align: ${el.textAlign};`);
  if (el.lineHeight) styles.push(`line-height: ${toCssValue(el.lineHeight)};`);
  return styles.join(" ");
};

const elementToHtml = (el: SwipeElement, index: number): string => {
  const id = el.id ?? `swipe_el_${index}`;
  const style = buildElementStyle(el);
  const textStyle = buildTextStyle(el);
  const lines: string[] = [];

  lines.push(`<div id="${escapeHtml(id)}" style="${escapeHtml(style)}">`);

  if (el.img) {
    const fit = el.imgFit ?? "contain";
    lines.push(`  <img src="${escapeHtml(el.img)}" style="width:100%; height:100%; object-fit:${fit};" />`);
  }

  if (el.text) {
    lines.push(`  <span style="${escapeHtml(textStyle)}">${escapeHtml(el.text)}</span>`);
  }

  if (el.elements) {
    el.elements.forEach((child: SwipeElement, childIdx: number) => {
      lines.push(elementToHtml(child, index * 100 + childIdx));
    });
  }

  lines.push("</div>");
  return lines.join("\n");
};

/** Generate HTML from Swipe elements */
export const swipeElementsToHtml = (elements: SwipeElement[]): string => {
  const html = elements.map((el, i) => elementToHtml(el, i)).join("\n");
  return `<div style="position:relative; width:100%; height:100%; overflow:hidden;">\n${html}\n</div>`;
};

// --- Script generation for animations ---

interface AnimationEntry {
  id: string;
  to?: SwipeElement["to"];
  loop?: SwipeElement["loop"];
}

const collectAnimations = (elements: SwipeElement[], entries: AnimationEntry[], indexBase: number = 0): void => {
  elements.forEach((el, i) => {
    const id = el.id ?? `swipe_el_${indexBase + i}`;
    if (el.to || el.loop) {
      entries.push({ id, to: el.to, loop: el.loop });
    }
    if (el.elements) {
      collectAnimations(el.elements, entries, (indexBase + i) * 100);
    }
  });
};

const generateTransitionCode = (id: string, to: NonNullable<SwipeElement["to"]>): string => {
  const timing = to.timing ?? [0, 1];
  const props: string[] = [];

  if (to.opacity !== undefined) props.push(`opacity: [undefined, ${to.opacity}]`);
  if (to.rotate !== undefined) props.push(`rotate: [undefined, ${to.rotate}]`);
  if (to.translate) props.push(`translateX: [undefined, ${to.translate[0]}], translateY: [undefined, ${to.translate[1]}]`);
  if (to.scale !== undefined) {
    const [sx, sy] = Array.isArray(to.scale) ? to.scale : [to.scale, to.scale];
    props.push(`scaleX: [undefined, ${sx}], scaleY: [undefined, ${sy}]`);
  }
  if (to.bc) props.push(`backgroundColor: [undefined, '${to.bc}']`);

  return `animation.animate('#${id}', { ${props.join(", ")} }, { start: ${timing[0]}, end: ${timing[1]}, easing: 'easeOut' });`;
};

const generateLoopCode = (id: string, loop: NonNullable<SwipeElement["loop"]>): string => {
  const count = loop.count ?? 1;
  const dur = loop.duration ?? 1;
  const infinite = count === 0;
  const base: Record<string, unknown> = { id, style: loop.style, duration: dur, count, infinite };

  switch (loop.style) {
    case "wiggle":
      return `__swipe_loops.push(${JSON.stringify({ ...base, delta: loop.delta ?? 15 })});`;
    case "vibrate":
      return `__swipe_loops.push(${JSON.stringify({ ...base, delta: loop.delta ?? 10 })});`;
    case "bounce":
      return `__swipe_loops.push(${JSON.stringify({ ...base, delta: loop.delta ?? 20 })});`;
    case "pulse":
      return `__swipe_loops.push(${JSON.stringify({ ...base, delta: loop.delta ?? 0.1 })});`;
    case "blink":
      return `__swipe_loops.push(${JSON.stringify(base)});`;
    case "spin":
      return `__swipe_loops.push(${JSON.stringify({ ...base, clockwise: loop.clockwise !== false })});`;
    case "shift":
      return `__swipe_loops.push(${JSON.stringify({ ...base, direction: loop.direction ?? "s" })});`;
  }
};

/** Generate render() script from Swipe element animations */
export const swipeElementsToScript = (elements: SwipeElement[]): string => {
  const entries: AnimationEntry[] = [];
  collectAnimations(elements, entries);

  if (entries.length === 0) return "";

  const lines: string[] = [];

  // Transition animations via MulmoAnimation
  const hasTransitions = entries.some((e) => e.to);
  if (hasTransitions) {
    lines.push("const animation = new MulmoAnimation();");
    entries.forEach((entry) => {
      if (entry.to) {
        lines.push(generateTransitionCode(entry.id, entry.to));
      }
    });
  }

  // Loop animations via custom render
  const hasLoops = entries.some((e) => e.loop);
  if (hasLoops) {
    lines.push("const __swipe_loops = [];");
    entries.forEach((entry) => {
      if (entry.loop) {
        lines.push(generateLoopCode(entry.id, entry.loop));
      }
    });

    lines.push("");
    lines.push(LOOP_PROCESSOR);

    // Store base transforms on init
    lines.push("");
    lines.push("(function() {");
    lines.push("  __swipe_loops.forEach(function(lp) {");
    lines.push("    const el = document.getElementById(lp.id);");
    lines.push("    if (el) el.dataset.baseTransform = el.style.transform || '';");
    lines.push("  });");
    lines.push("})();");
  }

  // Generate render function
  if (hasTransitions && hasLoops) {
    lines.push("");
    lines.push("function render(frame, totalFrames, fps) {");
    lines.push("  animation.update(frame, fps);");
    lines.push("  __processLoops(frame / fps);");
    lines.push("}");
  } else if (hasLoops) {
    lines.push("");
    lines.push("function render(frame, totalFrames, fps) {");
    lines.push("  __processLoops(frame / fps);");
    lines.push("}");
  }

  return lines.join("\n");
};

const LOOP_PROCESSOR = `function __processLoops(t) {
  __swipe_loops.forEach(function(lp) {
    var el = document.getElementById(lp.id);
    if (!el) return;
    var cycleT = lp.duration > 0 ? (t % lp.duration) / lp.duration : 0;
    var totalCycles = lp.duration > 0 ? t / lp.duration : 0;
    if (!lp.infinite && totalCycles >= lp.count) return;
    var phase = cycleT * Math.PI * 2;
    var base = el.dataset.baseTransform || '';
    switch(lp.style) {
      case 'wiggle':
        el.style.transform = base + ' rotate(' + (Math.sin(phase) * lp.delta) + 'deg)';
        break;
      case 'vibrate':
        el.style.transform = base + ' translateX(' + (Math.sin(phase) * lp.delta) + 'px)';
        break;
      case 'bounce':
        el.style.transform = base + ' translateY(' + (-Math.abs(Math.sin(phase)) * lp.delta) + 'px)';
        break;
      case 'pulse':
        var s = 1 + Math.sin(phase) * lp.delta;
        el.style.transform = base + ' scale(' + s + ')';
        break;
      case 'blink':
        el.style.opacity = 0.5 + Math.sin(phase) * 0.5;
        break;
      case 'spin': {
        var deg = lp.clockwise ? cycleT * 360 : -cycleT * 360;
        el.style.transform = base + ' rotate(' + deg + 'deg)';
        break;
      }
      case 'shift': {
        var dist = cycleT * 100;
        var dx = lp.direction === 'e' ? dist : lp.direction === 'w' ? -dist : 0;
        var dy = lp.direction === 's' ? dist : lp.direction === 'n' ? -dist : 0;
        el.style.transform = base + ' translate(' + dx + '%, ' + dy + '%)';
        break;
      }
    }
  });
}`;
