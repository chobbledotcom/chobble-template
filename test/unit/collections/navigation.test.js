import { describe, expect, test } from "bun:test";
import { DEFAULT_PRODUCT_DATA, DEFAULTS } from "#config/helpers.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
  item,
  mockModule,
  withMockFetch,
} from "#test/test-utils.js";
import { map } from "#toolkit/fp/array.js";

await mockModule("#data/config.js", () => ({
  default: () => ({
    ...DEFAULTS,
    products: DEFAULT_PRODUCT_DATA,
    nav_thumbnails: true,
    internal_link_suffix: "",
    form_target: null,
  }),
}));

const { configureNavigation, findPageUrl, toNavigation } = await import(
  "#collections/navigation.js"
);

const MOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>';

const withIconMock = (callback) => withMockFetch(MOCK_SVG, {}, callback);

const pageItem = (slug, url, tags = []) => ({
  data: { tags },
  fileSlug: slug,
  url,
});

const navItem = ([title, navOptions]) =>
  item(title, { eleventyNavigation: navOptions });

const navItems = map(navItem);

const configureWithMock = async () => {
  const mockConfig = createMockEleventyConfig();
  await configureNavigation(mockConfig);
  return mockConfig;
};

const getNavLinks = async (entries) => {
  const mockConfig = await configureWithMock();
  return mockConfig.collections.navigationLinks({
    getAll: () => navItems(entries),
  });
};

const navEntry = (key, options = {}) => ({
  key,
  title: options.title ?? key,
  url: options.url ?? `/${key.toLowerCase()}/`,
  pluginType: "eleventy-navigation",
  data: options.data ?? {},
  children: options.children ?? [],
});

describe("findPageUrl", () => {
  const HELLO_WORLD = pageItem("hello-world", "/posts/hello-world/", ["post"]);
  const ABOUT = pageItem("about", "/about/", ["page"]);
  const FEATURED_POST = pageItem("featured-post", "/posts/featured-post/", [
    "post",
    "featured",
  ]);

  test("returns the URL of the matching tag + slug", () => {
    const collection = [HELLO_WORLD, ABOUT, FEATURED_POST];
    expect(findPageUrl(collection, "post", "hello-world")).toBe(
      "/posts/hello-world/",
    );
  });

  test("matches on any of the page's tags", () => {
    expect(findPageUrl([FEATURED_POST], "featured", "featured-post")).toBe(
      "/posts/featured-post/",
    );
  });

  test("matches exact slug even when similar slugs exist", () => {
    const target = pageItem("hello-world", "/posts/hello-world/", ["post"]);
    const collection = [
      pageItem("hello", "/posts/hello/", ["post"]),
      pageItem("hello-world-2", "/posts/hello-world-2/", ["post"]),
      target,
    ];
    expect(findPageUrl(collection, "post", "hello-world")).toBe(target.url);
  });

  test("ignores items whose tags are missing or null", () => {
    const target = pageItem("real", "/real/", ["post"]);
    const noisy = [
      { data: {}, fileSlug: "no-tags", url: "/no-tags/" },
      pageItem("null-tags", "/null-tags/", null),
    ];
    expect(findPageUrl([...noisy, target], "post", "real")).toBe("/real/");
  });

  test("throws when the slug is not present", () => {
    expect(() => findPageUrl([HELLO_WORLD], "post", "nonexistent")).toThrow(
      'Slug "nonexistent" not found',
    );
  });

  test("throws when the slug exists but the tag does not match", () => {
    expect(() => findPageUrl([HELLO_WORLD], "page", "hello-world")).toThrow(
      'Page "hello-world" does not have tag "page"',
    );
  });

  test("throws for an empty collection", () => {
    expect(() => findPageUrl([], "post", "test")).toThrow(
      'Slug "test" not found',
    );
  });
});

describe("navigationLinks collection", () => {
  test("excludes items without eleventyNavigation data", async () => {
    const mockConfig = await configureWithMock();
    const result = mockConfig.collections.navigationLinks({
      getAll: () => [
        item("Included", { eleventyNavigation: { key: "included" } }),
        item("Excluded", {}),
      ],
    });
    expectResultTitles(result, ["Included"]);
  });

  test("sorts by eleventyNavigation.order", async () => {
    const result = await getNavLinks([
      ["Second", { key: "second", order: 2 }],
      ["First", { key: "first", order: 1 }],
    ]);
    expectResultTitles(result, ["First", "Second"]);
  });

  test("breaks ties on order using key alphabetically", async () => {
    const result = await getNavLinks([
      ["Zebra", { key: "zebra", order: 1 }],
      ["Apple", { key: "apple", order: 1 }],
      ["Banana", { key: "banana", order: 1 }],
    ]);
    expectResultTitles(result, ["Apple", "Banana", "Zebra"]);
  });

  test("sorts items without an order alphabetically at the end", async () => {
    const result = await getNavLinks([
      ["No Order Z", { key: "z" }],
      ["First", { key: "a", order: 1 }],
      ["No Order A", { key: "a-no" }],
    ]);
    expectResultTitles(result, ["First", "No Order A", "No Order Z"]);
  });
});

describe("configureNavigation wiring", () => {
  test("registers pageUrl filter that finds URLs", async () => {
    const mockConfig = await configureWithMock();
    const collection = [pageItem("widget", "/products/widget/", ["product"])];
    expect(mockConfig.filters.pageUrl(collection, "product", "widget")).toBe(
      "/products/widget/",
    );
  });

  test("registers async toNavigation filter", async () => {
    const mockConfig = await configureWithMock();
    expect(await mockConfig.asyncFilters.toNavigation([])).toBe("");
  });
});

describe("toNavigation", () => {
  test("returns empty string for empty pages", async () => {
    expect(await toNavigation([])).toBe("");
  });

  test("throws when input is missing the eleventyNavigation pluginType", async () => {
    const bare = [{ key: "Home", title: "Home" }];
    await expect(toNavigation(bare)).rejects.toThrow(
      "toNavigation requires eleventyNavigation filter first",
    );
  });

  test("marks the active entry with class='active'", () =>
    withIconMock(async () => {
      const html = await toNavigation([navEntry("Home", { url: "/" })], "Home");
      expect(html).toContain('class="active"');
      expect(html).toContain('href="/"');
    }));

  test("only marks the matching entry as active, not its siblings", () =>
    withIconMock(async () => {
      const html = await toNavigation(
        [navEntry("Home", { url: "/" }), navEntry("About")],
        "About",
      );
      const activeMatches = html.match(/class="active"/g);
      expect(activeMatches).toHaveLength(1);
      expect(html).toMatch(/class="active"[^>]*>.*About/);
    }));

  test("renders children inside a nested ul", () =>
    withIconMock(async () => {
      const html = await toNavigation(
        [
          navEntry("Products", {
            children: [navEntry("Category A"), navEntry("Category B")],
          }),
        ],
        "",
      );
      expect(html).toContain("Category A");
      expect(html).toContain("Category B");
      expect(html.match(/<ul/g)).toHaveLength(2);
    }));

  test("renders entries without a href when url is missing", () =>
    withIconMock(async () => {
      const html = await toNavigation(
        [
          {
            key: "No Link",
            title: "No Link",
            pluginType: "eleventy-navigation",
            data: {},
            children: [],
          },
        ],
        "",
      );
      expect(html).toContain("No Link");
      expect(html).not.toContain("href=");
    }));

  test("does not render a thumbnail for root-level entries", () =>
    withIconMock(async () => {
      const html = await toNavigation(
        [
          navEntry("Products", {
            data: { thumbnail: "images/placeholders/blue.svg" },
          }),
        ],
        "",
      );
      expect(html).not.toContain("<picture");
      expect(html).not.toContain("<img");
    }));

  test("renders a thumbnail for a child entry when nav_thumbnails is on", () =>
    withIconMock(async () => {
      const html = await toNavigation(
        [
          navEntry("Products", {
            children: [
              navEntry("Category A", {
                data: { thumbnail: "images/placeholders/blue.svg" },
              }),
            ],
          }),
        ],
        "",
      );
      expect(html).toContain("<picture");
      expect(html).toContain("<img");
    }));
});
