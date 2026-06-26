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
