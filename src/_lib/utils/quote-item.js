/**
 * What a product offers a visitor's quote: the data its add-to-quote button
 * carries, computed once per product from its `options`.
 *
 * Every option of a hire product names how many `days` it lasts, and one
 * of them lasts a day: that is the price the button shows, and the quote
 * prices the product by the option matching the days the visitor asks for.
 * A product whose options name no days is bought, one option at a time.
 *
 * @module #utils/quote-item
 */

/** @typedef {import("#lib/types").ProductOption} ProductOption */
/** @typedef {import("#lib/types").QuoteItem} QuoteItem */

/**
 * The quote data of a product, or null for a product without options,
 * which cannot be added to a quote.
 * @param {{ name: string, options?: ProductOption[], max_quantity?: number }} product
 * @returns {QuoteItem | null}
 */
export const quoteItem = ({ name, options = [], max_quantity }) => {
  if (options.length === 0) return null;
  /** @param {string} problem */
  const fail = (problem) => {
    throw new Error(`Product "${name}" ${problem}`);
  };
  if (options.some((option) => typeof option.unit_price !== "number")) {
    fail("has an option without a unit_price");
  }
  const days = options.flatMap((option) =>
    option.days === undefined ? [] : [option.days],
  );
  if (days.length === 0) {
    return {
      name,
      max_quantity,
      hire: false,
      hire_prices: {},
      options: options.map((option) => ({
        label: option.name,
        name: options.length > 1 ? `${name} - ${option.name}` : name,
        unit_price: option.unit_price,
      })),
    };
  }
  if (days.length < options.length) fail("mixes hire and purchase options");
  if (new Set(days).size < days.length) fail("prices a length of hire twice");
  if (!days.includes(1)) fail("is hired but has no 1-day option");
  const hire_prices = Object.fromEntries(
    options.map((option) => [option.days, option.unit_price]),
  );
  return {
    name,
    max_quantity,
    hire: true,
    hire_prices,
    options: [{ label: name, name, unit_price: hire_prices[1] }],
  };
};
