type Version = [number, number, number];

const CARET = /^\^(\d+)\.(\d+)\.(\d+)$/;

/** The version a `^x.y.z` range starts at, or null for any other range form. */
export const caretFloor = (range: string): Version | null => {
  const match = CARET.exec(range.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/**
 * The part of a version a caret range holds fixed, as npm reads it: the major from 1.0.0 on, the
 * minor for 0.y (y > 0), and the patch for 0.0.z. `^0.4.0` admits 0.4.x and nothing from 0.5.
 */
const caretLock = ([major, minor, patch]: Version): string => {
  if (major > 0) return `${major}`;
  if (minor > 0) return `0.${minor}`;
  return `0.0.${patch}`;
};

const atLeast = (version: Version, floor: Version): boolean => {
  const differs = version.findIndex((part, index) => part !== floor[index]);
  return differs === -1 || version[differs] > floor[differs];
};

/** Whether every version `inner` admits is also admitted by `outer`, for two caret ranges. */
export const caretWithin = (inner: Version, outer: Version): boolean => caretLock(inner) === caretLock(outer) && atLeast(inner, outer);

export type PeerMismatch = { name: string; dev: string; peer: string; reason: string };

type Dependencies = Record<string, string>;

const dependenciesIn = (manifest: unknown, field: string): Dependencies => {
  const map: unknown = typeof manifest === "object" && manifest !== null ? Reflect.get(manifest, field) : undefined;
  if (typeof map !== "object" || map === null || Array.isArray(map)) return {};
  return Object.fromEntries(Object.entries(map).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
};

/**
 * Packages declared both as devDependencies (the version this repository is built and tested with)
 * and as peerDependencies (the range users are told to install), where the tested range is not
 * inside the peer range. A range other than `^x.y.z` is reported for a person to compare rather
 * than guessed at.
 */
export const peerMismatches = (manifest: unknown): PeerMismatch[] => {
  const dev = dependenciesIn(manifest, "devDependencies");
  const peer = dependenciesIn(manifest, "peerDependencies");
  return Object.keys(peer)
    .filter((name) => name in dev)
    .sort((a, b) => a.localeCompare(b))
    .flatMap((name): PeerMismatch[] => {
      const devFloor = caretFloor(dev[name]);
      const peerFloor = caretFloor(peer[name]);
      if (!devFloor || !peerFloor) return [{ name, dev: dev[name], peer: peer[name], reason: "not a ^x.y.z range; compare by hand" }];
      return caretWithin(devFloor, peerFloor) ? [] : [{ name, dev: dev[name], peer: peer[name], reason: "the tested range is outside the peer range" }];
    });
};
