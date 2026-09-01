// Scales a free-text ingredient amount (e.g. "500g", "2 cans", "1 1/2 cups")
// by a ratio, keeping the unit/text after the number untouched. Amounts that
// don't start with a recognizable number (e.g. "to taste") are left as-is.
export function scaleAmount(amount: string, ratio: number): string {
  if (!amount || !Number.isFinite(ratio) || ratio <= 0) return amount;

  const match = amount
    .trim()
    .match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return amount;

  const [, numPart, rest] = match;
  let value: number;

  if (numPart.includes('/')) {
    const [wholePart, fracPart] = numPart.includes(' ')
      ? numPart.split(' ')
      : [undefined, numPart];
    const [n, d] = fracPart.split('/').map(Number);
    value = (wholePart ? Number(wholePart) : 0) + (d ? n / d : 0);
  } else {
    value = parseFloat(numPart.replace(',', '.'));
  }

  if (!Number.isFinite(value)) return amount;

  const scaled = value * ratio;
  // Whole numbers for anything from 5 upwards ("156.25 g" -> "156 g",
  // "37.5 g" -> "38 g"). Below that, keep the fraction: rounding would
  // distort too much ("2.5 g" -> "3 g") and small fractional amounts like
  // "0.5 l" (half a litre) or "1.25" eggs are meant to stay fractional.
  const rounded =
    scaled >= 5 ? Math.round(scaled) : Math.round(scaled * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded.toFixed(2)).replace(/0+$/, '').replace(/\.$/, '');

  return rest ? `${formatted} ${rest}` : formatted;
}
