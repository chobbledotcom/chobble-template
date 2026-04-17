import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.header_text", () => {
  test("returns header_text when set", () => {
    expect(
      eleventyComputed.header_text({
        header_text: "Custom Header",
        title: "Page Title",
      }),
    ).toBe("Custom Header");
  });

  test("falls back to title when header_text is not set", () => {
    expect(eleventyComputed.header_text({ title: "Page Title" })).toBe(
      "Page Title",
    );
  });
});

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
        snippet: "Snippet",
      }),
    ).toBe("Main description");
  });

  test("falls back to snippet when description is not set", () => {
    expect(
      eleventyComputed.description({
        snippet: "Snippet text",
        meta_description: "Meta desc",
      }),
    ).toBe("Snippet text");
  });

  test("falls back to meta_description when description and snippet are not set", () => {
    expect(
      eleventyComputed.description({ meta_description: "Meta description" }),
    ).toBe("Meta description");
  });

  test("returns empty string when no description field is set", () => {
    expect(eleventyComputed.description({})).toBe("");
  });
});

describe("eleventyComputed.rating", () => {
  test("returns the explicit rating when set", () => {
    expect(eleventyComputed.rating({ rating: 3 })).toBe(3);
  });

  test("preserves a rating of zero instead of applying the default", () => {
    expect(eleventyComputed.rating({ rating: 0 })).toBe(0);
  });

  test("defaults to 5 when rating is not set", () => {
    expect(eleventyComputed.rating({})).toBe(5);
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
