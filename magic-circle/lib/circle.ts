export const SEALS = [
  { id: "air", name: "Air", glyph: "🜁" },
  { id: "sun", name: "Sun", glyph: "☉" },
  { id: "venus", name: "Venus", glyph: "♀" },
  { id: "earth", name: "Earth", glyph: "🜃" },
  { id: "jupiter", name: "Jupiter", glyph: "♃" },
  { id: "saturn", name: "Saturn", glyph: "♄" },
] as const;
export type CircleState = { id: string; mask: number; revision: number; lastSeal: string | null };
