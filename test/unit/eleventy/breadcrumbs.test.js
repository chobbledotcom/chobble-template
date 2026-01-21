import { describe, expect, test } from "bun:test";
import { configureBreadcrumbs } from "#eleventy/breadcrumbs.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("configureBreadcrumbs", () => {
  test("registers breadcrumbsHtmlFilter async filter", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    expect(typeof mockConfig.asyncFilters.breadcrumbsHtmlFilter).toBe(
      "function",
    );
  });
});

describe("breadcrumbsHtmlFilter filter", () => {
  test("returns empty string for home page", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/" },
      "Home",
      "Home",
      null,
    );

    expect(html).toBe("");
  });

  test("renders Home and collection span for index page", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/products/" },
      "Products",
      "Products",
      null,
    );

    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<span aria-current="page">Products</span>');
    expect(html).not.toContain('<a href="/products/">');
  });

  test("renders Home, collection link, and item span for product page", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/products/test-product/" },
      "Test Product",
      "Products",
      null,
    );

    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/products/">Products</a>');
    expect(html).toContain('<span aria-current="page">Test Product</span>');
  });

  test("renders breadcrumbs for events collection", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/events/summer-fest/" },
      "Summer Fest",
      "Events",
      null,
    );

    expect(html).toContain('<a href="/events/">Events</a>');
    expect(html).toContain('<span aria-current="page">Summer Fest</span>');
  });

  test("renders breadcrumbs for location subpage with parent", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/locations/london/widget-removal/" },
      "Widget Removal",
      "Locations",
      "london",
    );

    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/locations/">Locations</a>');
    expect(html).toContain('<a href="/locations/london/">London</a>');
    expect(html).toContain('<span aria-current="page">Widget Removal</span>');
  });

  test("renders location page as current when at parent location", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/locations/springfield/" },
      "Springfield",
      "Locations",
      null,
    );

    expect(html).toContain('<a href="/locations/">Locations</a>');
    expect(html).toContain('<span aria-current="page">Springfield</span>');
  });

  test("renders parent location as span when at that location with parentLocation set", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/locations/london/" },
      "London",
      "Locations",
      "london",
    );

    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/locations/">Locations</a>');
    expect(html).toContain('<span aria-current="page">London</span>');
    expect(html).not.toContain('<a href="/locations/london/">');
  });

  test("renders proper HTML structure with nav, ol, and li elements", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/products/item/" },
      "Item",
      "Products",
      null,
    );

    expect(html).toContain('<div class="design-system">');
    expect(html).toContain('<nav aria-label="Breadcrumb"');
    expect(html).toContain('class="breadcrumbs"');
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
    expect(html).toContain('class="separator"');
    expect(html).toContain('aria-hidden="true"');
  });

  test("handles unknown navigation parent by deriving URL from page URL", async () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    const html = await mockConfig.asyncFilters.breadcrumbsHtmlFilter(
      { url: "/custom/item/" },
      "Item",
      "Custom Section",
      null,
    );

    expect(html).toContain('<a href="/custom/">Custom Section</a>');
    expect(html).toContain('<span aria-current="page">Item</span>');
  });
});
