import { describe, expect, test } from "vitest";
import { directoryData } from "#collections/directory-data.js";

const { eleventyComputed } = directoryData("guide-categories");

const categoryData = (overrides = {}) => ({
  name: "About the Accommodation",
  page: { fileSlug: "about-the-accommodation", url: "/guide/about/" },
  strings: { guide_name: "Guide" },
  ...overrides,
});

describe("guide categories property", () => {
  test("Normalises a CMS property reference to a slug", () => {
    const data = categoryData({ property: "properties/roger-pot.md" });

    expect(eleventyComputed.property(data)).toBe("roger-pot");
  });

  test("Leaves the property unset when the category has none", () => {
    expect(eleventyComputed.property(categoryData())).toBeUndefined();
  });
});

describe("guide categories eleventyNavigation", () => {
  test("Builds a Guide navigation entry for a general category", () => {
    expect(eleventyComputed.eleventyNavigation(categoryData())).toEqual({
      key: "About the Accommodation",
      parent: "Guide",
      order: 0,
    });
  });

  test("Suppresses navigation for a category tied to a property", () => {
    const data = categoryData({ property: "roger-pot" });

    expect(eleventyComputed.eleventyNavigation(data)).toBe(false);
  });

  test("Uses an explicit eleventyNavigation even with a property set", () => {
    const eleventyNavigation = { key: "Guest Guide", parent: "Guide" };
    const data = categoryData({ property: "roger-pot", eleventyNavigation });

    expect(eleventyComputed.eleventyNavigation(data)).toEqual(
      eleventyNavigation,
    );
  });
});

describe("pages directory data", () => {
  const { tags, eleventyComputed: computed } = directoryData("pages");

  test("Tags every page into the pages collection", () => {
    expect(tags).toEqual(["pages"]);
  });

  test("Names a page from its meta title when it has no name", () => {
    expect(computed.name({ meta_title: "About us" })).toBe("About us");
    expect(computed.name({ name: "About", meta_title: "About us" })).toBe(
      "About",
    );
  });

  test("Takes the navigation parent from eleventyNavigation, else none", () => {
    expect(
      computed.navigationParent({ eleventyNavigation: { parent: "Help" } }),
    ).toBe("Help");
    expect(computed.navigationParent({})).toBeNull();
  });

  test("Normalises an authored permalink, and keeps permalink: false", () => {
    const page = { filePathStem: "/pages/about" };
    expect(computed.permalink({ permalink: "about", page })).toBe("/about/");
    expect(computed.permalink({ permalink: false, page })).toBe(false);
  });

  test("Publishes a page without a permalink where its file sits", () => {
    const at = (filePathStem) => computed.permalink({ page: { filePathStem } });
    expect(at("/pages/about")).toBe("/about/");
    expect(at("/pages/index")).toBe("/");
    expect(at("/pages/es/acerca")).toBe("/es/acerca/");
    expect(at("/pages/es/index")).toBe("/es/");
  });
});

describe("news directory data", () => {
  const { tags, eleventyComputed: computed } = directoryData("news");

  test("Dates a post from its file and tags it as news", () => {
    const date = new Date("2026-01-02");
    expect(tags).toEqual(["news"]);
    expect(computed.date({ page: { date } })).toBe(date);
  });
});

describe("guide pages directory data", () => {
  const { eleventyComputed: computed } = directoryData("guide-pages");
  const guidePage = (overrides = {}) => ({
    page: { fileSlug: "check-in" },
    ...overrides,
  });

  test("Files a guide page under its category's slug", () => {
    const data = guidePage({ "guide-category": "guide-categories/arrival.md" });

    expect(computed["guide-category"](data)).toBe("arrival");
    expect(computed.parentGuideCategory(data)).toBe("arrival");
    expect(computed.permalink(data)).toBe("/guide/arrival/check-in/");
  });

  test("Files an uncategorised guide page under uncategorized", () => {
    expect(computed["guide-category"](guidePage())).toBeUndefined();
    expect(computed.permalink(guidePage())).toBe(
      "/guide/uncategorized/check-in/",
    );
  });

  test("Normalises a property reference and keeps an authored permalink", () => {
    const data = guidePage({
      property: "properties/roger-pot.md",
      permalink: "custom",
    });

    expect(computed.property(data)).toBe("roger-pot");
    expect(computed.permalink(data)).toBe("/custom/");
  });

  test("Takes name and subtitle from a pagination chunk's document", () => {
    const chunk = guidePage({
      doc: { name: "Languages", subtitle: "Publishing in two languages" },
    });

    expect(computed.name(chunk)).toBe("Languages");
    expect(computed.subtitle(chunk)).toBe("Publishing in two languages");
  });

  test("Keeps an ordinary guide page's name and subtitle", () => {
    const page = guidePage({ name: "Installation", subtitle: "Setup" });

    expect(computed.name(page)).toBe("Installation");
    expect(computed.subtitle(page)).toBe("Setup");
  });
});

test("Directories that are not template collections have no directory data", () => {
  expect(directoryData("events")).toBeUndefined();
});
