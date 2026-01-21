import { describe, expect, test } from "bun:test";
import { configureBreadcrumbs } from "#eleventy/breadcrumbs.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("configureBreadcrumbs", () => {
  test("registers breadcrumbsFilter", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    expect(typeof mockConfig.filters.breadcrumbsFilter).toBe("function");
  });
});

describe("breadcrumbsFilter", () => {
  const callFilter = (
    mockConfig,
    page,
    title,
    navigationParent,
    parentLocation,
  ) =>
    mockConfig.filters.breadcrumbsFilter(
      page,
      title,
      navigationParent,
      parentLocation,
    );

  test("returns empty array for home page", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    const crumbs = callFilter(mockConfig, { url: "/" }, "Home", "Home", null);

    expect(crumbs).toEqual([]);
  });

  test("returns Home and collection for index page", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    const crumbs = callFilter(
      mockConfig,
      { url: "/products/" },
      "Products",
      "Products",
      null,
    );

    expect(crumbs).toEqual([
      { label: "Home", url: "/" },
      { label: "Products", url: null },
    ]);
  });

  test("returns Home, collection link, and item for product page", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    const crumbs = callFilter(
      mockConfig,
      { url: "/products/test-product/" },
      "Test Product",
      "Products",
      null,
    );

    expect(crumbs).toEqual([
      { label: "Home", url: "/" },
      { label: "Products", url: "/products/" },
      { label: "Test Product", url: null },
    ]);
  });

  test("handles parentLocation for subpages and parent pages", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    // Subpage under a location shows all 4 crumbs
    const subpageCrumbs = callFilter(
      mockConfig,
      { url: "/locations/london/widget-removal/" },
      "Widget Removal",
      "Locations",
      "london",
    );
    expect(subpageCrumbs).toHaveLength(4);
    expect(subpageCrumbs[2]).toEqual({
      label: "London",
      url: "/locations/london/",
    });
    expect(subpageCrumbs[3]).toEqual({ label: "Widget Removal", url: null });

    // At the parent location itself shows 3 crumbs with parent as current
    const parentCrumbs = callFilter(
      mockConfig,
      { url: "/locations/london/" },
      "London",
      "Locations",
      "london",
    );
    expect(parentCrumbs).toHaveLength(3);
    expect(parentCrumbs[2]).toEqual({ label: "London", url: null });
  });

  test("derives URL from page URL for unknown navigation parent", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    const crumbs = callFilter(
      mockConfig,
      { url: "/custom/item/" },
      "Item",
      "Custom Section",
      null,
    );

    expect(crumbs).toEqual([
      { label: "Home", url: "/" },
      { label: "Custom Section", url: "/custom/" },
      { label: "Item", url: null },
    ]);
  });
});
