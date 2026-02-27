import { describe, expect, test } from "bun:test";
import {
  configureNavigation,
  findPageUrl,
  toNavigation,
} from "#collections/navigation.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
  item,
} from "#test/test-utils.js";
import { map } from "#toolkit/fp/array.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/** Create a page item for findPageUrl tests */
const pageItem = (slug, url, tags = []) => ({
  data: { tags },
  fileSlug: slug,
  url,
});

/** Assert findPageUrl finds target page despite noisy items */
const expectFindsTarget = (noisyItems) => {
  const target = pageItem("hello-world", "/posts/hello-world/", ["post"]);
  expect(findPageUrl([...noisyItems, target], "post", "hello-world")).toBe(
    "/posts/hello-world/",
  );
};

/** Create navigation item from [title, navOptions] tuple */
const navItem = ([title, navOptions]) =>
  item(title, { eleventyNavigation: navOptions });

/** Transform tuples to navigation items */
const navItems = map(navItem);

/** Create mock collection API from navigation tuples */
const navCollectionApi = (tuples) => ({
  getAll: () => navItems(tuples),
});

/** Setup configured navigation and return mockConfig */
const withNavigation = async () => {
  const mockConfig = createMockEleventyConfig();
  await configureNavigation(mockConfig);
  return mockConfig;
};

/** Create a navigation entry as returned by eleventyNavigation filter */
const navEntry = (key, options = {}) => ({
  key,
  title: options.title ?? key,
  url: options.url ?? `/${key.toLowerCase()}/`,
  pluginType: "eleventy-navigation",
  data: options.data ?? {},
  children: options.children ?? [],
});

describe("navigation", () => {
  test("Finds page URL by tag and slug", () => {
    const collection = [
      pageItem("hello-world", "/posts/hello-world/", ["post"]),
      pageItem("about", "/about/", ["page"]),
      pageItem("featured-post", "/posts/featured-post/", ["post", "featured"]),
    ];

    expect(findPageUrl(collection, "post", "hello-world")).toBe(
      "/posts/hello-world/",
    );
  });

  test("Finds page with multiple tags", () => {
    const collection = [
      pageItem("featured-post", "/posts/featured-post/", ["post", "featured"]),
      pageItem("about", "/about/", ["page"]),
    ];

    expect(findPageUrl(collection, "featured", "featured-post")).toBe(
      "/posts/featured-post/",
    );
  });

  test("Throws when page not found", () => {
    const collection = [
      pageItem("hello-world", "/posts/hello-world/", ["post"]),
    ];

    expect(() => findPageUrl(collection, "post", "nonexistent")).toThrow(
      'Slug "nonexistent" not found',
    );
  });

  test("Throws when slug exists but tag does not match", () => {
    const collection = [
      pageItem("hello-world", "/posts/hello-world/", ["post"]),
    ];

    expect(() => findPageUrl(collection, "page", "hello-world")).toThrow(
      'Page "hello-world" does not have tag "page"',
    );
  });

  test("Handles items without tags", () => {
    expectFindsTarget([{ data: {}, fileSlug: "no-tags", url: "/no-tags/" }]);
  });

  test("Handles items with null tags", () => {
    expectFindsTarget([pageItem("null-tags", "/null-tags/", null)]);
  });

  test("Throws for empty collection", () => {
    expect(() => findPageUrl([], "post", "test")).toThrow(
      'Slug "test" not found',
    );
  });

  test("Matches on exact slug even if there are similar items", () => {
    expectFindsTarget([
      pageItem("hello", "/posts/hello/", ["post"]),
      pageItem("hello-world-2", "/posts/hello-world-2/", ["post"]),
    ]);
  });

  test("Configures navigation filters in Eleventy", async () => {
    const mockConfig = await withNavigation();

    expect(typeof mockConfig.asyncFilters.toNavigation).toBe("function");
    expect(typeof mockConfig.filters.pageUrl).toBe("function");
    expect(mockConfig.filters.pageUrl).toBe(findPageUrl);
  });

  test("Creates navigationLinks collection that filters items", async () => {
    const mockConfig = await withNavigation();
    expect(typeof mockConfig.collections.navigationLinks).toBe("function");

    const items = mockConfig.collections.navigationLinks(
      navCollectionApi([
        ["About", { key: "About", order: 2 }],
        ["Home", { key: "Home", order: 1 }],
      ]),
    );

    expectResultTitles(items, ["Home", "About"]);
  });

  test("navigationLinks collection excludes items without eleventyNavigation", async () => {
    const mockConfig = await withNavigation();

    const result = mockConfig.collections.navigationLinks({
      getAll: () => [
        item("Page 1", { eleventyNavigation: { key: "page-1" } }),
        item("Page 2", {}),
      ],
    });

    expect(result.length).toBe(1);
    expectResultTitles(result, ["Page 1"]);
  });

  test("navigationLinks collection sorts by order, then by key", async () => {
    const mockConfig = await withNavigation();

    const items = mockConfig.collections.navigationLinks(
      navCollectionApi([
        ["Zebra", { key: "zebra", order: 2 }],
        ["Apple", { key: "apple", order: 1 }],
        ["Banana", { key: "banana", order: 1 }],
      ]),
    );

    expectResultTitles(items, ["Apple", "Banana", "Zebra"]);
  });

  test("navigationLinks collection handles missing order", async () => {
    const mockConfig = await withNavigation();

    const items = mockConfig.collections.navigationLinks(
      navCollectionApi([
        ["Zebra", { key: "zebra" }],
        ["Apple", { key: "apple" }],
      ]),
    );

    expect(items.length).toBe(2);
  });

  test("Throws for empty collection with pageUrl", () => {
    expect(() => findPageUrl([], "post", "test")).toThrow(
      'Slug "test" not found',
    );
  });
});

describe("toNavigation", () => {
  test("Returns empty string for empty pages", async () => {
    const result = await toNavigation([]);
    expect(result).toBe("");
  });

  test("Throws error for invalid input without pluginType", async () => {
    const invalidPages = [{ key: "Home", title: "Home" }];
    await expect(toNavigation(invalidPages)).rejects.toThrow(
      "toNavigation requires eleventyNavigation filter first",
    );
  });

  test("Renders navigation with active class", async () => {
    const pages = [navEntry("Home", { url: "/" })];
    const result = await toNavigation(pages, "Home");
    expect(result).toContain('class="active"');
  });

  test("Renders multiple nav items with hrefs", async () => {
    const pages = [navEntry("Home", { url: "/" }), navEntry("About")];
    const result = await toNavigation(pages, "");
    expect(result).toContain("Home");
    expect(result).toContain("About");
    expect(result).toContain('href="/"');
    expect(result).toContain('href="/about/"');
  });

  test("Renders nested children", async () => {
    const pages = [
      navEntry("Products", {
        children: [navEntry("Category A"), navEntry("Category B")],
      }),
    ];
    const result = await toNavigation(pages, "");
    expect(result).toContain("Products");
    expect(result).toContain("Category A");
    expect(result.match(/<ul/g).length).toBeGreaterThan(1);
  });

  test("Renders caret button for root-level parent items with children", async () => {
    const pages = [
      navEntry("Products", {
        children: [navEntry("Category A")],
      }),
    ];
    const result = await toNavigation(pages, "");
    expect(result).toContain('class="nav-caret"');
    expect(result).toContain('aria-label="Toggle Products submenu"');
  });

  test("Does not render caret button for items without children", async () => {
    const pages = [navEntry("About")];
    const result = await toNavigation(pages, "");
    expect(result).not.toContain("nav-caret");
  });

  test("Renders entry without href when url is missing", async () => {
    const pages = [
      {
        key: "No Link",
        title: "No Link",
        pluginType: "eleventy-navigation",
        data: {},
        children: [],
      },
    ];
    const result = await toNavigation(pages, "");
    expect(result).toContain("No Link");
    expect(result).not.toContain("href=");
  });

  test("Skips thumbnails for root-level navigation items", async () => {
    const pages = [
      navEntry("Products", {
        data: { thumbnail: "images/placeholders/blue.svg" },
      }),
    ];
    const result = await toNavigation(pages, "");
    expect(result).not.toContain("<picture");
    expect(result).not.toContain("<img");
  });

  test("Renders thumbnail for child navigation items", async () => {
    const pages = [
      navEntry("Products", {
        children: [
          navEntry("Category A", {
            data: { thumbnail: "images/placeholders/blue.svg" },
          }),
        ],
      }),
    ];
    const result = await toNavigation(pages, "");
    expect(result).toContain("<picture");
    expect(result).toContain("<img");
  });
});
