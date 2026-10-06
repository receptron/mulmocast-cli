// Every package the renderer needs or the generated component may import. They are optional peer
// dependencies of mulmocast, so a host installs them itself; one list keeps the install hint, the
// pre-flight check and the system prompt's import allowance from drifting apart.
export const REMOTION_RENDER_PACKAGES = ["remotion", "@remotion/bundler", "@remotion/renderer", "react", "react-dom"] as const;

export const REMOTION_SCENE_PACKAGES = [
  "@remotion/three",
  "three",
  "@react-three/fiber",
  "@remotion/effects",
  "@remotion/paths",
  "@remotion/noise",
  "@remotion/shapes",
  "@remotion/transitions",
  "@remotion/motion-blur",
  "@remotion/layout-utils",
] as const;

export const REMOTION_PACKAGES: readonly string[] = [...REMOTION_RENDER_PACKAGES, ...REMOTION_SCENE_PACKAGES];

export const remotionInstallCommand = (packages: readonly string[] = REMOTION_PACKAGES) => `npm install ${packages.join(" ")}`;

// `isInstalled` is injected so the rule can be tested without touching node_modules.
export const missingRemotionPackages = (isInstalled: (name: string) => boolean, packages: readonly string[] = REMOTION_PACKAGES): string[] =>
  packages.filter((name) => !isInstalled(name));
