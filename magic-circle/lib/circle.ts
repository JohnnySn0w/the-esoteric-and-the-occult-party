export const SEALS = [
  // Stable IDs preserve the first five existing sticker URLs and stored keys.
  { id: "section-1", legacyId: "air", name: "Snake", glyph: "Ⅰ", asset: "01-snake.svg" },
  { id: "section-2", legacyId: "sun", name: "Exterior stars", glyph: "Ⅱ", asset: "02-exterior-stars.svg" },
  { id: "section-3", legacyId: "venus", name: "Interior stars", glyph: "Ⅲ", asset: "03-interior-stars.svg" },
  { id: "section-4", legacyId: "earth", name: "Central square", glyph: "Ⅳ", asset: "04-central-square.svg" },
  { id: "section-5", legacyId: "jupiter", name: "Golden mist", glyph: "Ⅴ", asset: "05-golden-mist.svg" },
] as const;
export type CircleState = { id: string; mask: number; revision: number; lastSeal: string | null };
