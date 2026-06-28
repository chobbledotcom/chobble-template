import { describe, expect, test } from "bun:test";
import menusData from "#menus/menus.11tydata.js";

const { eleventyComputed } = menusData;

const menuData = (overrides = {}) => ({
  name: "Lunch",
  order: 3,
  page: { fileSlug: "lunch", url: "/menus/lunch/" },
  strings: { menus_name: "Menus" },
  collections: {},
  ...overrides,
});

const menuCategory = (fileSlug, name, order, menus = ["lunch"]) => ({
  fileSlug,
  data: { name, order, menus },
});

describe("menus eleventyNavigation", () => {
  test("computes subtitle and pdf filename", () => {
    const data = menuData({
      page: { fileSlug: "brunch", url: "/menus/brunch/" },
      site: { name: "Café Example" },
      subtitle: "Served all weekend",
    });

    expect(eleventyComputed.subtitle(data)).toBe("Served all weekend");
    expect(eleventyComputed.subtitle(menuData())).toBe("");
    expect(eleventyComputed.pdfFilename(data)).toBe("cafe-example-brunch.pdf");
  });

  test("uses existing eleventyNavigation when present", () => {
    const eleventyNavigation = {
      key: "Custom Lunch",
      parent: "Food",
      order: 10,
    };

    expect(
      eleventyComputed.eleventyNavigation(
        menuData({
          config: { internal_link_suffix: "#content" },
          eleventyNavigation,
        }),
      ),
    ).toEqual({
      ...eleventyNavigation,
      url: "/menus/lunch/#content",
    });
  });

  test("builds default eleventyNavigation when none is present", () => {
    expect(eleventyComputed.eleventyNavigation(menuData())).toEqual({
      key: "Lunch",
      parent: "Menus",
      order: 3,
    });
  });

  test("collects dietary keys from this menu's sorted categories", () => {
    const vegan = { symbol: "VG", label: "Vegan" };
    const glutenFree = { symbol: "GF", label: "Gluten free" };
    const invalid = { symbol: "N" };
    const data = menuData({
      collections: {
        "menu-categories": [
          {
            fileSlug: "desserts",
            data: { name: "Desserts", order: 3, menus: ["dinner"] },
          },
          {
            fileSlug: "mains",
            data: { name: "Mains", order: 2, menus: ["lunch"] },
          },
          {
            fileSlug: "starters",
            data: { name: "Starters", order: 1, menus: ["lunch"] },
          },
          {
            fileSlug: "hidden",
            data: { name: "Hidden", order: 4 },
          },
        ],
        "menu-items": [
          {
            data: {
              menu_categories: ["mains"],
              dietaryKeys: [glutenFree, vegan],
            },
          },
          {
            data: {
              menu_categories: ["starters"],
              dietaryKeys: [vegan, invalid],
            },
          },
          {
            data: {
              menu_categories: ["desserts"],
              dietaryKeys: [{ symbol: "D", label: "Dinner only" }],
            },
          },
          {
            data: {
              dietaryKeys: [{ symbol: "M", label: "Missing category" }],
            },
          },
        ],
      },
    });

    expect(eleventyComputed.allDietaryKeys(data)).toEqual([vegan, glutenFree]);
  });

  test("handles missing menu category and item collections", () => {
    expect(eleventyComputed.allDietaryKeys(menuData())).toEqual([]);
  });

  test("includes an item's dietary keys once per category it belongs to", () => {
    const vegan = { symbol: "VG", label: "Vegan" };
    const dietaryKey = { symbol: "X", label: "Special" };
    const data = menuData({
      collections: {
        "menu-categories": [
          menuCategory("mains", "Mains", 1),
          menuCategory("desserts", "Desserts", 2),
        ],
        "menu-items": [
          {
            // Belongs to BOTH categories — its dietaryKeys appear for each
            data: {
              menu_categories: ["mains", "desserts"],
              dietaryKeys: [vegan, dietaryKey],
            },
          },
        ],
      },
    });

    // uniqueDietaryKeys deduplicates: each key appears only once in output,
    // even though the item was listed under both categories.
    expect(eleventyComputed.allDietaryKeys(data)).toEqual([vegan, dietaryKey]);
  });

  test("preserves source order of items within a category", () => {
    const first = { symbol: "A", label: "First" };
    const second = { symbol: "B", label: "Second" };
    const third = { symbol: "C", label: "Third" };
    const data = menuData({
      collections: {
        "menu-categories": [menuCategory("mains", "Mains", 1)],
        "menu-items": [
          { data: { menu_categories: ["mains"], dietaryKeys: [third] } },
          { data: { menu_categories: ["mains"], dietaryKeys: [first] } },
          { data: { menu_categories: ["mains"], dietaryKeys: [second] } },
        ],
      },
    });

    // Items appear in the order they were declared in the source collection,
    // matching the order the original .filter() produced.
    expect(eleventyComputed.allDietaryKeys(data)).toEqual([
      third,
      first,
      second,
    ]);
  });
});
