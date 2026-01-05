import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import siteData from "#data/site.json" with { type: "json" };
import { createTestSite } from "#test/test-site-factory.js";

/**
 * PDF Integration Tests
 *
 * These tests use a single shared Eleventy build to verify PDF generation.
 * All test scenarios are included in one comprehensive test site to avoid
 * the overhead of multiple builds (~900ms each).
 *
 * Note: Since pdf.js imports site.json statically at module load time,
 * and the test-site-factory symlinks _lib to the original source,
 * the PDF filenames will always use the default site name ("The Chobble Template")
 * regardless of test site configuration. This is expected behavior.
 */

// PDF files start with this magic number
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

// Derive site slug dynamically from site.json for portability across projects
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const SITE_SLUG = slugify(siteData.name);

// Helper to find PDF file in menu output directory
const findPdfInMenuDir = (site, menuSlug) => {
  const menuDir = path.join(site.outputDir, `menus/${menuSlug}`);
  if (!fs.existsSync(menuDir)) return null;

  const files = fs.readdirSync(menuDir);
  const pdfFile = files.find((f) => f.endsWith(".pdf"));
  return pdfFile ? path.join(menuDir, pdfFile) : null;
};

// Helper to verify PDF has valid header
const verifyPdfHeader = (pdfPath) => {
  const fd = fs.openSync(pdfPath, "r");
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  return buffer.equals(PDF_MAGIC_BYTES);
};

describe("pdf-integration", () => {
  let site;

  // Build once with all test scenarios included
  beforeAll(async () => {
    site = await createTestSite({
      files: [
        // --- Basic menu with category and item (tests: basic generation, valid header) ---
        {
          path: "menus/lunch.md",
          frontmatter: {
            title: "Lunch Menu",
            order: 1,
            subtitle: "Available 12-3pm",
          },
          content: "Our lunch offerings.",
        },
        {
          path: "menu-categories/starters.md",
          frontmatter: {
            name: "Starters",
            order: 1,
            menus: ["lunch"],
          },
          content: "Light bites to begin.",
        },
        {
          path: "menu-items/soup.md",
          frontmatter: {
            name: "Soup of the Day",
            price: "£5.00",
            menu_categories: ["starters"],
            description: "Chef's daily selection",
          },
        },

        // --- Multiple menus test (breakfast, dinner) ---
        {
          path: "menus/breakfast.md",
          frontmatter: { title: "Breakfast", order: 2 },
          content: "",
        },
        {
          path: "menus/dinner.md",
          frontmatter: { title: "Dinner", order: 3 },
          content: "",
        },
        {
          path: "menu-categories/all-day.md",
          frontmatter: {
            name: "All Day",
            order: 1,
            menus: ["breakfast", "lunch", "dinner"],
          },
          content: "",
        },
        {
          path: "menu-items/coffee.md",
          frontmatter: {
            name: "Coffee",
            price: "£3.00",
            menu_categories: ["all-day"],
          },
        },

        // --- Menu-specific categories test ---
        {
          path: "menu-categories/lunch-specials.md",
          frontmatter: {
            name: "Lunch Specials",
            order: 2,
            menus: ["lunch"],
          },
          content: "",
        },
        {
          path: "menu-categories/dinner-specials.md",
          frontmatter: {
            name: "Dinner Specials",
            order: 2,
            menus: ["dinner"],
          },
          content: "",
        },
        {
          path: "menu-items/lunch-deal.md",
          frontmatter: {
            name: "Express Lunch",
            price: "£8.00",
            menu_categories: ["lunch-specials"],
          },
        },
        {
          path: "menu-items/dinner-special.md",
          frontmatter: {
            name: "Chef's Special",
            price: "£18.00",
            menu_categories: ["dinner-specials"],
          },
        },

        // --- Dietary indicators test ---
        {
          path: "menus/healthy.md",
          frontmatter: { title: "Healthy Options", order: 4 },
          content: "",
        },
        {
          path: "menu-categories/salads.md",
          frontmatter: {
            name: "Salads",
            order: 1,
            menus: ["healthy"],
          },
          content: "",
        },
        {
          path: "menu-items/green-salad.md",
          frontmatter: {
            name: "Garden Salad",
            price: "£7.00",
            menu_categories: ["salads"],
            is_vegan: true,
            is_gluten_free: true,
            description: "Fresh seasonal greens",
          },
        },
        {
          path: "menu-items/caesar.md",
          frontmatter: {
            name: "Caesar Salad",
            price: "£9.00",
            menu_categories: ["salads"],
            is_gluten_free: true,
            description: "Classic caesar with croutons",
          },
        },

        // --- Empty/edge cases ---
        // Menu with no matching categories
        {
          path: "menus/special.md",
          frontmatter: { title: "Special Menu", order: 5 },
          content: "",
        },
        {
          path: "menu-categories/other-category.md",
          frontmatter: {
            name: "Other Items",
            order: 1,
            menus: ["different-menu"],
          },
          content: "",
        },

        // Category with no items
        {
          path: "menus/empty-test.md",
          frontmatter: { title: "Empty Test Menu", order: 6 },
          content: "",
        },
        {
          path: "menu-categories/empty-cat.md",
          frontmatter: {
            name: "Empty Category",
            order: 1,
            menus: ["empty-test"],
          },
          content: "Category with no items yet.",
        },

        // Category with markdown description
        {
          path: "menus/markdown-test.md",
          frontmatter: { title: "Markdown Test Menu", order: 7 },
          content: "",
        },
        {
          path: "menu-categories/with-desc.md",
          frontmatter: {
            name: "Described Category",
            order: 1,
            menus: ["markdown-test"],
          },
          content:
            "**Bold** and *italic* description with [link](https://example.com).",
        },
        {
          path: "menu-items/markdown-item.md",
          frontmatter: {
            name: "Markdown Item",
            price: "£5.00",
            menu_categories: ["with-desc"],
          },
        },

        // --- Multiple items per category ---
        {
          path: "menus/drinks.md",
          frontmatter: { title: "Drinks Menu", order: 8 },
          content: "",
        },
        {
          path: "menu-categories/hot-drinks.md",
          frontmatter: {
            name: "Hot Drinks",
            order: 1,
            menus: ["drinks"],
          },
          content: "",
        },
        {
          path: "menu-items/hot-coffee.md",
          frontmatter: {
            name: "Coffee",
            price: "£2.50",
            menu_categories: ["hot-drinks"],
            description: "Freshly brewed",
          },
        },
        {
          path: "menu-items/tea.md",
          frontmatter: {
            name: "Tea",
            price: "£2.00",
            menu_categories: ["hot-drinks"],
            description: "Selection of teas",
          },
        },
        {
          path: "menu-items/hot-chocolate.md",
          frontmatter: {
            name: "Hot Chocolate",
            price: "£3.00",
            menu_categories: ["hot-drinks"],
            description: "Rich and creamy",
          },
        },

        // --- Subtitle handling ---
        {
          path: "menus/happy-hour.md",
          frontmatter: {
            title: "Happy Hour",
            subtitle: "4pm - 7pm Daily • All drinks half price",
            order: 9,
          },
          content: "",
        },
        {
          path: "menu-categories/cocktails.md",
          frontmatter: {
            name: "Cocktails",
            order: 1,
            menus: ["happy-hour"],
          },
          content: "",
        },
        {
          path: "menu-items/mojito.md",
          frontmatter: {
            name: "Mojito",
            price: "£4.00",
            menu_categories: ["cocktails"],
          },
        },

        // Menu without subtitle
        {
          path: "menus/simple.md",
          frontmatter: {
            title: "Simple Menu",
            order: 10,
          },
          content: "",
        },
        {
          path: "menu-categories/simple-items.md",
          frontmatter: {
            name: "Items",
            order: 1,
            menus: ["simple"],
          },
          content: "",
        },
        {
          path: "menu-items/simple-thing.md",
          frontmatter: {
            name: "Thing",
            price: "£5.00",
            menu_categories: ["simple-items"],
          },
        },

        // --- PDF size comparison (small vs large) ---
        {
          path: "menus/small.md",
          frontmatter: { title: "Small Menu", order: 11 },
          content: "",
        },
        {
          path: "menus/large.md",
          frontmatter: { title: "Large Menu", order: 12 },
          content: "",
        },
        {
          path: "menu-categories/small-cat.md",
          frontmatter: {
            name: "Small Category",
            order: 1,
            menus: ["small"],
          },
          content: "",
        },
        {
          path: "menu-categories/large-cat-1.md",
          frontmatter: {
            name: "Large Category 1",
            order: 1,
            menus: ["large"],
          },
          content: "",
        },
        {
          path: "menu-categories/large-cat-2.md",
          frontmatter: {
            name: "Large Category 2",
            order: 2,
            menus: ["large"],
          },
          content: "",
        },
        {
          path: "menu-items/small-item.md",
          frontmatter: {
            name: "Single Item",
            price: "£5.00",
            menu_categories: ["small-cat"],
          },
        },
        {
          path: "menu-items/large-item-1.md",
          frontmatter: {
            name: "Item One",
            price: "£10.00",
            menu_categories: ["large-cat-1"],
            description: "First delicious item on our menu",
          },
        },
        {
          path: "menu-items/large-item-2.md",
          frontmatter: {
            name: "Item Two",
            price: "£12.00",
            menu_categories: ["large-cat-1"],
            description: "Second amazing dish",
          },
        },
        {
          path: "menu-items/large-item-3.md",
          frontmatter: {
            name: "Item Three",
            price: "£15.00",
            menu_categories: ["large-cat-2"],
            description: "Third wonderful option",
          },
        },
        {
          path: "menu-items/large-item-4.md",
          frontmatter: {
            name: "Item Four",
            price: "£18.00",
            menu_categories: ["large-cat-2"],
            description: "Fourth exceptional choice",
          },
        },
        {
          path: "menu-items/large-item-5.md",
          frontmatter: {
            name: "Item Five",
            price: "£20.00",
            menu_categories: ["large-cat-2"],
            description: "Fifth fantastic selection",
          },
        },
      ],
    });
    await site.build();
  });

  afterAll(() => {
    site?.cleanup();
  });

  // --- Basic PDF Generation ---
  test("PDF file is generated when menu exists with categories and items", () => {
    const pdfPath = findPdfInMenuDir(site, "lunch");
    expect(pdfPath !== null).toBe(true);
    expect(pdfPath.endsWith(`${SITE_SLUG}-lunch.pdf`)).toBe(true);
  });

  test("Generated PDF has valid PDF file header", () => {
    const pdfPath = findPdfInMenuDir(site, "lunch");
    expect(pdfPath !== null).toBe(true);
    expect(verifyPdfHeader(pdfPath)).toBe(true);
  });

  // --- Multiple Menus ---
  test("Separate PDF files are generated for each menu", () => {
    expect(findPdfInMenuDir(site, "breakfast") !== null).toBe(true);
    expect(findPdfInMenuDir(site, "lunch") !== null).toBe(true);
    expect(findPdfInMenuDir(site, "dinner") !== null).toBe(true);
  });

  // --- Categories Filter Correctly ---
  test("Each menu PDF is generated even with menu-specific categories", () => {
    const lunchPdf = findPdfInMenuDir(site, "lunch");
    const dinnerPdf = findPdfInMenuDir(site, "dinner");

    expect(lunchPdf !== null).toBe(true);
    expect(dinnerPdf !== null).toBe(true);

    const lunchSize = fs.statSync(lunchPdf).size;
    const dinnerSize = fs.statSync(dinnerPdf).size;

    expect(lunchSize > 100).toBe(true);
    expect(dinnerSize > 100).toBe(true);
  });

  // --- Dietary Indicators ---
  test("PDF generation works with items that have dietary indicators", () => {
    const pdfPath = findPdfInMenuDir(site, "healthy");
    expect(pdfPath !== null).toBe(true);

    const size = fs.statSync(pdfPath).size;
    expect(size > 500).toBe(true);
  });

  // --- Empty/Edge Cases ---
  test("PDF is generated even when menu has no matching categories", () => {
    const pdfPath = findPdfInMenuDir(site, "special");
    expect(pdfPath !== null).toBe(true);
  });

  test("PDF is generated when category exists but has no items", () => {
    const pdfPath = findPdfInMenuDir(site, "empty-test");
    expect(pdfPath !== null).toBe(true);
  });

  test("PDF handles category with markdown content description", () => {
    const pdfPath = findPdfInMenuDir(site, "markdown-test");
    expect(pdfPath !== null).toBe(true);
  });

  // --- Multiple Items Per Category ---
  test("PDF correctly includes multiple items in a single category", () => {
    const pdfPath = findPdfInMenuDir(site, "drinks");
    expect(pdfPath !== null).toBe(true);

    const size = fs.statSync(pdfPath).size;
    expect(size > 1000).toBe(true);
  });

  // --- Subtitle Handling ---
  test("PDF is generated correctly when menu has subtitle", () => {
    const pdfPath = findPdfInMenuDir(site, "happy-hour");
    expect(pdfPath !== null).toBe(true);
  });

  test("PDF is generated correctly when menu has no subtitle", () => {
    const pdfPath = findPdfInMenuDir(site, "simple");
    expect(pdfPath !== null).toBe(true);
  });

  // --- PDF Size Verification ---
  test("PDF size is proportional to menu content", () => {
    const smallPdf = findPdfInMenuDir(site, "small");
    const largePdf = findPdfInMenuDir(site, "large");

    expect(smallPdf !== null).toBe(true);
    expect(largePdf !== null).toBe(true);

    const smallSize = fs.statSync(smallPdf).size;
    const largeSize = fs.statSync(largePdf).size;

    expect(largeSize > smallSize).toBe(true);
  });
});
