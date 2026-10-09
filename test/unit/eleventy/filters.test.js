import { describe, expect, test } from "vitest";
import { configureFilters } from "#eleventy/filters.js";
import { createMockEleventyConfig, expectProp } from "#test/test-utils.js";

const registeredFilters = () => {
  const mockConfig = createMockEleventyConfig();
  configureFilters(mockConfig);
  return mockConfig.filters;
};

const FILTER_NAMES = [
  "cacheBust",
  "canonicalUrl",
  "dateToRfc3339",
  "fileInfo",
  "filterItems",
  "getNewestCollectionItemDate",
  "gitDates",
  "isoDate",
  "prepareItemsTextList",
  "removePattern",
  "sortItems",
  "splitHashtags",
];

describe("configureFilters", () => {
  test("registers exactly the expected filter set", () => {
    const filters = registeredFilters();
    expect(Object.keys(filters).sort()).toEqual(FILTER_NAMES);
    for (const name of FILTER_NAMES) {
      expect(typeof filters[name]).toBe("function");
    }
  });
});

describe("splitHashtags", () => {
  const { splitHashtags } = registeredFilters();

  test("returns a single non-tag segment when there are no hashtags", () => {
    expect(splitHashtags("Just some prose, nothing tagged.")).toEqual([
      { text: "Just some prose, nothing tagged.", isTag: false },
    ]);
  });

  test("splits a caption with a trailing hashtag", () => {
    expect(splitHashtags("nice #gig")).toEqual([
      { text: "nice ", isTag: false },
      { text: "#gig", isTag: true },
    ]);
  });

  test("splits a caption with a leading hashtag", () => {
    expect(splitHashtags("#gig was nice")).toEqual([
      { text: "#gig", isTag: true },
      { text: " was nice", isTag: false },
    ]);
  });

  test("splits a caption with several hashtags in order", () => {
    expect(
      splitHashtags(
        "Here is a photo of a gig that relates to our services #gig #photo #here",
      ),
    ).toEqual([
      {
        text: "Here is a photo of a gig that relates to our services ",
        isTag: false,
      },
      { text: "#gig", isTag: true },
      { text: " ", isTag: false },
      { text: "#photo", isTag: true },
      { text: " ", isTag: false },
      { text: "#here", isTag: true },
    ]);
  });

  test("treats digits and underscores as part of a hashtag", () => {
    expect(splitHashtags("#mild_praise_2 rules")).toEqual([
      { text: "#mild_praise_2", isTag: true },
      { text: " rules", isTag: false },
    ]);
  });

  test("does not match a bare hash with no following word chars", () => {
    expect(splitHashtags("issue #123-followup and # alone")).toEqual([
      { text: "issue ", isTag: false },
      { text: "#123", isTag: true },
      { text: "-followup and # alone", isTag: false },
    ]);
  });

  test("returns an empty array for empty input", () => {
    expect(splitHashtags("")).toEqual([]);
  });

  test("returns an empty array for non-string input", () => {
    expect(splitHashtags(undefined)).toEqual([]);
    expect(splitHashtags(null)).toEqual([]);
  });
});

describe("removePattern", () => {
  const { removePattern } = registeredFilters();

  test("returns input unchanged when pattern is empty", () => {
    expect(removePattern("Service in Town A", "")).toBe("Service in Town A");
  });

  test("returns input unchanged when pattern is undefined", () => {
    expect(removePattern("hello", undefined)).toBe("hello");
  });

  test("strips a literal prefix from every match", () => {
    expect(removePattern("Service in Town A", "Service in ")).toBe("Town A");
  });

  test("removes every match (global)", () => {
    expect(removePattern("aa-bb-aa-cc-aa", "aa")).toBe("-bb--cc-");
  });

  test("supports regex metacharacters", () => {
    expect(removePattern("foo123bar456baz", "\\d+")).toBe("foobarbaz");
  });

  test("trims whitespace left over after removal", () => {
    expect(removePattern("  Service in Town A  ", "Service in ")).toBe(
      "Town A",
    );
  });

  test("throws on invalid regex so authors see the error immediately", () => {
    expect(() => removePattern("anything", "(")).toThrow();
  });
});

describe("prepareItemsTextList", () => {
  const { prepareItemsTextList } = registeredFilters();
  const expectNames = expectProp("name");
  const expectSeparators = expectProp("separator");

  const createItem = (name, url) => ({ url, data: { name } });

  const THREE_ITEMS = [
    createItem("Alpha", "/alpha/"),
    createItem("Beta", "/beta/"),
    createItem("Gamma", "/gamma/"),
  ];

  test("Returns empty array for null collection", () => {
    expect(prepareItemsTextList(null, "/page/")).toEqual([]);
  });

  test("Returns empty array for empty collection", () => {
    expect(prepareItemsTextList([], "/page/")).toEqual([]);
  });

  test("Returns empty array when only item is current page", () => {
    const items = [createItem("Alpha", "/alpha/")];
    expect(prepareItemsTextList(items, "/alpha/")).toEqual([]);
  });

  test("Excludes current page from results", () => {
    const result = prepareItemsTextList(THREE_ITEMS, "/alpha/");
    expect(result).toHaveLength(2);
    expect(result.some((i) => i.url === "/alpha/")).toBe(false);
  });

  test("Single result has empty separator", () => {
    const items = [
      createItem("Alpha", "/alpha/"),
      createItem("Beta", "/beta/"),
    ];
    const result = prepareItemsTextList(items, "/alpha/");
    expect(result).toHaveLength(1);
    expect(result[0].separator).toBe("");
  });

  test("Two results use 'and' separator before last", () => {
    const result = prepareItemsTextList(THREE_ITEMS, "/alpha/");
    expectSeparators(result, [" and ", ""]);
  });

  test("Three results use comma then 'and' separators", () => {
    const items = [...THREE_ITEMS, createItem("Delta", "/delta/")];
    const result = prepareItemsTextList(items, "/alpha/");
    expectSeparators(result, [", ", " and ", ""]);
  });

  test("Sorts results alphabetically by title", () => {
    const items = [
      createItem("Zebra", "/zebra/"),
      createItem("Alpha", "/alpha/"),
      createItem("Metro", "/metro/"),
    ];
    const result = prepareItemsTextList(items, "/other/");
    expectNames(result, ["Alpha", "Metro", "Zebra"]);
  });

  test("Does not mutate the input collection order", () => {
    const items = [
      createItem("Zebra", "/zebra/"),
      createItem("Alpha", "/alpha/"),
    ];
    prepareItemsTextList(items, "/other/");
    expect(items.map((item) => item.data.name)).toEqual(["Zebra", "Alpha"]);
  });

  test("Result items include url and name from title", () => {
    const items = [createItem("Alpha", "/alpha/")];
    const result = prepareItemsTextList(items, "/other/");
    expect(result[0].url).toBe("/alpha/");
    expect(result[0].name).toBe("Alpha");
  });
});

describe("cacheBust", () => {
  const { cacheBust } = registeredFilters();

  const withRunMode = (mode, fn) => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    if (mode === undefined) {
      delete process.env.ELEVENTY_RUN_MODE;
    } else {
      process.env.ELEVENTY_RUN_MODE = mode;
    }
    fn();
    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  };

  test("Returns URL unchanged in development mode", () => {
    withRunMode("serve", () => {
      expect(cacheBust("/styles.css")).toBe("/styles.css");
    });
  });

  test("Returns URL unchanged when ELEVENTY_RUN_MODE is undefined", () => {
    withRunMode(undefined, () => {
      expect(cacheBust("/script.js")).toBe("/script.js");
    });
  });

  test("Adds cache busting parameter in production mode", () => {
    withRunMode("build", () => {
      expect(cacheBust("/styles.css").startsWith("/styles.css?cached=")).toBe(
        true,
      );
    });
  });

  test("Cache buster uses a consistent numeric timestamp across calls", () => {
    withRunMode("build", () => {
      const timestamp1 = cacheBust("/styles.css").match(/\?cached=(\d+)$/)[1];
      const timestamp2 = cacheBust("/script.js").match(/\?cached=(\d+)$/)[1];
      expect(Number.parseInt(timestamp1, 10) > 0).toBe(true);
      expect(timestamp1).toBe(timestamp2);
    });
  });
});
