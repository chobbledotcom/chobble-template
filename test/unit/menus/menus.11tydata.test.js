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

describe("menus eleventyNavigation", () => {
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
});
