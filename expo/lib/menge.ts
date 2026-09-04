// Baking recipes carry a "Menge" (batch multiplier) instead of integer
// "Portionen": a base amount the recipe is written for, adjustable in 0.25
// steps. Anything missing or unparseable falls back to 1.

export const MENGE_MIN = 0.25;
export const MENGE_MAX = 8;
export const MENGE_STEP = 0.25;

// Snap to the nearest 0.25 and clamp into range.
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

// "1,5" · "0,25" · "2" — German decimal comma, no trailing zeros.
export function formatMenge(n: number): string {
  const v = clampMenge(n);
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""))
    .replace(".", ",");
}

// Parse a user-typed value ("1,5", "0.75", "2") back to a number.
export function parseMenge(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// The full ladder of selectable values, for the wheel picker.
export function mengeSteps(): number[] {
  const out: number[] = [];
  for (let v = MENGE_MIN; v <= MENGE_MAX + 1e-9; v += MENGE_STEP) {
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}
