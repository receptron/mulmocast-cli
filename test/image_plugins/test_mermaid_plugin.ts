import test from "node:test";
import assert from "node:assert";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";
import { ImageProcessorParams } from "../../src/types/index.js";
import { escapedMermaidTemplateValues, mermaidHtml } from "../../src/utils/image_plugins/mermaid_html.js";

test("mermaid plugin basic functionality", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert.strictEqual(plugin.imageType, "mermaid");
});

test("mermaid plugin path function", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/diagram.png",
    beat: {
      image: {
        type: "mermaid",
        title: "Test Diagram",
        code: {
          kind: "text",
          text: "graph TD; A-->B;",
        },
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/diagram.png");
});

test("mermaid plugin markdown generation with text code", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert(plugin.markdown, "mermaid plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/diagram.png",
    beat: {
      image: {
        type: "mermaid",
        title: "Flow Chart",
        code: {
          kind: "text",
          text: "graph TD;\n    A[Start] --> B{Decision};\n    B -->|Yes| C[Action];\n    B -->|No| D[End];",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "```mermaid\ngraph TD;\n    A[Start] --> B{Decision};\n    B -->|Yes| C[Action];\n    B -->|No| D[End];\n```");
});

test("mermaid plugin markdown generation with simple flowchart", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert(plugin.markdown, "mermaid plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/flowchart.png",
    beat: {
      image: {
        type: "mermaid",
        code: {
          kind: "text",
          text: "flowchart LR\n    A --> B --> C",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "```mermaid\nflowchart LR\n    A --> B --> C\n```");
});

test("mermaid plugin markdown generation with sequence diagram", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert(plugin.markdown, "mermaid plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/sequence.png",
    beat: {
      image: {
        type: "mermaid",
        code: {
          kind: "text",
          text: "sequenceDiagram\n    Alice->>Bob: Hello Bob, how are you?\n    Bob-->>John: How about you John?\n    Bob--x Alice: I am good thanks!",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(
    markdown,
    "```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello Bob, how are you?\n    Bob-->>John: How about you John?\n    Bob--x Alice: I am good thanks!\n```",
  );
});

test("mermaid plugin markdown generation with class diagram", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert(plugin.markdown, "mermaid plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/class.png",
    beat: {
      image: {
        type: "mermaid",
        code: {
          kind: "text",
          text: "classDiagram\n    Animal <|-- Duck\n    Animal <|-- Fish\n    Animal : +int age\n    Animal : +String gender",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "```mermaid\nclassDiagram\n    Animal <|-- Duck\n    Animal <|-- Fish\n    Animal : +int age\n    Animal : +String gender\n```");
});

test("mermaid plugin markdown generation with non-text code returns undefined", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert(plugin.markdown, "mermaid plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/diagram.png",
    beat: {
      image: {
        type: "mermaid",
        code: {
          kind: "path",
          path: "/path/to/diagram.mmd",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, undefined);
});

test("mermaid plugin markdown generation with wrong image type", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");
  assert(plugin.markdown, "mermaid plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: { title: "Not mermaid" },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, undefined);
});

test("mermaid plugin with gantt chart", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/gantt.png",
    beat: {
      image: {
        type: "mermaid",
        title: "Project Timeline",
        code: {
          kind: "text",
          text: "gantt\n    title A Gantt Diagram\n    dateFormat  YYYY-MM-DD\n    section Section\n    A task           :a1, 2023-01-01, 30d\n    Another task     :after a1  , 20d",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert(markdown, "Markdown should be generated for gantt chart");
  assert(markdown.includes("gantt"), "Markdown should contain gantt keyword");
});

test("mermaid plugin with pie chart", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/pie.png",
    beat: {
      image: {
        type: "mermaid",
        title: "Distribution",
        code: {
          kind: "text",
          text: 'pie title Pets adopted by volunteers\n    "Dogs" : 386\n    "Cats" : 85\n    "Rats" : 15',
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert(markdown, "Markdown should be generated for pie chart");
  assert(markdown.includes("pie title"), "Markdown should contain pie chart definition");
});

test("mermaid plugin with user journey", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/journey.png",
    beat: {
      image: {
        type: "mermaid",
        code: {
          kind: "text",
          text: "journey\n    title My working day\n    section Go to work\n      Make tea: 5: Me\n      Go upstairs: 3: Me\n      Do work: 1: Me, Cat",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert(markdown, "Markdown should be generated for user journey");
  assert(markdown.includes("journey"), "Markdown should contain journey keyword");
});

test("mermaid plugin with empty code", () => {
  const plugin = findImagePlugin("mermaid");
  assert(plugin, "mermaid plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/empty.png",
    beat: {
      image: {
        type: "mermaid",
        code: {
          kind: "text",
          text: "",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "```mermaid\n\n```");
});

// Both mermaid paths drop the title into an HTML text context and the diagram source into a
// `.mermaid` element. Mermaid reads that element's textContent, which the parser produces by
// decoding entities, so escaping is transparent to it — measured in a browser across five
// diagram kinds, the rendered SVG is byte-identical with and without the escape.
const countTags = (html: string, tag: string): number => html.toLowerCase().split(tag).length - 1;

test("a hostile title and hostile diagram source cannot escape their contexts", () => {
  const html = mermaidHtml('graph TD; A-->B;</DIV ><img src=x onerror="pwn()">', "d1", '</H3 ><img src=x onerror="pwn()">');
  assert.strictEqual(countTags(html, "<img"), 0, "no injected element may survive");
  assert.strictEqual(countTags(html, "<h3"), 1, "the heading must not be closed early");
  assert.strictEqual(countTags(html, "<div"), 3, "only the three containers may appear");
  assert.strictEqual(countTags(html, "</div"), 3, "the containers must not be closed early");
});

test("the diagram source keeps its characters, escaped for the text context", () => {
  const html = mermaidHtml('graph TD; A-->B["R&D"];', "d1");
  assert.match(html, /graph TD; A--&gt;B\[&quot;R&amp;D&quot;\];/, "arrows, quotes and ampersands are entities, not raw");
  assert.ok(!html.includes("A-->B"), "the raw form must not also be present");
});

test("a title is optional and an empty one emits no heading", () => {
  assert.ok(!mermaidHtml("graph TD; A-->B;", "d1").includes("<h3"), "no title, no heading");
  assert.ok(!mermaidHtml("graph TD; A-->B;", "d1", "").includes("<h3"), "an empty title emits no heading either");
});

test("the render template's user values are escaped for their own contexts", () => {
  const values = escapedMermaidTemplateValues('</H1 ><img src=x onerror="pwn()">', 'graph TD; A-->B;</DIV ><img src=x onerror="pwn()">');
  assert.ok(!values.title.includes("<"), "the heading value must not carry a tag");
  assert.ok(!values.diagram_code.includes("<"), "the diagram value must not carry a tag");
  assert.strictEqual(values.title, "&lt;/H1 &gt;&lt;img src=x onerror=&quot;pwn()&quot;&gt;");
});
