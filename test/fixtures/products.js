/**
 * Products as a site writes them in src/products/, shared by the tests of
 * the quote: one hired by the day, one bought in either of two sizes.
 */

/** A hire product: a day, or a weekend, and at most two to a quote. */
export const TENT = {
  name: "Tent",
  max_quantity: 2,
  options: [
    { name: "Day", days: 1, unit_price: 80 },
    { name: "Weekend", days: 3, unit_price: 180 },
  ],
};

/** A product to buy, in a small or large size. */
export const PLATTER = {
  name: "Platter",
  options: [
    { name: "Small", unit_price: 45 },
    { name: "Large", unit_price: 99.5 },
  ],
};
