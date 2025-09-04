import test from "node:test";
// import assert from "node:assert";

import { getFileObject } from "../../src/cli/helpers.js";
import { createStudioData, getMultiLingual } from "../../src/utils/context.js";
import { translateBeat, translate } from "../../src/actions/translate.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getContext = () => {
  const fileDirs = getFileObject({ file: "hello.yaml" });
  const mulmoScript = {
    $mulmocast: {
      version: "1.0",
      credit: "closing",
    },
    title: "MASAI: A Modular Future for Software Engineering AI",
    description: "Exploring MASAI, a modular approach for AI agents in software engineering that revolutionizes how complex coding issues are tackled.",
    beats: [
      {
        text: "This is a bulleted list in text slide format.",
        image: {
          type: "textSlide",
          slide: {
            title: "Human Evolution",
            bullets: [
              "Early Primates",
              "Hominids and Hominins",
              "Australopithecus",
              "Genus Homo Emerges",
              "Homo erectus and Migration",
              "Neanderthals and Other Archaic Humans",
              "Homo sapiens",
            ],
          },
        },
      },
      {
        text: "This is a table in markdown format.",
        image: {
          type: "markdown",
          markdown: [
            "# Markdown Table Example",
            "### Table",
            "| Item              | In Stock | Price |",
            "| :---------------- | :------: | ----: |",
            "| Python Hat        |   True   | 23.99 |",
            "| SQL Hat           |   True   | 23.99 |",
            "| Codecademy Tee    |  False   | 19.99 |",
            "| Codecademy Hoodie |  False   | 42.99 |",
            "### Paragraph",
            "This is a paragraph.",
          ],
        },
      },
      {
        text: "This is a chart in chart format.",
        image: {
          type: "chart",
          title: "Sales and Profits (from Jan to June)",
          chartData: {
            type: "bar",
            data: {
              labels: ["January", "February", "March", "April", "May", "June"],
              datasets: [
                {
                  label: "Revenue ($1000s)",
                  data: [120, 135, 180, 155, 170, 190],
                  backgroundColor: "rgba(54, 162, 235, 0.5)",
                  borderColor: "rgba(54, 162, 235, 1)",
                  borderWidth: 1,
                },
                {
                  label: "Profit ($1000s)",
                  data: [45, 52, 68, 53, 61, 73],
                  backgroundColor: "rgba(75, 192, 192, 0.5)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1,
                },
              ],
            },
            options: {
              responsive: true,
              animation: false,
            },
          },
        },
      },
      {
        speaker: "Presenter",
        text: "This is a diagram in mermaid format.",
        image: {
          type: "mermaid",
          title: "Business Process Flow",
          code: {
            kind: "text",
            text: "graph LR\n    A[Market Research] --> B[Product Planning]\n    B --> C[Development]\n    C --> D[Testing]\n    D --> E[Manufacturing]\n    E --> F[Marketing]\n    F --> G[Sales]\n    G --> H[Customer Support]\n    H --> A",
          },
        },
      },
    ],
  };
  // context.
  const studio = createStudioData(mulmoScript, "hello");
  const multiLingual = getMultiLingual("", studio.beats);
  const context = {
    multiLingual,
    studio,
    fileDirs,
    force: false,
    sessionState: {
      inSession: {
        audio: false,
        image: false,
        video: false,
        multiLingual: false,
        caption: false,
        pdf: false,
      },
      inBeatSession: {
        audio: {},
        image: {},
        movie: {},
        multiLingual: {},
        caption: {},
        html: {},
      },
    },
    presentationStyle: studio.script,
  };
  return context;
};

test("test beat translate", async () => {
  const context = getContext();
  await translate(context, { targetLangs: ["ch"] });
});

test("test beat translate", async () => {
  const context = getContext();
  await translateBeat(1, context, ["fr"]);
});

test("test beat translate - fresh translation", async () => {
  const context = getContext();
  context.multiLingual["__index__1"].multiLingualTexts = {
    fr: {
      lang: "fr",
      text: "## Original Language\nen\n## Language\nfr\n## Target\nCeci est un tableau au format markdown.",
      texts: ["## Original Language\nen\n## Language\nfr\n## Target\nCeci est un tableau au format markdown."],
      ttsTexts: ["## Original Language\nen\n## Language\nfr\n## Target\nCeci est un tableau au format markdown."],
      cacheKey: "2fb7fad6991c3a99ad3c5d3b0bc63f545b6ae25d06385c5ab2b11f71c0bf60f8",
    },
  };
  await translateBeat(1, context, ["de"]);
});
