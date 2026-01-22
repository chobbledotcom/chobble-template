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
    locations = undefined,
  ) =>
    mockConfig.filters.breadcrumbsFilter(
      page,
      title,
      navigationParent,
      parentLocation,
      parentCategory,
      categories,
      locations,
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

  describe("index pages without navigationParent", () => {
    const testCases = [
      { url: "/products/", title: "Products", navParent: undefined },
      { url: "/events/", title: "Events", navParent: undefined },
      { url: "/products/", title: "Our Products", navParent: null },
      { url: "/events/", title: "All Events", navParent: "" },
    ];

    for (const { url, title, navParent } of testCases) {
      const navParentDesc =
        navParent === undefined
          ? "undefined"
          : navParent === null
            ? "null"
            : "empty string";

      test(`uses title "${title}" when navigationParent is ${navParentDesc}`, () => {
        const mockConfig = setupFilter();
        const crumbs = callFilter(mockConfig, { url }, title, navParent, null);

        expect(crumbs).toEqual([
          { label: "Home", url: "/" },
          { label: title, url: null },
        ]);
      });
    }
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
    const locations = [
      {
        fileSlug: "london",
        url: "/locations/london/",
        data: { title: "London" },
      },
    ];

    // Subpage under a location shows all 4 crumbs
    const subpageCrumbs = callFilter(
      mockConfig,
      { url: "/locations/london/widget-removal/" },
      "Widget Removal",
      "Locations",
      "london",
      undefined,
      undefined,
      locations,
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
      undefined,
      undefined,
      locations,
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

    test("throws when parentCategory is not found in categories", () => {
      const mockConfig = setupFilter();
      const categories = [
        {
          fileSlug: "other",
          url: "/products/other/",
          data: { title: "Other" },
        },
      ];

      expect(() =>
        callFilter(
          mockConfig,
          { url: "/products/premium-widgets/" },
          "Premium Widgets",
          "Products",
          null,
          "widgets",
          categories,
        ),
      ).toThrow('Slug "widgets" not found');
    });
  });
});
