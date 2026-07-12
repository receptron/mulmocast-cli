import { MulmoBeat } from "../types/index.js";
import { MulmoBeatMethods as MulmoBeatMethodsBrowser } from "./mulmo_beat.js";
import { getBeatPlugin } from "../utils/image_plugins/index.js";

// Node-only extension of MulmoBeatMethods. Kept out of methods/mulmo_beat.ts so
// browser bundles (mulmocast/browser) do not pull in image_plugins → mulmocast-vision → puppeteer.
export const MulmoBeatMethods = {
  ...MulmoBeatMethodsBrowser,
  getPlugin(beat: MulmoBeat) {
    return getBeatPlugin(beat);
  },
};
