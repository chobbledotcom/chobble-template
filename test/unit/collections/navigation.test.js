import fs from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PAGES_DIR } from "#lib/paths.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
  item,
  withMockFetch,
} from "#test/test-utils.js";
import { map } from "#utils/fp/array.js";

vi.mock("#data/config.js", async () => {
  const { mockTemplateConfig } = await import("#test/test-utils.js");
  return mockTemplateConfig({
    nav_thumbnails: true,
    internal_link_suffix: "",
  });
});

const { configureNavigation, toNavigation } = await import(
  "#collections/navigation.js"
);

const MOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>';

const withIconMock = (callback) => withMockFetch(MOCK_SVG, {}, callback);

// Whether the site publishes a search page is decided by src/pages/search.md,
// which a fork may delete; each search test states the answer it needs.
const SEARCH_PAGE_PATH = join(PAGES_DIR, "search.md");
const realExistsSync = fs.existsSync;
const setSearchPage = (present) =>
  vi
    .spyOn(fs, "existsSync")
    .mockImplementation((path) =>
      path === SEARCH_PAGE_PATH ? present : realExistsSync(path),
    );

const pageItem = (slug, url, tags = []) => ({
  data: { tags },
  fileSlug: slug,
  url,
});

const navItems = map(([title, navOptions]) =>
  item(title, { eleventyNavigation: navOptions }),
);

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

  test("breaks ties on order using the page name when keyless", async () => {
    const result = await getNavLinks([
      ["Zebra", { order: 1 }],
      ["Apple", { order: 1 }],
    ]);
    expectResultTitles(result, ["Apple", "Zebra"]);
  });
});

describe("configureNavigation wiring", () => {
  test("registers async toNavigation filter", async () => {
    const mockConfig = await configureWithMock();
    expect(await mockConfig.asyncFilters.toNavigation([])).toBe("");
  });

  test("registers the eleventy-navigation plugin", async () => {
    const mockConfig = await configureWithMock();
    expect(mockConfig.pluginCalls).toBeDefined();
    expect(mockConfig.pluginCalls.length).toBeGreaterThan(0);
  });
});

describe("toNavigation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Every site that publishes a search page has to name its search field, so
  // the tests that are about something else still supply a label.
  const renderNav = (pages, activeKey = "") =>
    toNavigation(pages, activeKey, "Search");

  test("returns empty string for empty pages", async () => {
    expect(await renderNav([])).toBe("");
  });

  test("renders the search form with a search input and submit button", () =>
    withIconMock(async () => {
      setSearchPage(true);
      // search.md exists, so toNavigation appends the search item. The form's
      // body is `searchInput + searchButton`; assert both ended up inside it.
      const html = await renderNav([navEntry("Home", { url: "/" })]);
      expect(html).toContain('class="search-box"');
      expect(html).toContain('type="search"');
      expect(html).toContain("<button");
    }));

  test("names the search field and its icon button after the language", () =>
    withIconMock(async () => {
      // Both are unlabelled otherwise: the button holds only an icon, and the
      // field only a placeholder.
      setSearchPage(true);
      const html = await toNavigation(
        [navEntry("Home", { url: "/" })],
        "",
        "Suchen",
      );
      expect(html).toContain('<button type="submit" aria-label="Suchen"');
      expect(html).toContain('aria-label="Suchen"');
      expect(html).toContain('placeholder="Suchen"');
    }));

  test("refuses to render a search field it cannot name", () =>
    withIconMock(async () => {
      setSearchPage(true);
      await expect(
        toNavigation([navEntry("Home", { url: "/" })], ""),
      ).rejects.toThrow(/search_label/);
    }));

  test("leaves the search field out when the site has no search page", () =>
    withIconMock(async () => {
      setSearchPage(false);
      // No search page means no field to name, so no label is required.
      const html = await toNavigation([navEntry("Home", { url: "/" })], "");
      expect(html).toBe(
        '<ul class="nav-thumbnails"><li><a href="/"><span>Home</span></a></li></ul>',
      );
    }));

  test("throws when input is missing the eleventyNavigation pluginType", async () => {
    const bare = [{ key: "Home", title: "Home" }];
    await expect(toNavigation(bare)).rejects.toThrow(
      "toNavigation requires eleventyNavigation filter first",
    );
  });

  test("marks the active entry with class='active'", () =>
    withIconMock(async () => {
      const html = await renderNav([navEntry("Home", { url: "/" })], "Home");
      expect(html).toContain('class="active"');
      expect(html).toContain('href="/"');
    }));

  test("only marks the matching entry as active, not its siblings", () =>
    withIconMock(async () => {
      const html = await renderNav(
        [navEntry("Home", { url: "/" }), navEntry("About")],
        "About",
      );
      const activeMatches = html.match(/class="active"/g);
      expect(activeMatches).toHaveLength(1);
      expect(html).toMatch(/class="active"[^>]*>.*About/);
    }));

  test("renders children inside a nested ul", () =>
    withIconMock(async () => {
      const html = await renderNav(
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
      const html = await renderNav(
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
      const html = await renderNav(
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
      const html = await renderNav(
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

describe("toNavigation current page", () => {
  const renderAt = (pages, activeKey, currentUrl) =>
    withIconMock(() => toNavigation(pages, activeKey, "Search", currentUrl));

  test("marks the page being rendered aria-current=page", async () => {
    const html = await renderAt(
      [navEntry("Home", { url: "/" }), navEntry("About")],
      "About",
      "/about/",
    );
    expect(html).toContain(
      '<a class="active" href="/about/" aria-current="page">',
    );
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });

  test("marks the section of a page outside the menu aria-current=true", async () => {
    // A news post is not in the menu; its navigationParent (News) is active
    const html = await renderAt(
      [navEntry("News"), navEntry("About")],
      "News",
      "/news/a-post/",
    );
    expect(html).toContain(
      '<a class="active" href="/news/" aria-current="true">',
    );
  });

  test("marks a child page itself and its parent's section", async () => {
    const html = await renderAt(
      [navEntry("Sign up", { children: [navEntry("Get started")] })],
      "Sign up",
      "/get started/",
    );
    expect(html).toContain('href="/sign up/" aria-current="true"');
    expect(html).toContain('href="/get started/" aria-current="page"');
  });
});

describe("inLanguage filter", () => {
  const inLanguageFilter = async () =>
    (await configureWithMock()).filters.inLanguage;
  const pageIn = (code) => ({ data: { pageLanguage: { code } }, code });

  test("keeps only the navigation pages written in the given language", async () => {
    const inLanguage = await inLanguageFilter();
    const pages = [pageIn("en"), pageIn("es"), pageIn("en")];

    expect(inLanguage(pages, { code: "es" })).toEqual([pages[1]]);
    expect(inLanguage(pages, { code: "en" })).toEqual([pages[0], pages[2]]);
  });
});
