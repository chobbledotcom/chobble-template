/**
 * Format a numeric price using Intl.NumberFormat.
 *
 * Whole-number prices have .00 stripped (£10, not £10.00).
 * Fractional prices keep two decimals (£3.50, not £3.5).
 */
export const formatPrice = (currency, value) =>
  new Intl.NumberFormat("en", { style: "currency", currency })
    .format(value)
    .replace(/\.00$/, "");
