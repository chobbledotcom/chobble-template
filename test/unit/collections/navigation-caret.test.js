import { describe, expect, mock, test } from "bun:test";

// Mock config with clicky nav disabled BEFORE importing navigation
mock.module("#data/config.js", () => ({
  default: () => ({ navigation_is_clicky: false }),
}));

const { toNavigation } = await import("#collections/navigation.js");

/** Create a navigation entry as returned by eleventyNavigation filter */
const navEntry = (key, options = {}) => ({
  key,
  title: options.title ?? key,
  url: options.url ?? `/${key.toLowerCase()}/`,
  pluginType: "eleventy-navigation",
  data: options.data ?? {},
  children: options.children ?? [],
});

describe("navigation caret with clicky nav disabled", () => {
  test("Does not render caret button when navigation_is_clicky is false", async () => {
    const pages = [
      navEntry("Products", {
        children: [navEntry("Category A")],
      }),
    ];
    const result = await toNavigation(pages, "");
    expect(result).toContain("Products");
    expect(result).toContain("Category A");
    expect(result).not.toContain("nav-caret");
  });
});
