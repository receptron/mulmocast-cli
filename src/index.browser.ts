// Entry point for browser code

export * from "./index.common.js";

/**
 * Beat markup for a browser host. Exported from the browser entry point rather than the
 * common one because `test_browser_safety.ts` guards this module's import graph — a Node
 * import creeping in fails there, not at a user's build.
 */
export { beatToHtml, supportedBeatTypes } from "./utils/beat_html/index.js";
export type { BeatHtmlFragment, BeatHtmlOptions, BeatRuntime } from "./utils/beat_html/type.js";

import validateSchemaAgent from "./agents/validate_schema_agent.js";
export { validateSchemaAgent };
