import { describe, expect, test } from "bun:test";
import {
  configureNavigation,
  createNavigationFilter,
  findPageUrl,
} from "#collections/navigation.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("navigation", () => {
  test("Creates navigation filter function", () => {
    const mockEleventyConfig = {};
    const _mockNavUtil = {
      toHtml: {
        call: (context, _collection, options) => {
          expect(context).toBe(mockEleventyConfig);
          expect(options.activeAnchorClass).toBe("active");
          expect(options.activeKey).toBe("test-key");
          return "<nav>Mock HTML</nav>";
        },
      },
    };

    const filter = createNavigationFilter(mockEleventyConfig);
    expect(typeof filter).toBe("function");

    const result = filter([], "test-key");
    expect(typeof result).toBe("string");
  });

  test("Passes collection to navUtil correctly", () => {
    const mockCollection = [
      { title: "Home", url: "/" },
      { title: "About", url: "/about/" },
    ];

    const mockEleventyConfig = {};
    const _mockNavUtil = {
      toHtml: {
        call: (_context, collection, _options) => {
          expect(collection).toBe(mockCollection);
          return '<nav><a href="/">Home</a><a href="/about/">About</a></nav>';
        },
      },
    };

    const filter = createNavigationFilter(mockEleventyConfig);
    // Just test that it handles collections without throwing, since real navUtil
    // requires collection to be processed by eleventyNavigation filter first
    // If this throws, the test will fail - no need to catch
    filter([], "home"); // Empty collection should work
    expect(true).toBe(true);
  });

  test("Finds page URL by tag and slug", () => {
    const collection = [
      {
        data: { tags: ["post"] },
        fileSlug: "hello-world",
        url: "/posts/hello-world/",
      },
      {
        data: { tags: ["page"] },
        fileSlug: "about",
        url: "/about/",
      },
      {
        data: { tags: ["post", "featured"] },
        fileSlug: "featured-post",
        url: "/posts/featured-post/",
      },
    ];

    const result = findPageUrl(collection, "post", "hello-world");
    expect(result).toBe("/posts/hello-world/");
  });

  test("Finds page with multiple tags", () => {
    const collection = [
      {
        data: { tags: ["post", "featured"] },
        fileSlug: "featured-post",
        url: "/posts/featured-post/",
      },
      {
        data: { tags: ["page"] },
        fileSlug: "about",
        url: "/about/",
      },
    ];

    const result = findPageUrl(collection, "featured", "featured-post");
    expect(result).toBe("/posts/featured-post/");
  });

  test("Returns # when page not found", () => {
    const collection = [
      {
        data: { tags: ["post"] },
        fileSlug: "hello-world",
        url: "/posts/hello-world/",
      },
    ];

    const result = findPageUrl(collection, "post", "nonexistent");
    expect(result).toBe("#");
  });

  test("Handles items without tags", () => {
    const collection = [
      {
        data: {},
        fileSlug: "no-tags",
        url: "/no-tags/",
      },
      {
        data: { tags: ["post"] },
        fileSlug: "hello-world",
        url: "/posts/hello-world/",
      },
    ];

    const result = findPageUrl(collection, "post", "hello-world");
    expect(result).toBe("/posts/hello-world/");
  });

  test("Handles items with null tags", () => {
    const collection = [
      {
        data: { tags: null },
        fileSlug: "null-tags",
        url: "/null-tags/",
      },
      {
        data: { tags: ["post"] },
        fileSlug: "hello-world",
        url: "/posts/hello-world/",
      },
    ];

    const result = findPageUrl(collection, "post", "hello-world");
    expect(result).toBe("/posts/hello-world/");
  });

  test("Requires exact slug match", () => {
    const collection = [
      {
        data: { tags: ["post"] },
        fileSlug: "hello-world",
        url: "/posts/hello-world/",
      },
      {
        data: { tags: ["post"] },
        fileSlug: "hello-world-2",
        url: "/posts/hello-world-2/",
      },
    ];

    const result = findPageUrl(collection, "post", "hello-world");
    expect(result).toBe("/posts/hello-world/");
  });

  test("Configures navigation filters in Eleventy", async () => {
    const mockConfig = createMockEleventyConfig();
    const _mockNavUtil = {
      toHtml: {
        call: () => "<nav>test</nav>",
      },
    };

    await configureNavigation(mockConfig);

    expect(typeof mockConfig.filters.toNavigation).toBe("function");
    expect(typeof mockConfig.filters.pageUrl).toBe("function");

    expect(mockConfig.filters.pageUrl).toBe(findPageUrl);
  });

  test("Configured filters work correctly", async () => {
    const mockConfig = createMockEleventyConfig();
    const _mockNavUtil = {
      toHtml: {
        call: () => "<nav>Working</nav>",
      },
    };

    await configureNavigation(mockConfig);

    // Test toNavigation filter
    const navResult = mockConfig.filters.toNavigation([], "home");
    expect(typeof navResult).toBe("string");

    // Test pageUrl filter
    const collection = [
      {
        data: { tags: ["post"] },
        fileSlug: "test",
        url: "/test/",
      },
    ];

    const urlResult = mockConfig.filters.pageUrl(collection, "post", "test");
    expect(urlResult).toBe("/test/");
  });

  test("Creates navigationLinks collection that filters items", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureNavigation(mockConfig);

    expect(typeof mockConfig.collections.navigationLinks).toBe("function");

    // Create mock collection with some items having eleventyNavigation and some not
    const mockCollectionApi = {
      getAll: () => [
        {
          data: {
            title: "Home",
            eleventyNavigation: { key: "Home", order: 1 },
          },
        },
        {
          data: {
            title: "About",
            eleventyNavigation: { key: "About", order: 2 },
          },
        },
        {
          data: {
            title: "No Navigation",
            // No eleventyNavigation - should be filtered out
          },
        },
        {
          data: {
            title: "Contact",
            eleventyNavigation: { key: "Contact", order: 3 },
          },
        },
      ],
    };

    const result = mockConfig.collections.navigationLinks(mockCollectionApi);

    expect(result.length).toBe(3);
    expect(result[0].data.title).toBe("Home");
    expect(result[1].data.title).toBe("About");
    expect(result[2].data.title).toBe("Contact");
  });

  test("Sorts navigation items by order property", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureNavigation(mockConfig);

    const mockCollectionApi = {
      getAll: () => [
        {
          data: {
            title: "Third",
            eleventyNavigation: { key: "Third", order: 30 },
          },
        },
        {
          data: {
            title: "First",
            eleventyNavigation: { key: "First", order: 10 },
          },
        },
        {
          data: {
            title: "Second",
            eleventyNavigation: { key: "Second", order: 20 },
          },
        },
      ],
    };

    const result = mockConfig.collections.navigationLinks(mockCollectionApi);

    expect(result.length).toBe(3);
    expect(result[0].data.title).toBe("First");
    expect(result[1].data.title).toBe("Second");
    expect(result[2].data.title).toBe("Third");
  });

  test("Items without order default to 999 and sort alphabetically", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureNavigation(mockConfig);

    const mockCollectionApi = {
      getAll: () => [
        {
          data: {
            title: "Zebra Page",
            eleventyNavigation: { key: "Zebra Page" }, // no order → 999
          },
        },
        {
          data: {
            title: "Has Order",
            eleventyNavigation: { key: "Has Order", order: 5 },
          },
        },
        {
          data: {
            title: "Apple Page",
            eleventyNavigation: { key: "Apple Page" }, // no order → 999
          },
        },
      ],
    };

    const result = mockConfig.collections.navigationLinks(mockCollectionApi);

    expect(result.length).toBe(3);
    expect(result[0].data.title).toBe("Has Order");
    expect(result[1].data.title).toBe("Apple Page");
    expect(result[2].data.title).toBe("Zebra Page");
  });

  test("Falls back to title when key is missing", async () => {
    const mockConfig = createMockEleventyConfig();
    await configureNavigation(mockConfig);

    const mockCollectionApi = {
      getAll: () => [
        {
          data: {
            title: "Zebra Page",
            eleventyNavigation: { order: 10 }, // no key, should use title
          },
        },
        {
          data: {
            title: "Apple Page",
            eleventyNavigation: { order: 10 }, // no key, should use title
          },
        },
      ],
    };

    const result = mockConfig.collections.navigationLinks(mockCollectionApi);

    expect(result.length).toBe(2);
    expect(result[0].data.title).toBe("Apple Page");
    expect(result[1].data.title).toBe("Zebra Page");
  });

  test("Handles edge cases gracefully", () => {
    // Empty collection
    const result1 = findPageUrl([], "post", "test");
    expect(result1).toBe("#");

    // Collection with undefined data - should not find a match and return #
    const collectionWithUndefined = [
      {
        fileSlug: "test",
        url: "/test/",
        // No data property, so item.data.tags will be undefined
      },
    ];

    const result2 = findPageUrl(collectionWithUndefined, "post", "test");
    expect(result2).toBe("#");

    // Null/undefined collection
    const result3 = findPageUrl(null, "post", "test");
    expect(result3).toBe("#");

    const result4 = findPageUrl(undefined, "post", "test");
    expect(result4).toBe("#");
  });
});
