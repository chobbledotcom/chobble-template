/**
 * A price as the site shows it, in the site's currency. Whole amounts drop
 * their pence: "£20", but "£12.50".
 *
 * Shared by the `formatPrice` filter and the visitor's quote in the browser,
 * so a price reads the same on a product as in the quote.
 *
 * @param {number} amount
 * @param {string} currency - ISO 4217 code, e.g. "GBP"
 * @returns {string}
 */
export const formatPrice = (amount, currency) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
