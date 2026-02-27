import { describe, expect, mock, test } from "bun:test";

// Mock config with clicky nav disabled BEFORE importing navigation
mock.module("#data/config.js", () => ({
  default: () => ({ navigation_is_clicky: false }),
}));

const { toNavigation } = await import("#collections/navigation.js");

describe("navigation caret with clicky nav disabled", () => {
  test("Does not render caret button when navigation_is_clicky is false", async () => {
    const pages = [
      {
        key: "Products",
        title: "Products",
        url: "/products/",
        pluginType: "eleventy-navigation",
        data: {},
        children: [
          {
            key: "Category A",
            title: "Category A",
            url: "/category-a/",
            pluginType: "eleventy-navigation",
            data: {},
            children: [],
          },
        ],
      },
    ];
    const result = await toNavigation(pages, "");
    expect(result).toContain("Products");
    expect(result).toContain("Category A");
    expect(result).not.toContain("nav-caret");
  });
});
