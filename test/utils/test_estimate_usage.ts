import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateUsage } from "../../src/utils/estimate_usage.js";
import { mulmoScriptSchema } from "../../src/types/schema.js";
import type { UsageEstimate } from "../../src/types/usage.js";

type BeatInput = Record<string, unknown>;

const makeScript = (beats: BeatInput[], extra: Record<string, unknown> = {}) => {
  return mulmoScriptSchema.parse({
    $mulmocast: { version: "1.1" },
    lang: "en",
    speechParams: { speakers: { Presenter: { voiceId: "shimmer", displayName: { en: "Presenter" } } } },
    beats,
    ...extra,
  });
};

const byProcess = (records: UsageEstimate[], process: UsageEstimate["process"]) => records.filter((r) => r.process === process);

describe("estimateUsage: tts", () => {
  it("emits an exact char count and openai token metrics for a text beat", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "Hello world" }]));
    const tts = byProcess(records, "tts");
    assert.equal(tts.length, 1);
    assert.deepEqual(tts[0].inputChars, { value: 11, precision: "exact" });
    assert.equal(tts[0].model, "gpt-4o-mini-tts");
    assert.equal(tts[0].inputTokens?.precision, "exact");
    assert.equal(tts[0].outputTokens?.precision, "estimated");
    assert.ok(tts[0].costUSD !== undefined);
  });

  it("skips beats with empty text, pre-supplied audio, or suppressSpeech", () => {
    const emptyText = estimateUsage(makeScript([{ speaker: "Presenter", text: "" }]));
    assert.equal(byProcess(emptyText, "tts").length, 0);

    const preSupplied = estimateUsage(makeScript([{ speaker: "Presenter", text: "hi", audio: { type: "audio", source: { kind: "path", path: "a.mp3" } } }]));
    assert.equal(byProcess(preSupplied, "tts").length, 0);

    const suppressed = estimateUsage(makeScript([{ speaker: "Presenter", text: "hi" }], { audioParams: { suppressSpeech: true } }));
    assert.equal(byProcess(suppressed, "tts").length, 0);
  });

  it("marks the char count as estimated for non-default languages (translation does not exist yet)", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "Hello world" }]), { langs: ["ja"] });
    const tts = byProcess(records, "tts");
    assert.equal(tts[0].lang, "ja");
    assert.equal(tts[0].inputChars?.precision, "estimated");
  });

  it("uses heuristic token estimation for gemini voices", () => {
    const script = makeScript([{ speaker: "Presenter", text: "こんにちは" }], {
      speechParams: { speakers: { Presenter: { voiceId: "Kore", provider: "gemini", displayName: { en: "Presenter" } } } },
    });
    const tts = byProcess(estimateUsage(script), "tts");
    assert.equal(tts[0].provider, "gemini");
    assert.equal(tts[0].inputTokens?.precision, "estimated");
    assert.deepEqual(tts[0].outputTokens, { value: 25, precision: "estimated" }); // 1 sec of audio at 25 tokens/sec
  });

  it("prices google voices by voice tier", () => {
    const script = makeScript([{ speaker: "Presenter", text: "0123456789" }], {
      speechParams: { speakers: { Presenter: { voiceId: "en-US-Neural2-C", provider: "google", displayName: { en: "Presenter" } } } },
    });
    const tts = byProcess(estimateUsage(script), "tts");
    assert.deepEqual(tts[0].inputChars, { value: 10, precision: "exact" });
    assert.ok(Math.abs((tts[0].costUSD ?? 0) - (10 * 16) / 1_000_000) < 1e-12);
  });

  it("emits one record per language when langs is set", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "Hello" }]), { langs: ["en", "ja"], targetLangs: [] });
    assert.equal(byProcess(records, "tts").length, 2);
  });
});

describe("estimateUsage: image generation", () => {
  it("counts prompt tokens exactly and uses the size/quality output-token table", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "", imagePrompt: "a cat", imageParams: { quality: "low" } }]));
    const images = byProcess(records, "image");
    assert.equal(images.length, 1);
    assert.equal(images[0].model, "gpt-image-1");
    assert.equal(images[0].inputTokens?.precision, "exact");
    // default canvas 1280x720 is landscape → 1536x1024; low quality → 400 tokens (fixed table)
    assert.deepEqual(images[0].outputTokens, { value: 400, precision: "exact" });
  });

  it("falls back to high quality as an estimate when quality is unspecified", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "", imagePrompt: "a cat" }]));
    assert.deepEqual(byProcess(records, "image")[0].outputTokens, { value: 6208, precision: "estimated" });
  });

  it("generates an image from text when no imagePrompt is present", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "Just narration" }]));
    assert.equal(byProcess(records, "image").length, 1);
  });

  it("emits no image record for plugin beats or movie-only beats", () => {
    const plugin = estimateUsage(makeScript([{ speaker: "Presenter", text: "", image: { type: "textSlide", slide: { title: "T" } } }]));
    assert.equal(byProcess(plugin, "image").length, 0);

    const movieOnly = estimateUsage(makeScript([{ speaker: "Presenter", text: "", moviePrompt: "a wave" }]));
    assert.equal(byProcess(movieOnly, "image").length, 0);
    assert.equal(byProcess(movieOnly, "movie").length, 1);
  });

  it("reports per-image billing for replicate", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "", imagePrompt: "a cat" }], { imageParams: { provider: "replicate" } }));
    const image = byProcess(records, "image")[0];
    assert.equal(image.model, "bytedance/seedream-4");
    assert.deepEqual(image.imageCount, { value: 1, precision: "exact" });
  });
});

describe("estimateUsage: htmlPrompt beats", () => {
  it("emits a single htmlImage record and nothing else for the beat", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "", htmlPrompt: { prompt: "sales chart", data: { a: 1 } } }]));
    assert.equal(records.length, 1);
    assert.equal(records[0].process, "htmlImage");
    assert.equal(records[0].model, "gpt-5");
    assert.equal(records[0].inputTokens?.precision, "exact");
    assert.equal(records[0].outputTokens?.precision, "estimated");
  });
});

describe("estimateUsage: movie / soundEffect / lipSync", () => {
  it("snaps an explicit beat duration to the model's supported durations as exact", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "", moviePrompt: "wave", duration: 7.5 }]));
    const movie = byProcess(records, "movie")[0];
    assert.equal(movie.model, "bytedance/seedance-1-lite");
    assert.deepEqual(movie.predictSec, { value: 8, precision: "exact" }); // supported durations are [4..12]
    assert.ok(Math.abs((movie.costUSD ?? 0) - 8 * 0.036) < 1e-12);
  });

  it("estimates the duration from the narration text when no duration is set", () => {
    const records = estimateUsage(makeScript([{ speaker: "Presenter", text: "こんにちは。これはテストです。", moviePrompt: "city" }]));
    assert.deepEqual(byProcess(records, "movie")[0].predictSec, { value: 4, precision: "estimated" });
  });

  it("emits soundEffect only for movie beats, and lipSync when enabled", () => {
    const noMovie = estimateUsage(makeScript([{ speaker: "Presenter", text: "", imagePrompt: "cat", soundEffectPrompt: "meow" }]));
    assert.equal(byProcess(noMovie, "soundEffect").length, 0);

    const records = estimateUsage(
      makeScript([{ speaker: "Presenter", text: "", moviePrompt: "cat", duration: 5, soundEffectPrompt: "meow", enableLipSync: true }]),
    );
    assert.deepEqual(byProcess(records, "soundEffect")[0].predictSec, { value: 5, precision: "estimated" }); // GPU time differs from clip length
    const lipSync = byProcess(records, "lipSync")[0];
    assert.equal(lipSync.model, "bytedance/omni-human");
    assert.deepEqual(lipSync.predictSec, { value: 5, precision: "exact" });
    assert.ok(Math.abs((lipSync.costUSD ?? 0) - 5 * 0.14) < 1e-12);
  });
});

describe("estimateUsage: reference images", () => {
  it("counts imagePrompt / moviePrompt entries in imageParams.images and beat.images", () => {
    const script = makeScript(
      [
        {
          speaker: "Presenter",
          text: "",
          image: { type: "textSlide", slide: { title: "T" } },
          images: { local: { type: "imagePrompt", prompt: "a local ref" } },
        },
      ],
      {
        imageParams: {
          images: {
            hero: { type: "imagePrompt", prompt: "a hero" },
            intro: { type: "moviePrompt", prompt: "an intro" },
            fixed: { type: "image", source: { kind: "url", url: "https://example.com/a.png" } },
          },
        },
      },
    );
    const records = estimateUsage(script);
    const imageRefs = byProcess(records, "imageReference");
    assert.deepEqual(imageRefs.map((r) => r.refKey).sort(), ["hero", "local"]);
    assert.equal(imageRefs.find((r) => r.refKey === "local")?.beatIndex, 0);
    const movieRefs = byProcess(records, "movieReference");
    assert.deepEqual(
      movieRefs.map((r) => r.refKey),
      ["intro"],
    );
    assert.equal(movieRefs[0].predictSec?.precision, "estimated");
  });
});

describe("estimateUsage: translate", () => {
  it("derives target languages from captionParams and skips the script language and empty beats", () => {
    const script = makeScript(
      [
        { speaker: "Presenter", text: "Hello" },
        { speaker: "Presenter", text: "" },
      ],
      { captionParams: { lang: "ja" } },
    );
    const translate = byProcess(estimateUsage(script), "translate");
    assert.equal(translate.length, 1);
    assert.equal(translate[0].lang, "ja");
    assert.equal(translate[0].model, "gpt-4o");
    assert.equal(translate[0].inputTokens?.precision, "exact");
    assert.equal(translate[0].outputTokens?.precision, "estimated");
  });

  it("emits no translate records when the only target equals the script language", () => {
    const script = makeScript([{ speaker: "Presenter", text: "Hello" }], { captionParams: { lang: "en" } });
    assert.equal(byProcess(estimateUsage(script), "translate").length, 0);
  });

  it("multiplies across beats and target languages", () => {
    const script = makeScript([
      { speaker: "Presenter", text: "One" },
      { speaker: "Presenter", text: "Two" },
    ]);
    const translate = byProcess(estimateUsage(script, { targetLangs: ["ja", "fr"] }), "translate");
    assert.equal(translate.length, 4);
  });
});

describe("estimateUsage: pricing edges", () => {
  it("omits costUSD when no pricing data exists for the model", () => {
    const script = makeScript([{ speaker: "Presenter", text: "Hello" }], {
      speechParams: { speakers: { Presenter: { voiceId: "Atla", provider: "kotodama", displayName: { en: "Presenter" } } } },
    });
    const tts = byProcess(estimateUsage(script), "tts")[0];
    assert.equal(tts.costUSD, undefined);
    assert.equal(tts.pricingAsOf, undefined);
  });

  it("prices elevenlabs by characters", () => {
    const script = makeScript([{ speaker: "Presenter", text: "0123456789" }], {
      speechParams: { speakers: { Presenter: { voiceId: "v1", provider: "elevenlabs", displayName: { en: "Presenter" } } } },
    });
    const tts = byProcess(estimateUsage(script), "tts")[0];
    assert.equal(tts.model, "eleven_multilingual_v2");
    assert.ok(Math.abs((tts.costUSD ?? 0) - (10 * 100) / 1_000_000) < 1e-12);
  });

  it("emits no records for mock providers", () => {
    const script = makeScript([{ speaker: "Presenter", text: "Hello", imagePrompt: "cat" }], {
      imageParams: { provider: "mock" },
      speechParams: { speakers: { Presenter: { voiceId: "v", provider: "mock", displayName: { en: "Presenter" } } } },
    });
    const records = estimateUsage(script, { targetLangs: [] });
    assert.equal(byProcess(records, "tts").length, 0);
    assert.equal(byProcess(records, "image").length, 0);
  });
});
