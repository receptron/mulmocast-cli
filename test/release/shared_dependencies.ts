/** A dependency both packages declare, with the range each one gives it. */
export type RangeMismatch = { name: string; root: string; types: string };

type Dependencies = Record<string, string>;

const isDependencies = (value: unknown): value is Dependencies =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((range) => typeof range === "string");

const ALL_FIELDS = ["dependencies", "devDependencies", "peerDependencies"];

/** The dependency maps a package.json declares in `fields`, merged; anything that is not a map of strings counts as none. */
export const declaredDependencies = (manifest: unknown, fields: readonly string[] = ALL_FIELDS): Dependencies => {
  if (typeof manifest !== "object" || manifest === null) return {};
  return fields
    .map((field) => Reflect.get(manifest, field))
    .filter(isDependencies)
    .reduce<Dependencies>((all, map) => ({ ...all, ...map }), {});
};

/**
 * The runtime dependencies of `types/` that the root declares with a different range.
 *
 * `@mulmocast/types` is built from the root's `src/types`, and its `.d.ts` inlines the types of its
 * runtime dependencies (`@mulmocast/deck`'s slide schemas, zod's) at build time. One raised in the
 * root alone is a types package that no longer matches what `mulmocast` ships. Its peer and dev
 * dependencies are not compared: a peer range is the floor a consumer needs and may be looser, and a
 * dev dependency never reaches the published types.
 */
export const sharedDependencyMismatches = (rootManifest: unknown, typesManifest: unknown): RangeMismatch[] => {
  const root = declaredDependencies(rootManifest);
  const types = declaredDependencies(typesManifest, ["dependencies"]);
  return Object.keys(types)
    .filter((name) => name in root && root[name] !== types[name])
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, root: root[name], types: types[name] }));
};
