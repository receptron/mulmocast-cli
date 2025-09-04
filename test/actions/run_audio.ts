import test from "node:test";
// import assert from "node:assert";

import { getFileObject } from "../../src/cli/helpers.js";
import { createStudioData } from "../../src/utils/context.js";
import { generateBeatAudio } from "../../src/actions/audio.js";

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
        id: "beat1",
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
  const studio = createStudioData(mulmoScript, "hello");
  const context = {
    studio,
    fileDirs,
    force: false,
    lang: "ja",
    multiLingual: [
      {
        cacheKey: "3f67bccdad61ccc0571e88f4379819a4c01a2b458ecba33a46c35cce2764154e",
        multiLingualTexts: {
          de: {
            text: "Willkommen bei Mulmocast Tech Insights.",
            lang: "de",
            texts: ["Willkommen bei Mulmocast Tech Insights."],
            ttsTexts: ["Willkommen bei Mulmocast Tech Insights."],
            cacheKey: "3f67bccdad61ccc0571e88f4379819a4c01a2b458ecba33a46c35cce2764154e",
          },
          fr: {
            lang: "fr",
            text: "Bienvenue chez Mulmocast Tech Insights.",
            texts: ["Bienvenue chez Mulmocast Tech Insights."],
            ttsTexts: ["Bienvenue chez Mulmocast Tech Insights."],
            cacheKey: "3f67bccdad61ccc0571e88f4379819a4c01a2b458ecba33a46c35cce2764154e",
          },
        },
      },
    ],
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

test("test beat images", async () => {
  // const fileDirs = getFileObject({ file: "hello.yaml", basedir: __dirname });
  const context = getContext();
  await generateBeatAudio(0, context, {
    settings: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
    langs: ["fr", "de"],
  });
  // console.log(listLocalizedAudioPaths(context, "de"));
});
