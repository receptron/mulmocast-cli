import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);

export function resolveAssetFile(relFromPkgRoot: string, npmRoot?: string): string {
  const rel = relFromPkgRoot.replace(/^\.\//, "");
  try {
    return require.resolve(`mulmocast/${rel}`);
  } catch {
    if (npmRoot) {
      const maybe = path.resolve(npmRoot, relFromPkgRoot);
      if (fs.existsSync(maybe)) {
        return maybe;
      }
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.join(__dirname, relFromPkgRoot);
  }
}
