/**
 * Price parsing utilities
 *
 * Curried so callers can fix their preferred fallback: 0 for cart maths,
 * null for "no price" sentinels.
 */

/**
 * Parse a price from a string or number, returning a fallback when unparseable.
 *
 * Numbers pass through unchanged. Falsy inputs return the fallback. Strings
 * are scanned for the first numeric run (e.g. "£10.50" → 10.5).
 *
 * @param {number | null} fallback - Value returned when input is missing or unparseable
 * @returns {(price: string | number | null | undefined) => number | null} Function that parses a price
 *
 * @example
 * const toCartPrice = parsePrice(0);   // "£10" → 10, undefined → 0
 * const toOptional = parsePrice(null); // "£10" → 10, undefined → null
 */
export const parsePrice = (fallback) => (price) => {
  if (typeof price === "number") return price;
  if (!price) return fallback;
  const matches = String(price).match(/[\d.]+/);
  return matches ? Number.parseFloat(matches[0]) : fallback;
};

/**
 * Detect an "ambiguous" authored price string.
 *
 * A price is ambiguous when it contains more than one numeric run, e.g.
 * `"£10 / £12"`, `"from £8 to £14"`, or `"2 for £15"`. Such strings cannot
 * be resolved to a single unit price for cart data, so callers should render
 * the authored string verbatim but skip cart controls.
 *
 * Non-string prices (numbers, null, undefined) are never ambiguous; their
 * parseability is handled by `parsePrice`.
 *
 * @param {string | number | null | undefined} price
 * @returns {boolean}
 *
 * @example
 * isAmbiguousPrice("£10 / £12"); // true
 * isAmbiguousPrice("from £8 to £14"); // true
 * isAmbiguousPrice("£15.00"); // false
 * isAmbiguousPrice(15); // false
 * isAmbiguousPrice(null); // false
 */
export const isAmbiguousPrice = (price) => {
  if (typeof price !== "string") return false;
  const matches = price.match(/[\d.]+/g);
  return matches != null && matches.length > 1;
};
