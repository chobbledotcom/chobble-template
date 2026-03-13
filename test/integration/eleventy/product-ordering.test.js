import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

// ============================================
// Category product ordering
// ============================================

/** Product that reverse-references the "widgets" category. */
const categoryReverseProduct = (slug, title, order) => ({
  path: `products/${slug}.md`,
  frontmatter: { title, order, categories: ["widgets"] },
  content: "",
});

/** Product that does NOT reference any category in its own frontmatter. */
const standaloneProduct = (slug, title, order = 0) => ({
  path: `products/${slug}.md`,
  frontmatter: { title, order, categories: [] },
  content: "",
});

/** Extract ordered product titles from a rendered category page. */
const getCategoryProductTitles = async (site, categorySlug) => {
  const doc = await site.getDoc(`/categories/${categorySlug}/index.html`);
  const headings = [...doc.querySelectorAll(".items h3")];
  return headings.map((h) => h.textContent.trim());
};

describe("category product ordering", () => {
  test("explicit products array determines display order", async () => {
    // Category lists products in a specific order (gamma, alpha, beta)
    // which differs from both alphabetical and numeric `order` sorting.
    const category = {
      path: "categories/widgets.md",
      frontmatter: {
        title: "Widgets",
        products: [
          { product: "gamma" },
          { product: "alpha" },
          { product: "beta" },
        ],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          category,
          standaloneProduct("alpha", "Alpha", 1),
          standaloneProduct("beta", "Beta", 2),
          standaloneProduct("gamma", "Gamma", 3),
        ],
      },
      async (site) => {
        const titles = await getCategoryProductTitles(site, "widgets");
        expect(titles).toEqual(["Gamma", "Alpha", "Beta"]);
      },
    );
  });

  test("reverse-lookup products appear after explicit ones in default order", async () => {
    const category = {
      path: "categories/widgets.md",
      frontmatter: {
        title: "Widgets",
        products: [{ product: "explicit-one" }],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          category,
          standaloneProduct("explicit-one", "Explicit One", 0),
          categoryReverseProduct("reverse-a", "Reverse A", 1),
          categoryReverseProduct("reverse-b", "Reverse B", 2),
        ],
      },
      async (site) => {
        const titles = await getCategoryProductTitles(site, "widgets");
        expect(titles).toEqual(["Explicit One", "Reverse A", "Reverse B"]);
      },
    );
  });

  test("duplicates are removed when product is both explicit and reverse-lookup", async () => {
    const category = {
      path: "categories/widgets.md",
      frontmatter: {
        title: "Widgets",
        products: [{ product: "widget-b" }, { product: "widget-a" }],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          category,
          categoryReverseProduct("widget-a", "Widget A", 1),
          categoryReverseProduct("widget-b", "Widget B", 2),
        ],
      },
      async (site) => {
        const titles = await getCategoryProductTitles(site, "widgets");
        expect(titles).toEqual(["Widget B", "Widget A"]);
      },
    );
  });

  test("without explicit products array, reverse-lookup products use default order", async () => {
    const category = {
      path: "categories/widgets.md",
      frontmatter: { title: "Widgets" },
      content: "",
    };

    await withTestSite(
      {
        files: [
          category,
          categoryReverseProduct("zulu", "Zulu", 1),
          categoryReverseProduct("alpha", "Alpha", 2),
        ],
      },
      async (site) => {
        const titles = await getCategoryProductTitles(site, "widgets");
        expect(titles).toEqual(["Zulu", "Alpha"]);
      },
    );
  });

  test("duplicate explicit product refs only appear once", async () => {
    const category = {
      path: "categories/widgets.md",
      frontmatter: {
        title: "Widgets",
        products: [
          { product: "alpha" },
          { product: "beta" },
          { product: "alpha" },
        ],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          category,
          standaloneProduct("alpha", "Alpha", 1),
          standaloneProduct("beta", "Beta", 2),
        ],
      },
      async (site) => {
        const titles = await getCategoryProductTitles(site, "widgets");
        expect(titles).toEqual(["Alpha", "Beta"]);
      },
    );
  });
});

// ============================================
// Event product ordering
// ============================================

/** Product that reverse-references the "summer-expo" event. */
const eventReverseProduct = (slug, title, order) => ({
  path: `products/${slug}.md`,
  frontmatter: { title, order, categories: [], events: ["summer-expo"] },
  content: "",
});

/** Product with no event references. */
const eventStandaloneProduct = (slug, title, order = 0) => ({
  path: `products/${slug}.md`,
  frontmatter: { title, order, categories: [] },
  content: "",
});

/** Extract ordered product titles from a rendered event page. */
const getEventProductTitles = async (site, eventSlug) => {
  const doc = await site.getDoc(`/events/${eventSlug}/index.html`);
  const headings = [...doc.querySelectorAll(".items h3")];
  return headings.map((h) => h.textContent.trim());
};

describe("event product ordering", () => {
  test("explicit products array determines display order on event page", async () => {
    const event = {
      path: "events/summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
        products: [
          { product: "gamma" },
          { product: "alpha" },
          { product: "beta" },
        ],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventStandaloneProduct("alpha", "Alpha", 1),
          eventStandaloneProduct("beta", "Beta", 2),
          eventStandaloneProduct("gamma", "Gamma", 3),
        ],
      },
      async (site) => {
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Gamma", "Alpha", "Beta"]);
      },
    );
  });

  test("reverse-lookup products appear after explicit ones on event page", async () => {
    const event = {
      path: "events/summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
        products: [{ product: "explicit-one" }],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventStandaloneProduct("explicit-one", "Explicit One", 0),
          eventReverseProduct("reverse-a", "Reverse A", 1),
          eventReverseProduct("reverse-b", "Reverse B", 2),
        ],
      },
      async (site) => {
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Explicit One", "Reverse A", "Reverse B"]);
      },
    );
  });

  test("without explicit products, event uses default order", async () => {
    const event = {
      path: "events/summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventReverseProduct("zulu", "Zulu", 1),
          eventReverseProduct("alpha", "Alpha", 2),
        ],
      },
      async (site) => {
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Zulu", "Alpha"]);
      },
    );
  });

  test("date-prefixed event file preserves explicit product order", async () => {
    // Event files often have date prefixes (e.g. 2026-06-19-summer-expo.md).
    // Eleventy strips the date prefix from page.fileSlug → "summer-expo".
    // The explicit products array should still determine display order.
    const event = {
      path: "events/2026-06-19-summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
        products: [
          { product: "gamma" },
          { product: "alpha" },
          { product: "beta" },
        ],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventStandaloneProduct("alpha", "Alpha", 1),
          eventStandaloneProduct("beta", "Beta", 2),
          eventStandaloneProduct("gamma", "Gamma", 3),
        ],
      },
      async (site) => {
        // Eleventy strips date prefix: permalink is /events/summer-expo/
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Gamma", "Alpha", "Beta"]);
      },
    );
  });

  test("date-prefixed event file finds reverse-lookup products", async () => {
    // Event file: 2026-06-19-summer-expo.md (fileSlug → "summer-expo")
    // Products reference "summer-expo" in their events field.
    const event = {
      path: "events/2026-06-19-summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
        products: [{ product: "explicit-one" }],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventStandaloneProduct("explicit-one", "Explicit One", 0),
          eventReverseProduct("reverse-a", "Reverse A", 1),
          eventReverseProduct("reverse-b", "Reverse B", 2),
        ],
      },
      async (site) => {
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Explicit One", "Reverse A", "Reverse B"]);
      },
    );
  });

  test("duplicate explicit product refs only appear once", async () => {
    // Same product listed twice in the explicit array — should appear only once.
    const event = {
      path: "events/summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
        products: [
          { product: "alpha" },
          { product: "beta" },
          { product: "alpha" },
        ],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventStandaloneProduct("alpha", "Alpha", 1),
          eventStandaloneProduct("beta", "Beta", 2),
        ],
      },
      async (site) => {
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Alpha", "Beta"]);
      },
    );
  });

  test("product in both explicit list and reverse-lookup appears only in explicit position", async () => {
    // "widget-a" is both explicitly listed AND reverse-references the event.
    // It should appear once, in its explicit position (second), not duplicated.
    const event = {
      path: "events/summer-expo.md",
      frontmatter: {
        title: "Summer Expo",
        event_date: "2026-06-19",
        products: [{ product: "widget-b" }, { product: "widget-a" }],
      },
      content: "",
    };

    await withTestSite(
      {
        files: [
          event,
          eventReverseProduct("widget-a", "Widget A", 1),
          eventReverseProduct("widget-b", "Widget B", 2),
        ],
      },
      async (site) => {
        const titles = await getEventProductTitles(site, "summer-expo");
        expect(titles).toEqual(["Widget B", "Widget A"]);
      },
    );
  });
});
