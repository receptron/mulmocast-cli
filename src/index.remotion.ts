// Entry point for hosts whose own agent writes the remotion beat's component and passes it as `code`.

export { REMOTION_COMPONENT_GUIDE } from "./utils/remotion/system_prompt.js";
export { REMOTION_PACKAGES, REMOTION_RENDER_PACKAGES, REMOTION_SCENE_PACKAGES, remotionInstallCommand } from "./utils/remotion/packages.js";
export { ensureRemotionPackages, missingInstalledRemotionPackages } from "./utils/remotion/render.js";
