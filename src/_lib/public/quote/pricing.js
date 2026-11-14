/**
 * Pricing the visitor's quote. A bought line costs its unit price times its
 * quantity; a hired line costs its price for the number of days asked for,
 * or is priced to be confirmed (null) without dates or a matching option.
 *
 * @module #public/quote/pricing
 */

/** @typedef {import("#public/quote/cart.js").CartItem} CartItem */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Days of hire from a start date to an end date, counting both: a hire
 * that ends the day it starts lasts one day. Null until both dates are
 * given, or when the end comes before the start.
 * @param {string | undefined} start - "YYYY-MM-DD"
 * @param {string | undefined} end - "YYYY-MM-DD"
 * @returns {number | null}
 */
export const hireDays = (start, end) => {
  if (!start || !end) return null;
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1;
  return days >= 1 ? days : null;
};

/**
 * The price of one line of the quote, or null when it cannot be known yet.
 * @param {number | null} days - Days of hire asked for
 * @returns {(item: CartItem) => number | null}
 */
export const linePrice = (days) => (item) => {
  if (Object.keys(item.hire_prices).length === 0) {
    return item.unit_price * item.quantity;
  }
  const price = days === null ? undefined : item.hire_prices[days];
  return price === undefined ? null : price * item.quantity;
};

/**
 * The price of the whole quote, or null when any line's is unknown.
 * @param {CartItem[]} items
 * @param {number | null} days
 * @returns {number | null}
 */
export const quoteTotal = (items, days) => {
  const prices = items.map(linePrice(days));
  return prices.includes(null)
    ? null
    : prices.reduce((sum, price) => sum + price, 0);
};
