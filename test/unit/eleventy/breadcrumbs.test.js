import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import { configureBreadcrumbs } from "#eleventy/breadcrumbs.js";
import { DE, EN } from "#test/fixtures/languages.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("configureBreadcrumbs", () => {
  test("registers breadcrumb filters", () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);

    expect(typeof mockConfig.filters.breadcrumbsFilter).toBe("function");
    expect(typeof mockConfig.filters.withSchemaBreadcrumbs).toBe("function");
    expect(typeof mockConfig.filters.withSchemaLanguage).toBe("function");
  });
});

describe("withSchemaBreadcrumbs", () => {
  const SITE_URL = siteData.url;
  const setupFilter = () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    return mockConfig.filters.withSchemaBreadcrumbs;
  };

  test("returns metadata unchanged when breadcrumbs are hidden or empty", () => {
    const filter = setupFilter();
    const meta = { title: "Home" };
    expect(filter(meta, false, { url: "/page/" })).toBe(meta);
    expect(filter(meta, true, { url: "/" }, "Home", "Home", EN, [])).toBe(meta);
  });

  test("maps rendered crumbs to absolute schema URLs", () => {
    const filter = setupFilter();
    expect(
      filter(
        { title: "A Post" },
        true,
        { url: "/news/a-post/" },
        "A Post",
        "News",
        EN,
        [],
      ).breadcrumbs,
    ).toEqual([
      { name: "Home", url: SITE_URL, position: 1 },
      {
        name: "News",
        url: `${SITE_URL}/news/`,
        position: 2,
      },
      {
        name: "A Post",
        url: `${SITE_URL}/news/a-post/`,
        position: 3,
      },
    ]);
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
    pageLanguage = EN,
    translations = [],
  ) =>
    mockConfig.filters.breadcrumbsFilter(
      page,
      title,
      navigationParent,
      pageLanguage,
      translations,
    );

  test("returns empty array for home page", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(mockConfig, { url: "/" }, "Home", "Home");
    expect(crumbs).toEqual([]);
  });

  test("starts a trail at the page's own language home page", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(
      mockConfig,
      { url: "/de/ueber-uns/" },
      "Über uns",
      null,
      DE,
    );
    expect(crumbs).toEqual([
      { label: "Startseite", url: "/de/" },
      { label: "Über uns", url: null },
    ]);
  });

  test("returns empty array for a language's own home page", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(
      mockConfig,
      { url: "/de/" },
      "Startseite",
      null,
      DE,
    );
    expect(crumbs).toEqual([]);
  });

  test("returns Home and collection for index page", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(mockConfig, { url: "/news/" }, "News", "News");

    expect(crumbs).toHaveLength(2);
    expect(crumbs[0]).toEqual({ label: "Home", url: "/" });
    expect(crumbs[1]).toEqual({ label: "News", url: null });
  });

  describe("index pages without navigationParent", () => {
    const testCases = [
      { url: "/news/", title: "News", navParent: undefined },
      { url: "/guide/", title: "Guides", navParent: undefined },
      { url: "/news/", title: "Our News", navParent: null },
      { url: "/guide/", title: "All Guides", navParent: "" },
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
        const crumbs = callFilter(mockConfig, { url }, title, navParent);

        expect(crumbs).toEqual([
          { label: "Home", url: "/" },
          { label: title, url: null },
        ]);
      });
    }
  });

  test("returns Home, collection link, and item for a news post", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(
      mockConfig,
      { url: "/news/test-post/" },
      "Test Post",
      "News",
    );

    expect(crumbs).toEqual([
      { label: "Home", url: "/" },
      { label: "News", url: "/news/" },
      { label: "Test Post", url: null },
    ]);
  });

  test("does not duplicate title when navigationParent is missing on child page", () => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(
      mockConfig,
      { url: "/perfect-for/political-organising/" },
      "Political Organising",
      undefined,
    );

    expect(crumbs).toEqual([
      { label: "Home", url: "/" },
      { label: "Political Organising", url: null },
    ]);
  });

  test.each([
    "Item",
    "",
  ])("derives the parent URL and retains the non-linked title %j", (title) => {
    const mockConfig = setupFilter();
    const crumbs = callFilter(
      mockConfig,
      { url: "/custom/item/" },
      title,
      "Custom Section",
    );

    expect(crumbs).toEqual([
      { label: "Home", url: "/" },
      { label: "Custom Section", url: "/custom/" },
      { label: title, url: null },
    ]);
  });
});

describe("withSchemaLanguage", () => {
  const setupFilter = () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    return mockConfig.filters.withSchemaLanguage;
  };

  test("replaces the site-wide language with the page's own", () => {
    const filter = setupFilter();
    expect(filter({ language: "en-GB", title: "Über uns" }, DE)).toEqual({
      language: "de",
      title: "Über uns",
    });
  });
});

describe("the collection index crumb of a translated page", () => {
  const setupFilter = () => {
    const mockConfig = createMockEleventyConfig();
    configureBreadcrumbs(mockConfig);
    return mockConfig.filters.breadcrumbsFilter;
  };

  const indexCrumb = (filter, page, navigationParent, language, translations) =>
    filter(page, "A Thing", navigationParent, language, translations)[1];

  test("points at the index in the page's own language where one is paired", () => {
    const crumb = indexCrumb(
      setupFilter(),
      { url: "/de/nachrichten/thing/" },
      "News",
      DE,
      [{ en: "/news/", de: "/de/nachrichten/" }],
    );
    expect(crumb).toEqual({ label: "News", url: "/de/nachrichten/" });
  });

  test("keeps the base-language index when the site pairs none", () => {
    // Better a crumb that exists in another language than one that 404s.
    const crumb = indexCrumb(
      setupFilter(),
      { url: "/de/nachrichten/thing/" },
      "News",
      DE,
      [],
    );
    expect(crumb.url).toBe("/news/");
  });

  test("derives an unnamed parent's index under the language prefix", () => {
    const crumb = indexCrumb(
      setupFilter(),
      { url: "/de/leitfaden/thing/" },
      undefined,
      DE,
      [],
    );
    expect(crumb).toEqual({ label: "A Thing", url: null });
  });

  test("leaves a base-language page's index exactly as it was", () => {
    const filter = setupFilter();
    expect(
      indexCrumb(filter, { url: "/news/thing/" }, "News", EN, []).url,
    ).toBe("/news/");
  });
});
