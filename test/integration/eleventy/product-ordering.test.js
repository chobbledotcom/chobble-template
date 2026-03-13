import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

// ============================================
// Shared helpers
// ============================================

/** Product with given categories (default: none). */
const product = (slug, title, order = 0, extras = {}) => ({
  path: `products/${slug}.md`,
  frontmatter: { title, order, categories: [], ...extras },
  content: "",
});

/** Build a products frontmatter array from slug strings. */
const productRefs = (slugs) => slugs.map((p) => ({ product: p }));

/** Build a test category file with optional explicit products. */
const category = (slug, title, products) => ({
  path: `categories/${slug}.md`,
  frontmatter: {
    title,
    ...(products ? { products: productRefs(products) } : {}),
  },
  content: "",
});

const EXPO_DATE = "2026-06-19";

/** Build a test event file with optional explicit products. */
const eventWithProducts = (slug, title, products) => ({
  path: `events/${slug}.md`,
  frontmatter: {
    title,
    event_date: EXPO_DATE,
    ...(products ? { products: productRefs(products) } : {}),
  },
  content: "",
});

/**
 * Assert that a page renders products in the expected order.
 * Builds a test site from files, navigates to pageUrl, and checks .items h3 text.
 */
const expectProductOrder = async (files, pageUrl, expectedTitles) => {
  await withTestSite({ files }, async (site) => {
    const doc = await site.getDoc(pageUrl);
    const headings = [...doc.querySelectorAll(".items h3")];
    const titles = headings.map((h) => h.textContent.trim());
    expect(titles).toEqual(expectedTitles);
  });
};

const CATEGORY_URL = "/categories/widgets/index.html";
const EVENT_URL = "/events/summer-expo/index.html";

// ============================================
// Category product ordering
// ============================================

describe("category product ordering", () => {
  test("explicit products array determines display order", async () => {
    await expectProductOrder(
      [
        category("widgets", "Widgets", ["gamma", "alpha", "beta"]),
        product("alpha", "Alpha", 1),
        product("beta", "Beta", 2),
        product("gamma", "Gamma", 3),
      ],
      CATEGORY_URL,
      ["Gamma", "Alpha", "Beta"],
    );
  });

  test("reverse-lookup products appear after explicit ones in default order", async () => {
    await expectProductOrder(
      [
        category("widgets", "Widgets", ["explicit-one"]),
        product("explicit-one", "Explicit One"),
        product("reverse-a", "Reverse A", 1, { categories: ["widgets"] }),
        product("reverse-b", "Reverse B", 2, { categories: ["widgets"] }),
      ],
      CATEGORY_URL,
      ["Explicit One", "Reverse A", "Reverse B"],
    );
  });

  test("duplicates are removed when product is both explicit and reverse-lookup", async () => {
    await expectProductOrder(
      [
        category("widgets", "Widgets", ["widget-b", "widget-a"]),
        product("widget-a", "Widget A", 1, { categories: ["widgets"] }),
        product("widget-b", "Widget B", 2, { categories: ["widgets"] }),
      ],
      CATEGORY_URL,
      ["Widget B", "Widget A"],
    );
  });

  test("without explicit products array, reverse-lookup products use default order", async () => {
    await expectProductOrder(
      [
        category("widgets", "Widgets"),
        product("zulu", "Zulu", 1, { categories: ["widgets"] }),
        product("alpha", "Alpha", 2, { categories: ["widgets"] }),
      ],
      CATEGORY_URL,
      ["Zulu", "Alpha"],
    );
  });

  test("duplicate explicit product refs only appear once", async () => {
    await expectProductOrder(
      [
        category("widgets", "Widgets", ["alpha", "beta", "alpha"]),
        product("alpha", "Alpha", 1),
        product("beta", "Beta", 2),
      ],
      CATEGORY_URL,
      ["Alpha", "Beta"],
    );
  });
});

// ============================================
// Event product ordering
// ============================================

// Eleventy strips date prefixes from fileSlug (e.g. "2026-06-19-summer-expo" → "summer-expo").
// Both slug variants must produce the same ordering at /events/summer-expo/.
const EVENT_SLUGS = ["summer-expo", "2026-06-19-summer-expo"];

describe("event product ordering", () => {
  for (const eventSlug of EVENT_SLUGS) {
    const prefix = eventSlug.includes("-expo-") ? "(date-prefixed) " : "";

    test(`${prefix}explicit products array determines display order`, async () => {
      await expectProductOrder(
        [
          eventWithProducts(eventSlug, "Summer Expo", [
            "gamma",
            "alpha",
            "beta",
          ]),
          product("alpha", "Alpha", 1),
          product("beta", "Beta", 2),
          product("gamma", "Gamma", 3),
        ],
        EVENT_URL,
        ["Gamma", "Alpha", "Beta"],
      );
    });

    test(`${prefix}reverse-lookup products appear after explicit ones`, async () => {
      await expectProductOrder(
        [
          eventWithProducts(eventSlug, "Summer Expo", ["explicit-one"]),
          product("explicit-one", "Explicit One"),
          product("reverse-a", "Reverse A", 1, { events: ["summer-expo"] }),
          product("reverse-b", "Reverse B", 2, { events: ["summer-expo"] }),
        ],
        EVENT_URL,
        ["Explicit One", "Reverse A", "Reverse B"],
      );
    });
  }

  test("without explicit products, event uses default order", async () => {
    await expectProductOrder(
      [
        eventWithProducts("summer-expo", "Summer Expo"),
        product("zulu", "Zulu", 1, { events: ["summer-expo"] }),
        product("alpha", "Alpha", 2, { events: ["summer-expo"] }),
      ],
      EVENT_URL,
      ["Zulu", "Alpha"],
    );
  });

  test("duplicate explicit product refs only appear once", async () => {
    await expectProductOrder(
      [
        eventWithProducts("summer-expo", "Summer Expo", [
          "alpha",
          "beta",
          "alpha",
        ]),
        product("alpha", "Alpha", 1),
        product("beta", "Beta", 2),
      ],
      EVENT_URL,
      ["Alpha", "Beta"],
    );
  });

  test("product in both explicit list and reverse-lookup appears only in explicit position", async () => {
    await expectProductOrder(
      [
        eventWithProducts("summer-expo", "Summer Expo", [
          "widget-b",
          "widget-a",
        ]),
        product("widget-a", "Widget A", 1, { events: ["summer-expo"] }),
        product("widget-b", "Widget B", 2, { events: ["summer-expo"] }),
      ],
      EVENT_URL,
      ["Widget B", "Widget A"],
    );
  });
});
