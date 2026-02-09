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
    itemCategories = undefined,
    collections = {},
    parentProperty = undefined,
    parentGuideCategory = undefined,
  ) =>
    mockConfig.filters.breadcrumbsFilter(
      page,
      title,
      navigationParent,
      parentLocation,
      parentCategory,
      itemCategories,
      collections,
      parentProperty,
      parentGuideCategory,
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
      { locations },
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
      { locations },
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

  describe("category breadcrumbs for products", () => {
    const widgetCategory = {
      fileSlug: "widgets",
      url: "/categories/widgets/",
      data: { title: "Widgets" },
    };
    const premiumWidgets = {
      fileSlug: "premium-widgets",
      url: "/categories/premium-widgets/",
      data: { title: "Premium Widgets", parent: "widgets" },
    };
    const categories = [widgetCategory, premiumWidgets];

    test("shows category in breadcrumbs for product with category", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/products/my-product/" },
        "My Product",
        "Products",
        null,
        undefined,
        ["widgets"],
        { categories },
      );

      expect(crumbs).toHaveLength(4);
      expect(crumbs[2]).toEqual({
        label: "Widgets",
        url: "/categories/widgets/",
      });
      expect(crumbs[3]).toEqual({ label: "My Product", url: null });
    });

    test("shows parent and child category for product in nested category", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/products/my-widget/" },
        "My Widget",
        "Products",
        null,
        undefined,
        ["premium-widgets"],
        { categories },
      );

      expect(crumbs).toHaveLength(5);
      expect(crumbs[2]).toEqual({
        label: "Widgets",
        url: "/categories/widgets/",
      });
      expect(crumbs[3]).toEqual({
        label: "Premium Widgets",
        url: "/categories/premium-widgets/",
      });
      expect(crumbs[4]).toEqual({ label: "My Widget", url: null });
    });
  });

  describe("category page breadcrumbs", () => {
    const widgetCategory = {
      fileSlug: "widgets",
      url: "/categories/widgets/",
      data: { title: "Widgets" },
    };

    test("handles explicit parentCategory for child category pages", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/categories/premium-widgets/" },
        "Premium Widgets",
        "Products",
        null,
        "widgets",
        undefined,
        { categories: [widgetCategory] },
      );

      expect(crumbs.map((c) => c.label)).toEqual([
        "Home",
        "Products",
        "Widgets",
        "Premium Widgets",
      ]);
      expect(crumbs[2].url).toBe("/categories/widgets/");
    });

    test("shows parent category as current when at parent URL", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/categories/widgets/" },
        "Widgets",
        "Products",
        null,
        "widgets",
        undefined,
        { categories: [widgetCategory] },
      );

      expect(crumbs).toHaveLength(3);
      expect(crumbs[2]).toEqual({ label: "Widgets", url: null });
    });

    test("throws when parentCategory is not found in categories", () => {
      const mockConfig = setupFilter();
      const categories = [
        {
          fileSlug: "other",
          url: "/categories/other/",
          data: { title: "Other" },
        },
      ];

      expect(() =>
        callFilter(
          mockConfig,
          { url: "/categories/premium-widgets/" },
          "Premium Widgets",
          "Products",
          null,
          "widgets",
          undefined,
          { categories },
        ),
      ).toThrow('Slug "widgets" not found');
    });
  });

  describe("property-linked guide category breadcrumbs", () => {
    const properties = [
      {
        fileSlug: "sunset-cottage",
        url: "/properties/sunset-cottage/",
        data: { title: "Sunset Cottage" },
      },
    ];

    const guideCategories = [
      {
        fileSlug: "getting-started",
        url: "/guide/getting-started/",
        data: { title: "Getting Started", property: "sunset-cottage" },
      },
      {
        fileSlug: "general",
        url: "/guide/general/",
        data: { title: "General" },
      },
    ];

    test("shows property as second crumb for guide category with property", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/guide/getting-started/" },
        "Getting Started",
        "Guide",
        null,
        undefined,
        undefined,
        { properties },
        "sunset-cottage",
      );

      expect(crumbs).toEqual([
        { label: "Home", url: "/" },
        { label: "Sunset Cottage", url: "/properties/sunset-cottage/" },
        { label: "Getting Started", url: null },
      ]);
    });

    test("shows property and category for guide page via parentGuideCategory", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/guide/getting-started/my-page/" },
        "My Page",
        "Guide",
        null,
        undefined,
        undefined,
        { properties, "guide-categories": guideCategories },
        undefined,
        "getting-started",
      );

      expect(crumbs).toEqual([
        { label: "Home", url: "/" },
        { label: "Sunset Cottage", url: "/properties/sunset-cottage/" },
        { label: "Getting Started", url: "/guide/getting-started/" },
        { label: "My Page", url: null },
      ]);
    });

    test("falls back to normal breadcrumbs when guide category has no property", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/guide/general/my-page/" },
        "My Page",
        "Guide",
        null,
        undefined,
        undefined,
        { properties, "guide-categories": guideCategories },
        undefined,
        "general",
      );

      expect(crumbs).toEqual([
        { label: "Home", url: "/" },
        { label: "Guide", url: "/guide/" },
        { label: "My Page", url: null },
      ]);
    });

    test("falls back to normal breadcrumbs when no property or guideCategory", () => {
      const mockConfig = setupFilter();
      const crumbs = callFilter(
        mockConfig,
        { url: "/guide/some-category/" },
        "Some Category",
        "Guide",
        null,
      );

      expect(crumbs).toEqual([
        { label: "Home", url: "/" },
        { label: "Guide", url: "/guide/" },
        { label: "Some Category", url: null },
      ]);
    });
  });
});
