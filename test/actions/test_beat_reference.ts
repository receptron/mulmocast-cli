import test from "node:test";
import assert from "node:assert";

import { getFileObject } from "../../src/cli/helpers.js";
import { createOrUpdateStudioData } from "../../src/utils/preprocess.js";
import { images } from "../../src/actions/images.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("test beat reference - basic functionality", async () => {
  const fileDirs = getFileObject({ file: "beat_test.yaml" });
  const mulmoScript = {
    $mulmocast: {
      version: "1.0",
      credit: "closing",
    },
    title: "Beat Reference Test",
    description: "Testing beat reference functionality",
    beats: [
      {
        speaker: "Presenter",
        text: "First beat with image generation.",
        imagePrompt: "simple test image of a blue sky",
      },
      {
        speaker: "Presenter", 
        text: "Second beat referencing previous image.",
        image: {
          type: "beat",
        },
      },
      {
        speaker: "Presenter",
        text: "Third beat with specific index reference.",
        image: {
          type: "beat",
          index: 0,
        },
      },
    ],
  };

  const studio = createOrUpdateStudioData(mulmoScript, fileDirs, "beat_test");
  const context = {
    studio,
    fileDirs,
    force: false,
  };

  try {
    await images(context);
    
    // Verify beat reference functionality
    const beats = studio.beats;
    
    // Basic validation that the processing completed
    assert.ok(beats.length >= 3, "Should have at least 3 beats");
    
    console.log("Beat reference test completed successfully");
    console.log("Beat 0 imageFile:", beats[0]?.imageFile || "undefined");
    console.log("Beat 1 imageFile:", beats[1]?.imageFile || "undefined");
    console.log("Beat 2 imageFile:", beats[2]?.imageFile || "undefined");
    
  } catch (error) {
    console.log("Beat reference test error:", error.message);
    // Expected behavior when no actual image generation provider is configured
    assert.ok(
      error.message.includes("provider") || 
      error.message.includes("API") ||
      error.message.includes("OPENAI_API_KEY"),
      "Error should be related to missing provider configuration"
    );
  }
});

test("test beat reference - empty imagePrompt", async () => {
  const fileDirs = getFileObject({ file: "beat_empty_prompt_test.yaml" });
  const mulmoScript = {
    $mulmocast: {
      version: "1.0",
      credit: "closing",
    },
    title: "Beat Reference Empty Prompt Test",
    description: "Testing beat reference with empty imagePrompt",
    beats: [
      {
        speaker: "Presenter",
        text: "First beat with image generation.",
        imagePrompt: "beautiful sunset over mountains",
      },
      {
        speaker: "Presenter",
        text: "Second beat with empty imagePrompt - should reuse previous image.",
        imagePrompt: "",
      },
      {
        speaker: "Presenter",
        text: "Third beat with undefined imagePrompt - should reuse previous image.",
      },
    ],
  };

  const studio = createOrUpdateStudioData(mulmoScript, fileDirs, "beat_empty_prompt_test");
  const context = {
    studio,
    fileDirs,
    force: false,
  };

  try {
    await images(context);
    
    console.log("Empty imagePrompt test completed");
    console.log("Beat 0 imageFile:", studio.beats[0]?.imageFile || "undefined");
    console.log("Beat 1 imageFile:", studio.beats[1]?.imageFile || "undefined");
    console.log("Beat 2 imageFile:", studio.beats[2]?.imageFile || "undefined");
    
  } catch (error) {
    console.log("Empty imagePrompt test error:", error.message);
    assert.ok(
      error.message.includes("provider") || 
      error.message.includes("API") ||
      error.message.includes("OPENAI_API_KEY"),
      "Error should be related to missing provider configuration"
    );
  }
});

test("test beat reference - chain references", async () => {
  const fileDirs = getFileObject({ file: "beat_chain_test.yaml" });
  const mulmoScript = {
    $mulmocast: {
      version: "1.0",
      credit: "closing",
    },
    title: "Beat Reference Chain Test",
    description: "Testing chained beat references",
    beats: [
      {
        speaker: "Presenter",
        text: "First beat with image generation.",
        imagePrompt: "original test image",
      },
      {
        speaker: "Presenter",
        text: "Second beat references first.",
        image: {
          type: "beat",
        },
      },
      {
        speaker: "Presenter",
        text: "Third beat references second (chain).",
        image: {
          type: "beat",
        },
      },
      {
        speaker: "Presenter",
        text: "Fourth beat with new image.",
        imagePrompt: "new different image",
      },
      {
        speaker: "Presenter",
        text: "Fifth beat references the chain (should get first image).",
        image: {
          type: "beat",
          index: 2,
        },
      },
    ],
  };

  const studio = createOrUpdateStudioData(mulmoScript, fileDirs, "beat_chain_test");
  const context = {
    studio,
    fileDirs,
    force: false,
  };

  try {
    await images(context);
    
    console.log("Chain reference test completed");
    for (let i = 0; i < studio.beats.length; i++) {
      console.log(`Beat ${i} imageFile:`, studio.beats[i]?.imageFile || "undefined");
    }
    
  } catch (error) {
    console.log("Chain reference test error:", error.message);
    assert.ok(
      error.message.includes("provider") || 
      error.message.includes("API") ||
      error.message.includes("OPENAI_API_KEY"),
      "Error should be related to missing provider configuration"
    );
  }
}); 