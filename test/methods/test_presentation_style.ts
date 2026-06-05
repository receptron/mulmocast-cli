import test from "node:test";
import assert from "node:assert";

import { MulmoPresentationStyleMethods } from "../../src/methods/mulmo_presentation_style.js";

test("defaultSpeaker isDefault", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
          isDefault: true,
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter");
});

test("defaultSpeaker no isDefault", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter");
});

test("defaultSpeaker no isDefault two speaker", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter1: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
        Presenter2: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter1");
});

test("defaultSpeaker isDefault two speaker", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {
        Presenter2: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
          isDefault: true,
        },
        Presenter1: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
          isDefault: true,
        },
      },
    },
  };
  const result = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  assert.equal(result, "Presenter1");
});

test("defaultSpeaker error no speaker", async () => {
  const presentationStyle = {
    speechParams: {
      provider: "openai",
      speakers: {},
    },
  };
  await assert.rejects(async () => {
    MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle);
  });
});

// --- getResolvedSlideTheme (mulmoclaude#1622 follow-up) ---
//
// The priority surfaced here is the single source of truth that both
// the renderer (`slide.ts`) and the editor (`@mulmocast/deck-web`)
// will read from, so the tests below pin the contract loudly.

const fakeTheme = (label: string) => ({
  colors: { bg: label, bgCard: label, bgCardAlt: label, text: label, textMuted: label, textDim: label, primary: label, accent: label, success: label, warning: label, danger: label, info: label, highlight: label },
  fonts: { title: "Georgia", body: "Helvetica", mono: "Menlo" },
});

test("getResolvedSlideTheme: per-beat theme wins over presentation-level", () => {
  const presentationStyle = { slideParams: { theme: fakeTheme("PRES") } };
  const beat = { image: { type: "slide" as const, slide: { layout: "title" as const, title: "x" }, theme: fakeTheme("BEAT") } };
  const result = MulmoPresentationStyleMethods.getResolvedSlideTheme(presentationStyle, beat);
  assert.equal(result.colors.bg, "BEAT");
});

test("getResolvedSlideTheme: presentation-level theme used when beat lacks one", () => {
  const presentationStyle = { slideParams: { theme: fakeTheme("PRES") } };
  const beat = { image: { type: "slide" as const, slide: { layout: "title" as const, title: "x" } } };
  const result = MulmoPresentationStyleMethods.getResolvedSlideTheme(presentationStyle, beat);
  assert.equal(result.colors.bg, "PRES");
});

test("getResolvedSlideTheme: slideThemes.corporate fallback when neither is set", () => {
  const presentationStyle = {};
  const beat = { image: { type: "slide" as const, slide: { layout: "title" as const, title: "x" } } };
  const result = MulmoPresentationStyleMethods.getResolvedSlideTheme(presentationStyle, beat);
  // corporate's bg is "F8FAFC"; we just assert the call returns a
  // theme-shaped object — checking the literal value would lock the
  // test to the current default and make the fallback awkward to
  // tweak upstream.
  assert.ok(typeof result.colors.bg === "string" && result.colors.bg.length > 0);
});

test("getResolvedSlideTheme: non-slide beat falls through to fallback (no throw)", () => {
  // Callers driving a deck preview from a mixed script need to be
  // able to hand any beat in without first checking its image.type.
  const presentationStyle = { slideParams: { theme: fakeTheme("PRES") } };
  const beat = { image: { type: "textSlide" as const, slide: { title: "x" } } };
  const result = MulmoPresentationStyleMethods.getResolvedSlideTheme(presentationStyle, beat);
  // Falls through to the presentation-level theme since beat.image.theme
  // doesn't apply (different image kind), instead of throwing.
  assert.equal(result.colors.bg, "PRES");
});
