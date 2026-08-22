import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

/**
 * The plugin registered for `imageType`, or a failed test.
 *
 * `findImagePlugin` answers `undefined` for a type it does not know, and production handles
 * that — `getBeatPlugin` checks it before use. A test that names a plugin literally is
 * asserting the plugin exists, so throwing here says that out loud; reading through the
 * optional at every call site says it in 93 places and means it in none.
 */
export const requireImagePlugin = (imageType: string) => {
  const plugin = findImagePlugin(imageType);
  if (!plugin) throw new Error(`no image plugin registered for "${imageType}"`);
  return plugin;
};

/**
 * The plugin for `imageType`, with `html()` known to be present.
 *
 * `html` and `markdown` are optional on the plugin table because not every plugin renders
 * both — `image` and `beat` render neither. A test that calls one is asserting this plugin
 * has it, which is a fact about the plugin and belongs in one place rather than as an
 * optional-chain at every call.
 */
export const requireHtmlPlugin = (imageType: string) => {
  const plugin = requireImagePlugin(imageType);
  const { html } = plugin;
  if (!html) throw new Error(`image plugin "${imageType}" has no html()`);
  return { ...plugin, html };
};

/** The plugin for `imageType`, with both `markdown()` and `html()` known to be present. */
export const requireRenderingPlugin = (imageType: string) => {
  const plugin = requireHtmlPlugin(imageType);
  const { markdown } = plugin;
  if (!markdown) throw new Error(`image plugin "${imageType}" has no markdown()`);
  return { ...plugin, markdown };
};
