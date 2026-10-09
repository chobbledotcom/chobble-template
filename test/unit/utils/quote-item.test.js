import { describe, expect, test } from "vitest";
import { quoteItem } from "#utils/quote-item.js";

const HIRE_OPTIONS = [
  { name: "Weekend", days: 3, unit_price: 180 },
  { name: "One day", days: 1, unit_price: 80 },
];

describe("quoteItem", () => {
  test("gives a product without options nothing to add to a quote", () => {
    expect(quoteItem({ name: "Leaflet" })).toBeNull();
    expect(quoteItem({ name: "Leaflet", options: [] })).toBeNull();
  });

  test("adds a single bought option under the product's own name", () => {
    expect(
      quoteItem({
        name: "Mug",
        options: [{ name: "Standard", unit_price: 8 }],
      }),
    ).toEqual({
      name: "Mug",
      max_quantity: undefined,
      hire: false,
      hire_prices: {},
      options: [{ label: "Standard", name: "Mug", unit_price: 8 }],
    });
  });

  test("names each of several bought options after the product", () => {
    const item = quoteItem({
      name: "Platter",
      options: [
        { name: "Serves 10", unit_price: 45 },
        { name: "Serves 25", unit_price: 99.5 },
      ],
    });
    expect(item.options.map((option) => option.name)).toEqual([
      "Platter - Serves 10",
      "Platter - Serves 25",
    ]);
  });

  test("offers a hire product once, at its one-day price", () => {
    const item = quoteItem({
      name: "Tent",
      options: HIRE_OPTIONS,
      max_quantity: 3,
    });
    expect(item).toEqual({
      name: "Tent",
      max_quantity: 3,
      hire: true,
      hire_prices: { 1: 80, 3: 180 },
      options: [{ label: "Tent", name: "Tent", unit_price: 80 }],
    });
  });

  test.each([
    {
      problem: "an option without a price",
      options: [{ name: "Free", unit_price: "10" }],
      error: 'Product "Thing" has an option without a unit_price',
    },
    {
      problem: "hire and purchase options together",
      options: [HIRE_OPTIONS[1], { name: "Buy", unit_price: 500 }],
      error: 'Product "Thing" mixes hire and purchase options',
    },
    {
      problem: "two prices for one length of hire",
      options: [...HIRE_OPTIONS, { name: "Day", days: 1, unit_price: 70 }],
      error: 'Product "Thing" prices a length of hire twice',
    },
    {
      problem: "hire with no one-day option",
      options: [HIRE_OPTIONS[0]],
      error: 'Product "Thing" is hired but has no 1-day option',
    },
  ])("rejects a product with $problem", ({ options, error }) => {
    expect(() => quoteItem({ name: "Thing", options })).toThrow(error);
  });
});
