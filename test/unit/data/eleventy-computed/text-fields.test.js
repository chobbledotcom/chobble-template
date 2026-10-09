import { describe, expect, test } from "vitest";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.meta_title", () => {
  test("returns meta_title when set", () => {
    expect(
      eleventyComputed.meta_title({
        meta_title: "SEO Title",
        title: "Page Title",
      }),
    ).toBe("SEO Title");
  });

  test("returns undefined when meta_title is not set (template fills in fallback)", () => {
    expect(
      eleventyComputed.meta_title({ title: "Page Title" }),
    ).toBeUndefined();
  });
});

describe("eleventyComputed.description", () => {
  test("returns description when set", () => {
    expect(
      eleventyComputed.description({
        description: "Main description",
        meta_description: "Meta desc",
      }),
    ).toBe("Main description");
  });

  test("falls back to meta_description when description is not set", () => {
    expect(
      eleventyComputed.description({ meta_description: "Meta description" }),
    ).toBe("Meta description");
  });

  test("returns empty string when no description field is set", () => {
    expect(eleventyComputed.description({})).toBe("");
  });
});

describe("eleventyComputed.order", () => {
  test("returns the explicit order when set", () => {
    expect(eleventyComputed.order({ order: 5 })).toBe(5);
  });

  test("preserves an order of zero instead of applying the default", () => {
    expect(eleventyComputed.order({ order: 0 })).toBe(0);
  });

  test("defaults to 9999 (sorts last) when order is not set", () => {
    expect(eleventyComputed.order({})).toBe(9999);
  });
});

describe("eleventyComputed.faqs", () => {
  test("returns the faqs array unchanged when set", () => {
    const faqs = [{ question: "Q1", answer: "A1" }];
    expect(eleventyComputed.faqs({ faqs })).toBe(faqs);
  });

  test("returns an empty array when faqs is not set", () => {
    expect(eleventyComputed.faqs({})).toEqual([]);
  });
});
