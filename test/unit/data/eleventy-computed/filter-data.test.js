import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

/** Build a product-shaped page data object with sensible defaults. */
const makeProduct = (overrides = {}) => ({
  title: "Test Product",
  tags: ["products"],
  options: [],
  filter_attributes: [],
  ...overrides,
});

describe("eleventyComputed.filter_data", () => {
  test("returns undefined when the page is not tagged 'products'", () => {
    expect(
      eleventyComputed.filter_data({ title: "Some Event", tags: ["events"] }),
    ).toBeUndefined();
  });

  test("lowercases the product title so client-side search is case-insensitive", () => {
    const result = eleventyComputed.filter_data(
      makeProduct({
        title: "UPPERCASE PRODUCT",
        options: [{ unit_price: 10 }],
      }),
    );
    expect(result.title).toBe("uppercase product");
  });

  test("uses the lowest option unit_price when options exist", () => {
    const result = eleventyComputed.filter_data(
      makeProduct({
        options: [{ unit_price: 100 }, { unit_price: 50 }, { unit_price: 75 }],
      }),
    );
    expect(result.price).toBe(50);
  });

  test("prefers option prices over the top-level product price", () => {
    const result = eleventyComputed.filter_data(
      makeProduct({ options: [{ unit_price: 25 }], price: "50.00" }),
    );
    expect(result.price).toBe(25);
  });

  test("falls back to the product price field when options is empty", () => {
    expect(
      eleventyComputed.filter_data(makeProduct({ price: 29.99 })).price,
    ).toBe(29.99);
  });

  test("strips currency symbols from a string price field", () => {
    expect(
      eleventyComputed.filter_data(makeProduct({ price: "$19.99" })).price,
    ).toBe(19.99);
  });

  test("strips spaces and symbols alike from a string price field", () => {
    expect(
      eleventyComputed.filter_data(makeProduct({ price: "£ 150.00" })).price,
    ).toBe(150);
  });

  test("returns undefined price when there are no options and no price", () => {
    expect(eleventyComputed.filter_data(makeProduct()).price).toBeUndefined();
  });

  test("returns undefined price when the price field contains no digits", () => {
    expect(
      eleventyComputed.filter_data(makeProduct({ price: "POA" })).price,
    ).toBeUndefined();
  });

  test("slugifies filter_attributes into lowercase key/value pairs", () => {
    const result = eleventyComputed.filter_data(
      makeProduct({
        options: [{ unit_price: 10 }],
        filter_attributes: [
          { name: "Size", value: "Large" },
          { name: "Color", value: "Red" },
        ],
      }),
    );
    expect(result.filters).toEqual({ size: "large", color: "red" });
  });

  test("returns an empty filters object when filter_attributes is empty", () => {
    const result = eleventyComputed.filter_data(
      makeProduct({ options: [{ unit_price: 10 }] }),
    );
    expect(result.filters).toEqual({});
  });
});
