import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

// ============================================
// Shared helpers
// ============================================

/** Product with given categories (default: none). */
const product = (slug, name, order = 0, extras = {}) => ({
  path: `products/${slug}.md`,
  frontmatter: { name, order, categories: [], ...extras },
  content: "",
});

const EXPO_DATE = "2026-06-19";

/** Build a test event file with optional explicit products. */
const eventWithProducts = (slug, name, products) => ({
  path: `events/${slug}.md`,
  frontmatter: {
    name,
    event_date: EXPO_DATE,
    ...(products ? { products: products.map((p) => ({ product: p })) } : {}),
    blocks: [{ type: "event-products" }],
  },
  content: "",
});

const getProductTitles = async (site, pageUrl) => {
  const doc = await site.getDoc(pageUrl);
  return [...doc.querySelectorAll(".items h3")].map((h) =>
    h.textContent.trim(),
  );
};

const alphabeticProducts = [
  product("alpha", "Alpha", 1),
  product("beta", "Beta", 2),
  product("gamma", "Gamma", 3),
];

// ============================================
// Event product ordering
// ============================================

// Eleventy strips date prefixes from fileSlug
// (e.g. "2026-06-19-date-prefixed-expo" → "date-prefixed-expo").
// The consolidated fixture keeps date-prefixed and non-prefixed events in one build.
describe("event product ordering", () => {
  test("orders products across explicit, reverse-lookup, duplicate, and date-prefixed events", async () => {
    const files = [
      eventWithProducts("summer-expo", "Summer Expo", [
        "gamma",
        "alpha",
        "beta",
      ]),
      eventWithProducts(
        "2026-06-19-date-prefixed-expo",
        "Date Prefixed Expo",
        ["date-gamma", "date-alpha", "date-beta"],
      ),
      eventWithProducts("reverse-expo", "Reverse Expo", ["explicit-one"]),
      eventWithProducts("2026-06-19-date-reverse-expo", "Date Reverse Expo", [
        "date-explicit-one",
      ]),
      eventWithProducts("default-expo", "Default Expo"),
      eventWithProducts("duplicate-expo", "Duplicate Expo", [
        "dup-alpha",
        "dup-beta",
        "dup-alpha",
      ]),
      eventWithProducts("overlap-expo", "Overlap Expo", [
        "widget-b",
        "widget-a",
      ]),
      ...alphabeticProducts,
      product("date-alpha", "Date Alpha", 1),
      product("date-beta", "Date Beta", 2),
      product("date-gamma", "Date Gamma", 3),
      product("explicit-one", "Explicit One"),
      product("reverse-a", "Reverse A", 1, { events: ["reverse-expo"] }),
      product("reverse-b", "Reverse B", 2, { events: ["reverse-expo"] }),
      product("date-explicit-one", "Date Explicit One"),
      product("date-reverse-a", "Date Reverse A", 1, {
        events: ["date-reverse-expo"],
      }),
      product("date-reverse-b", "Date Reverse B", 2, {
        events: ["date-reverse-expo"],
      }),
      product("zulu", "Zulu", 1, { events: ["default-expo"] }),
      product("default-alpha", "Default Alpha", 2, { events: ["default-expo"] }),
      product("dup-alpha", "Duplicate Alpha", 1),
      product("dup-beta", "Duplicate Beta", 2),
      product("widget-a", "Widget A", 1, { events: ["overlap-expo"] }),
      product("widget-b", "Widget B", 2, { events: ["overlap-expo"] }),
    ];

    await withTestSite({ files }, async (site) => {
      expect(
        await getProductTitles(site, "/events/summer-expo/index.html"),
      ).toEqual(["Gamma", "Alpha", "Beta"]);
      expect(
        await getProductTitles(site, "/events/date-prefixed-expo/index.html"),
      ).toEqual(["Date Gamma", "Date Alpha", "Date Beta"]);
      expect(
        await getProductTitles(site, "/events/reverse-expo/index.html"),
      ).toEqual(["Explicit One", "Reverse A", "Reverse B"]);
      expect(
        await getProductTitles(site, "/events/date-reverse-expo/index.html"),
      ).toEqual(["Date Explicit One", "Date Reverse A", "Date Reverse B"]);
      expect(
        await getProductTitles(site, "/events/default-expo/index.html"),
      ).toEqual(["Zulu", "Default Alpha"]);
      expect(
        await getProductTitles(site, "/events/duplicate-expo/index.html"),
      ).toEqual(["Duplicate Alpha", "Duplicate Beta"]);
      expect(
        await getProductTitles(site, "/events/overlap-expo/index.html"),
      ).toEqual(["Widget B", "Widget A"]);
    });
  });
});
