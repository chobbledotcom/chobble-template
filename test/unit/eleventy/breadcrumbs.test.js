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
  const setupFilter = () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    return mockConfig;
  };

  const callFilter = (
    mockConfig,
    page,
    title,
    navigationParent,
    parentLocation,
    parentCategory = undefined,
    categories = undefined,
  ) =>
    mockConfig.filters.breadcrumbsFilter(
      page,
      title,
      navigationParent,
      parentLocation,
      parentCategory,
      categories,
    );

  test("returns empty array for home page", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(mockConfig, { url: "/" }, "Home", "Home", null);
    expect(crumbs).toEqual([]);
  });

  test("returns Home and collection for index page", () => {
    const mockConfig = setupFilter();
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
    const mockConfig = setupFilter();
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
    const mockConfig = setupFilter();

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
    const mockConfig = setupFilter();
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

  describe("parent category breadcrumbs", () => {
    const widgetCategory = {
      fileSlug: "widgets",
      url: "/products/widgets/",
      data: { title: "Widgets" },
    };

    test("handles parentCategory for child categories", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/products/premium-widgets/" },
        "Premium Widgets",
        "Products",
        null,
        "widgets",
        [widgetCategory],
      );

      expect(crumbs).toHaveLength(4);
      expect(crumbs[2]).toEqual({
        label: "Widgets",
        url: "/products/widgets/",
      });
      expect(crumbs[3]).toEqual({ label: "Premium Widgets", url: null });
    });

    test("shows parent category as current when at parent URL", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/products/widgets/" },
        "Widgets",
        "Products",
        null,
        "widgets",
        [widgetCategory],
      );

      expect(crumbs).toHaveLength(3);
      expect(crumbs[2]).toEqual({ label: "Widgets", url: null });
    });

    test("falls back to slug title when parent category has no title", () => {
      const mockConfig = setupFilter();
      const categories = [
        { fileSlug: "cool-widgets", url: "/products/cool-widgets/", data: {} },
      ];
      const crumbs = callFilter(
        mockConfig,
        { url: "/products/premium-cool-widgets/" },
        "Premium Cool Widgets",
        "Products",
        null,
        "cool-widgets",
        categories,
      );

      expect(crumbs[2].label).toBe("Cool Widgets");
    });

    test("ignores parentCategory when not found in categories", () => {
      const mockConfig = setupFilter();
      const categories = [
        {
          fileSlug: "other",
          url: "/products/other/",
          data: { title: "Other" },
        },
      ];
      const crumbs = callFilter(
        mockConfig,
        { url: "/products/premium-widgets/" },
        "Premium Widgets",
        "Products",
        null,
        "widgets",
        categories,
      );

      // Should fall back to normal 3-crumb structure
      expect(crumbs).toHaveLength(3);
      expect(crumbs[2]).toEqual({ label: "Premium Widgets", url: null });
    });
  });
});
