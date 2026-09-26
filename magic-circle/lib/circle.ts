export const SEALS = [
  // Numbered reveal regions are UI controls, not historical attributions.
  // Legacy identifiers keep existing sticker links and saved rooms usable.
  { id: "section-1", legacyId: "air", name: "Section I", glyph: "Ⅰ" },
  { id: "section-2", legacyId: "sun", name: "Section II", glyph: "Ⅱ" },
  { id: "section-3", legacyId: "venus", name: "Section III", glyph: "Ⅲ" },
  { id: "section-4", legacyId: "earth", name: "Section IV", glyph: "Ⅳ" },
  { id: "section-5", legacyId: "jupiter", name: "Section V", glyph: "Ⅴ" },
  { id: "section-6", legacyId: "saturn", name: "Section VI", glyph: "Ⅵ" },
] as const;
export type CircleState = { id: string; mask: number; revision: number; lastSeal: string | null };
