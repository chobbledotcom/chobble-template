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

const EXPO_DATE = "2026-06-19";

/** Build a test event file with optional explicit products. */
const eventWithProducts = (slug, title, products) => ({
  path: `events/${slug}.md`,
  frontmatter: {
    title,
    event_date: EXPO_DATE,
    ...(products ? { products: products.map((p) => ({ product: p })) } : {}),
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

const EVENT_URL = "/events/summer-expo/index.html";

const alphabeticProducts = [
  product("alpha", "Alpha", 1),
  product("beta", "Beta", 2),
  product("gamma", "Gamma", 3),
];

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
          ...alphabeticProducts,
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
