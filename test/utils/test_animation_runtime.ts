import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsDir = path.resolve(__dirname, "../../assets/html/js");

const JS_FILES = ["animation_runtime.js", "data_attribute_registration.js", "auto_render.js"];

const readJSFile = (filename: string) => fs.readFileSync(path.join(jsDir, filename), "utf-8");

const loadRuntime = () => {
  const code = readJSFile("animation_runtime.js");
  const context = vm.createContext({
    window: { __MULMO: { totalFrames: 120, fps: 30 } },
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    console,
    Number,
    Math,
    Object,
    JSON,
    SVGElement: class SVGElement {},
  });
  // eslint-disable-next-line sonarjs/code-eval -- intentional: testing browser JS in Node.js via vm sandbox
  vm.runInContext(code, context);
  return context;
};

describe("Easing functions", () => {
  const ctx = loadRuntime();
  const Easing = ctx.Easing;

  it("linear returns input unchanged", () => {
    assert.equal(Easing.linear(0), 0);
    assert.equal(Easing.linear(0.5), 0.5);
    assert.equal(Easing.linear(1), 1);
  });

  it("easeIn starts slow (quadratic)", () => {
    assert.equal(Easing.easeIn(0), 0);
    assert.equal(Easing.easeIn(0.5), 0.25);
    assert.equal(Easing.easeIn(1), 1);
  });

  it("easeOut starts fast", () => {
    assert.equal(Easing.easeOut(0), 0);
    assert.equal(Easing.easeOut(0.5), 0.75);
    assert.equal(Easing.easeOut(1), 1);
  });

  it("easeInOut is symmetric", () => {
    assert.equal(Easing.easeInOut(0), 0);
    assert.equal(Easing.easeInOut(0.5), 0.5);
    assert.equal(Easing.easeInOut(1), 1);
    // First half accelerates, second half decelerates
    assert.ok(Easing.easeInOut(0.25) < 0.25);
    assert.ok(Easing.easeInOut(0.75) > 0.75);
  });
});

describe("interpolate", () => {
  const ctx = loadRuntime();
  const interpolate = ctx.interpolate;

  it("maps value linearly within range", () => {
    const result = interpolate(15, {
      input: { inMin: 0, inMax: 30 },
      output: { outMin: 0, outMax: 100 },
    });
    assert.equal(result, 50);
  });

  it("clamps at min", () => {
    const result = interpolate(-10, {
      input: { inMin: 0, inMax: 30 },
      output: { outMin: 0, outMax: 100 },
    });
    assert.equal(result, 0);
  });

  it("clamps at max", () => {
    const result = interpolate(50, {
      input: { inMin: 0, inMax: 30 },
      output: { outMin: 0, outMax: 100 },
    });
    assert.equal(result, 100);
  });

  it("returns outMin when inMin === inMax", () => {
    const result = interpolate(5, {
      input: { inMin: 5, inMax: 5 },
      output: { outMin: 10, outMax: 90 },
    });
    assert.equal(result, 10);
  });

  it("supports easing by name", () => {
    const result = interpolate(15, {
      input: { inMin: 0, inMax: 30 },
      output: { outMin: 0, outMax: 100 },
      easing: "easeIn",
    });
    assert.equal(result, 25); // 0.5^2 * 100 = 25
  });

  it("supports reverse output range", () => {
    const result = interpolate(15, {
      input: { inMin: 0, inMax: 30 },
      output: { outMin: 100, outMax: 0 },
    });
    assert.equal(result, 50);
  });
});

describe("MulmoAnimation", () => {
  it("registers animate entries", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.animate("#el", { opacity: [0, 1] }, { start: 0, end: 1 });
    assert.equal(anim._entries.length, 1);
    assert.equal(anim._entries[0].kind, "animate");
    assert.equal(anim._entries[0].selector, "#el");
  });

  it("registers stagger entries", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.stagger("#item{i}", 3, { opacity: [0, 1] }, { start: 0, stagger: 0.2, duration: 0.5 });
    assert.equal(anim._entries.length, 1);
    assert.equal(anim._entries[0].kind, "stagger");
    assert.equal(anim._entries[0].count, 3);
  });

  it("registers counter entries", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.counter("#num", [0, 100], { start: 0, end: "auto", decimals: 0 });
    assert.equal(anim._entries.length, 1);
    assert.equal(anim._entries[0].kind, "counter");
    assert.deepEqual(anim._entries[0].range, [0, 100]);
  });

  it("registers typewriter entries", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.typewriter("#tw", "Hello World", { start: 0, end: 2 });
    assert.equal(anim._entries[0].kind, "typewriter");
    assert.equal(anim._entries[0].text, "Hello World");
  });

  it("registers blink entries", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.blink("#cursor", { interval: 0.3 });
    assert.equal(anim._entries[0].kind, "blink");
    assert.equal(anim._entries[0].opts.interval, 0.3);
  });

  it("chains method calls", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    const result = anim.animate("#a", { opacity: [0, 1] }, { start: 0, end: 1 }).animate("#b", { opacity: [0, 1] }, { start: 0.5, end: 1.5 });
    assert.equal(result, anim);
    assert.equal(anim._entries.length, 2);
  });

  it("_resolveEasing returns correct function", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const Easing = ctx.Easing;
    const anim = new MulmoAnimation();

    assert.equal(anim._resolveEasing(undefined), Easing.linear);
    assert.equal(anim._resolveEasing("easeOut"), Easing.easeOut);
    assert.equal(anim._resolveEasing("nonexistent"), Easing.linear);
    const custom = (t: number) => t;
    assert.equal(anim._resolveEasing(custom), custom);
  });

  it("_toFiniteNumber handles edge cases", () => {
    const ctx = loadRuntime();
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();

    assert.equal(anim._toFiniteNumber(42, 0), 42);
    assert.equal(anim._toFiniteNumber("3.14", 0), 3.14);
    assert.equal(anim._toFiniteNumber(NaN, 99), 99);
    assert.equal(anim._toFiniteNumber(Infinity, 99), 99);
    assert.equal(anim._toFiniteNumber(undefined, 5), 5);
    assert.equal(anim._toFiniteNumber(null, 5), 0); // Number(null) === 0
  });
});

describe("JS file syntax validation", () => {
  JS_FILES.forEach((filename) => {
    it(`${filename} parses without syntax errors`, () => {
      const code = readJSFile(filename);
      // Compile the script — throws SyntaxError if invalid
      // eslint-disable-next-line sonarjs/code-eval -- intentional: validating browser JS syntax via vm
      const script = new vm.Script(code, { filename });
      assert.ok(script, "Script compiled successfully");
    });
  });

  it("all 3 JS files load together in a single context", () => {
    const context = vm.createContext({
      window: { __MULMO: { totalFrames: 120, fps: 30 }, render: undefined, animation: undefined, playAnimation: undefined },
      document: {
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      console,
      Number,
      Math,
      Object,
      JSON,
      SVGElement: class SVGElement {},
      Promise,
      requestAnimationFrame: () => 0,
    });
    JS_FILES.forEach((filename) => {
      const code = readJSFile(filename);
      // eslint-disable-next-line sonarjs/code-eval -- intentional: testing browser JS in Node.js via vm sandbox
      vm.runInContext(code, context);
    });
    // After loading all files, MulmoAnimation and Easing should be available
    assert.equal(typeof context.MulmoAnimation, "function");
    assert.equal(typeof context.Easing, "object");
    assert.equal(typeof context.interpolate, "function");
  });
});

describe("MulmoAnimation.update", () => {
  it("applies animate props to DOM element", () => {
    const mockStyle: Record<string, string | number> = {};
    const mockEl = { style: mockStyle };
    const ctx = loadRuntime();
    // Override querySelector to return our mock
    ctx.document.querySelector = (sel: string) => (sel === "#el" ? mockEl : null);
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.animate("#el", { opacity: [0, 1] }, { start: 0, end: 4 });

    // At frame 60, fps=30 → time=2s, halfway through 0-4s → progress=0.5
    anim.update(60, 30);
    assert.equal(mockStyle.opacity, 0.5);
  });

  it("applies counter text to DOM element", () => {
    let textContent = "";
    const mockEl = {
      style: {},
      get textContent() {
        return textContent;
      },
      set textContent(v: string) {
        textContent = v;
      },
    };
    const ctx = loadRuntime();
    ctx.document.querySelector = (sel: string) => (sel === "#num" ? mockEl : null);
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.counter("#num", [0, 100], { start: 0, end: 4 });

    // At frame 120 (fps=30, time=4s) → progress=1.0 → value=100
    anim.update(120, 30);
    assert.equal(textContent, "100");
  });

  it("applies typewriter text to DOM element", () => {
    let textContent = "";
    const mockEl = {
      style: {},
      get textContent() {
        return textContent;
      },
      set textContent(v: string) {
        textContent = v;
      },
    };
    const ctx = loadRuntime();
    ctx.document.querySelector = (sel: string) => (sel === "#tw" ? mockEl : null);
    const MulmoAnimation = ctx.MulmoAnimation;
    const anim = new MulmoAnimation();
    anim.typewriter("#tw", "Hello", { start: 0, end: 5 });

    // At frame 75 (fps=30, time=2.5s) → progress=0.5 → 2.5 chars → floor=2
    anim.update(75, 30);
    assert.equal(textContent, "He");
  });
});
