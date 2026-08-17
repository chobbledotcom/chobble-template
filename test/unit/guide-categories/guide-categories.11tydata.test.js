import { describe, expect, test } from "bun:test";
import guideCategoriesData from "#guide-categories/guide-categories.11tydata.js";

const { eleventyComputed } = guideCategoriesData;

const categoryData = (overrides = {}) => ({
  name: "About the Accommodation",
  page: { fileSlug: "about-the-accommodation", url: "/guide/about/" },
  strings: { guide_name: "Guide" },
  ...overrides,
});

describe("guide categories property", () => {
  test("Normalises a CMS property reference to a slug", () => {
    const data = categoryData({ property: "properties/roger-pot.md" });

    expect(eleventyComputed.property(data)).toBe("roger-pot");
  });

  test("Leaves the property unset when the category has none", () => {
    expect(eleventyComputed.property(categoryData())).toBeUndefined();
  });
});

describe("guide categories eleventyNavigation", () => {
  test("Builds a Guide navigation entry for a general category", () => {
    expect(eleventyComputed.eleventyNavigation(categoryData())).toEqual({
      key: "About the Accommodation",
      parent: "Guide",
      order: 0,
    });
  });

  test("Suppresses navigation for a category tied to a property", () => {
    const data = categoryData({ property: "roger-pot" });

    expect(eleventyComputed.eleventyNavigation(data)).toBe(false);
  });

  test("Uses an explicit eleventyNavigation even with a property set", () => {
    const eleventyNavigation = { key: "Guest Guide", parent: "Guide" };
    const data = categoryData({ property: "roger-pot", eleventyNavigation });

    expect(eleventyComputed.eleventyNavigation(data)).toEqual(
      eleventyNavigation,
    );
  });
});
