import test from "node:test";
import assert from "node:assert";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";
import { ImageProcessorParams } from "../../src/types/index.js";

test("html_tailwind plugin basic functionality", () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");
  assert.strictEqual(plugin.imageType, "html_tailwind");
});

test("html_tailwind plugin path function", () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/tailwind.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: "<div class='bg-blue-500 text-white p-4'>Hello World</div>",
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/tailwind.png");
});

test("html_tailwind plugin html generation with string html", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");
  assert(plugin.html, "html_tailwind plugin should have html function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/tailwind.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: "<div class='container mx-auto p-4'><h1 class='text-2xl font-bold'>Title</h1><p class='text-gray-600'>Description</p></div>",
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert.strictEqual(html, "<div class='container mx-auto p-4'><h1 class='text-2xl font-bold'>Title</h1><p class='text-gray-600'>Description</p></div>");
});

test("html_tailwind plugin html generation with array html", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");
  assert(plugin.html, "html_tailwind plugin should have html function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/tailwind.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: [
          "<div class='bg-gradient-to-r from-blue-500 to-purple-600'>",
          "  <h1 class='text-white text-4xl font-bold text-center py-8'>Welcome</h1>",
          "</div>",
          "<div class='p-8'>",
          "  <p class='text-lg text-gray-700'>This is a multi-line HTML content.</p>",
          "</div>",
        ],
      },
    },
  };

  const html = await plugin.html(mockParams);
  const expectedHtml = [
    "<div class='bg-gradient-to-r from-blue-500 to-purple-600'>",
    "  <h1 class='text-white text-4xl font-bold text-center py-8'>Welcome</h1>",
    "</div>",
    "<div class='p-8'>",
    "  <p class='text-lg text-gray-700'>This is a multi-line HTML content.</p>",
    "</div>",
  ].join("\n");

  assert.strictEqual(html, expectedHtml);
});

test("html_tailwind plugin with complex tailwind classes", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/complex.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: [
          "<div class='min-h-screen bg-gray-100 flex items-center justify-center'>",
          "  <div class='bg-white rounded-lg shadow-xl p-8 max-w-md w-full'>",
          "    <div class='flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4'>",
          "      <svg class='w-8 h-8 text-white' fill='currentColor' viewBox='0 0 20 20'>",
          "        <path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'></path>",
          "      </svg>",
          "    </div>",
          "    <h2 class='text-2xl font-bold text-center text-gray-800 mb-2'>Success!</h2>",
          "    <p class='text-gray-600 text-center'>Your action was completed successfully.</p>",
          "  </div>",
          "</div>",
        ],
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("min-h-screen"), "HTML should contain tailwind classes");
  assert(html.includes("bg-gray-100"), "HTML should contain tailwind classes");
  assert(html.includes("rounded-lg"), "HTML should contain tailwind classes");
});

test("html_tailwind plugin with form elements", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/form.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: `
          <form class='max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md'>
            <h2 class='text-2xl font-bold mb-6 text-center'>Contact Form</h2>
            <div class='mb-4'>
              <label class='block text-gray-700 text-sm font-bold mb-2' for='name'>
                Name
              </label>
              <input class='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500' id='name' type='text' placeholder='Your Name'>
            </div>
            <div class='mb-6'>
              <label class='block text-gray-700 text-sm font-bold mb-2' for='email'>
                Email
              </label>
              <input class='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500' id='email' type='email' placeholder='your@email.com'>
            </div>
            <div class='flex items-center justify-between'>
              <button class='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline' type='button'>
                Send Message
              </button>
            </div>
          </form>
        `,
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("<form"), "HTML should contain form elements");
  assert(html.includes("Contact Form"), "HTML should contain form content");
});

test("html_tailwind plugin with grid layout", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/grid.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: [
          "<div class='container mx-auto p-4'>",
          "  <div class='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>",
          "    <div class='bg-white rounded-lg shadow-md p-6'>",
          "      <h3 class='text-lg font-semibold mb-2'>Card 1</h3>",
          "      <p class='text-gray-600'>Content for the first card.</p>",
          "    </div>",
          "    <div class='bg-white rounded-lg shadow-md p-6'>",
          "      <h3 class='text-lg font-semibold mb-2'>Card 2</h3>",
          "      <p class='text-gray-600'>Content for the second card.</p>",
          "    </div>",
          "    <div class='bg-white rounded-lg shadow-md p-6'>",
          "      <h3 class='text-lg font-semibold mb-2'>Card 3</h3>",
          "      <p class='text-gray-600'>Content for the third card.</p>",
          "    </div>",
          "  </div>",
          "</div>",
        ],
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("grid-cols-3"), "HTML should contain grid classes");
});

test("html_tailwind plugin with empty html string", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/empty.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: "",
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert.strictEqual(html, "");
});

test("html_tailwind plugin with empty html array", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/empty-array.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: [],
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert.strictEqual(html, "");
});
