import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.filter_data", () => {
  test("returns undefined for non-products", () => {
    const data = {
      title: "Some Event",
      tags: ["events"],
    };

    expect(eleventyComputed.filter_data(data)).toBeUndefined();
  });

  test("lowercases title", () => {
    const data = {
      title: "UPPERCASE PRODUCT",
      tags: ["products"],
      options: [{ unit_price: 10 }],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.title).toBe("uppercase product");
  });

  test("extracts lowest option price", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [{ unit_price: 100 }, { unit_price: 50 }, { unit_price: 75 }],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(50);
  });
});
