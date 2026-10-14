import type { SlideBranding } from "@mulmocast/deck";

/**
 * Which branding a slide beat gets. Pure — the PNG render and the browser fragment path pick it
 * the same way: the beat's own wins, a beat-level `null` switches the deck's off, and otherwise
 * the deck's `slideParams.branding` applies.
 */
export const pickBranding = (beatBranding: SlideBranding | null | undefined, deckBranding: SlideBranding | undefined): SlideBranding | undefined => {
  if (beatBranding === null) return undefined;
  return beatBranding ?? deckBranding;
};
