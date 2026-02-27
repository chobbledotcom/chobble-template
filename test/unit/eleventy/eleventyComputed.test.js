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
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.title).toBe("uppercase product");
  });

  test("extracts lowest option price", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [{ unit_price: 100 }, { unit_price: 50 }, { unit_price: 75 }],
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(50);
  });

  test("parses filter_attributes into slugified filters", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [{ unit_price: 10 }],
      filter_attributes: [
        { name: "Size", value: "Large" },
        { name: "Color", value: "Red" },
      ],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.filters).toEqual({
      size: "large",
      color: "red",
    });
  });

  test("returns empty filters when filter_attributes is empty", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [{ unit_price: 10 }],
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.filters).toEqual({});
  });

  test("falls back to product price field when options is empty", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [],
      price: 29.99,
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(29.99);
  });

  test("strips non-numeric characters from price field", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [],
      price: "$19.99",
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(19.99);
  });

  test("strips currency symbols and spaces from price field", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [],
      price: "£ 150.00",
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(150);
  });

  test("returns undefined price when no options and no price field", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [],
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBeUndefined();
  });

  test("prefers option prices over product price field", () => {
    const data = {
      title: "Test Product",
      tags: ["products"],
      options: [{ unit_price: 25 }],
      price: "50.00",
      filter_attributes: [],
    };

    const result = eleventyComputed.filter_data(data);
    expect(result.price).toBe(25);
  });
});
