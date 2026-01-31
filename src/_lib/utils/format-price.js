/**
 * Format a price using Intl.NumberFormat.
 *
 * Whole-number prices have .00 stripped (£10, not £10.00).
 * Fractional prices keep two decimals (£3.50, not £3.5).
 * Strings that already contain a currency symbol are passed through.
 */
export const formatPrice = (currency, value) => {
  if (typeof value === "string" && /\p{Sc}/u.test(value)) {
    return value;
  }

  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return new Intl.NumberFormat("en", { style: "currency", currency })
    .format(num)
    .replace(/\.00$/, "");
};

export const getCurrencySymbol = (currency) =>
  new Intl.NumberFormat("en", { style: "currency", currency })
    .formatToParts(0)
    .find((part) => part.type === "currency").value;
