/**
 * Format a numeric price using Intl.NumberFormat.
 *
 * Whole-number prices have .00 stripped (£10, not £10.00).
 * Fractional prices keep two decimals (£3.50, not £3.5).
 *
 * @param {string} currency
 * @param {string | number} value
 */
export const formatPrice = (currency, value) => {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid price value: ${JSON.stringify(value)}`);
  }
  return new Intl.NumberFormat("en", { style: "currency", currency })
    .format(num)
    .replace(/\.00$/, "");
};
