// Baking recipes carry a "Menge" (batch multiplier) instead of integer
// "Portionen": a base amount the recipe is written for, adjustable in 0.5
// steps. Anything missing or unparseable falls back to 1.

export const MENGE_MIN = 0.5;
export const MENGE_MAX = 8;
export const MENGE_STEP = 0.5;

// Snap to the nearest step and clamp into range.
export function clampMenge(n: number): number {
  if (!Number.isFinite(n)) return 1;
  const snapped = Math.round(n / MENGE_STEP) * MENGE_STEP;
  return Math.min(MENGE_MAX, Math.max(MENGE_MIN, snapped));
}

// The base Menge a recipe was created with — always a usable number.
export function bakingBaseMenge(recipe: { servings?: number | null }): number {
  const n = Number(recipe?.servings);
  return Number.isFinite(n) && n > 0 ? clampMenge(n) : 1;
}

// "1,5" · "0,5" · "2" — German decimal comma, no trailing zeros.
export function formatMenge(n: number): string {
  const v = clampMenge(n);
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""))
    .replace(".", ",");
}

// Same, with the "x" multiplier suffix for display: "1x" · "0,5x" · "2,5x".
export function formatMengeX(n: number): string {
  return `${formatMenge(n)}x`;
}

// Parse a user-typed value ("1,5", "0.5", "2") back to a number.
export function parseMenge(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
