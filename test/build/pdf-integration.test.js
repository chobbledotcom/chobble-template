import { describe, test, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { withTestSite } from "#test/test-site-factory.js";

/**
 * PDF Integration Tests
 *
 * These tests use the test-site-factory to build actual Eleventy sites
 * and verify that PDF generation works correctly end-to-end.
 *
 * Note: Since pdf.js imports site.json statically at module load time,
 * and the test-site-factory symlinks _lib to the original source,
 * the PDF filenames will always use the default site name ("The Chobble Template")
 * regardless of test site configuration. This is expected behavior.
 *
 * Note: Since the site factory runs Eleventy as a subprocess, these tests
 * do not contribute to coverage metrics. Their value is in verifying the
 * complete PDF generation pipeline: data collection → template rendering → file output.
 */

// PDF files start with this magic number
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

// Default site name produces this slug prefix (from src/_data/site.json)
const SITE_SLUG = "the-chobble-template";

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
  // --- Basic PDF Generation ---
  test("PDF file is generated when menu exists with categories and items", async () => {
    await withTestSite(
      {
        files: [
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
        ],
      },
      (site) => {
        // PDF should exist in the menu directory
        const pdfPath = findPdfInMenuDir(site, "lunch");
        expect(pdfPath !== null).toBe(true);

        // Should follow naming convention
        expect(pdfPath.endsWith(`${SITE_SLUG}-lunch.pdf`)).toBe(true);
      },
    );
  });

  test("Generated PDF has valid PDF file header", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/dinner.md",
            frontmatter: {
              title: "Dinner Menu",
              order: 1,
            },
            content: "Evening selections.",
          },
          {
            path: "menu-categories/mains.md",
            frontmatter: {
              name: "Main Courses",
              order: 1,
              menus: ["dinner"],
            },
            content: "",
          },
          {
            path: "menu-items/pasta.md",
            frontmatter: {
              name: "Pasta Primavera",
              price: "£12.00",
              menu_categories: ["mains"],
            },
          },
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "dinner");
        expect(pdfPath !== null).toBe(true);
        expect(verifyPdfHeader(pdfPath)).toBe(true);
      },
    );
  });

  // --- Multiple Menus ---
  test("Separate PDF files are generated for each menu", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/breakfast.md",
            frontmatter: { title: "Breakfast", order: 1 },
            content: "",
          },
          {
            path: "menus/lunch.md",
            frontmatter: { title: "Lunch", order: 2 },
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
        ],
      },
      (site) => {
        expect(findPdfInMenuDir(site, "breakfast") !== null).toBe(true);
        expect(findPdfInMenuDir(site, "lunch") !== null).toBe(true);
        expect(findPdfInMenuDir(site, "dinner") !== null).toBe(true);
      },
    );
  });

  // --- Categories Filter Correctly ---
  test("Each menu PDF is generated even with menu-specific categories", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/lunch.md",
            frontmatter: { title: "Lunch", order: 1 },
            content: "",
          },
          {
            path: "menus/dinner.md",
            frontmatter: { title: "Dinner", order: 2 },
            content: "",
          },
          {
            path: "menu-categories/lunch-specials.md",
            frontmatter: {
              name: "Lunch Specials",
              order: 1,
              menus: ["lunch"],
            },
            content: "",
          },
          {
            path: "menu-categories/dinner-specials.md",
            frontmatter: {
              name: "Dinner Specials",
              order: 1,
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
        ],
      },
      (site) => {
        const lunchPdf = findPdfInMenuDir(site, "lunch");
        const dinnerPdf = findPdfInMenuDir(site, "dinner");

        expect(lunchPdf !== null).toBe(true);
        expect(dinnerPdf !== null).toBe(true);

        // Both should be valid PDFs with reasonable size
        const lunchSize = fs.statSync(lunchPdf).size;
        const dinnerSize = fs.statSync(dinnerPdf).size;

        expect(lunchSize > 100).toBe(true);
        expect(dinnerSize > 100).toBe(true);
      },
    );
  });

  // --- Dietary Indicators ---
  test("PDF generation works with items that have dietary indicators", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/healthy.md",
            frontmatter: { title: "Healthy Options", order: 1 },
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
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "healthy");
        expect(pdfPath !== null).toBe(true);

        // PDF with dietary items should have substantial content
        const size = fs.statSync(pdfPath).size;
        expect(size > 500).toBe(true);
      },
    );
  });

  // --- Empty/Edge Cases ---
  test("PDF is generated even when menu has no matching categories", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/special.md",
            frontmatter: { title: "Special Menu", order: 1 },
            content: "",
          },
          // Category exists but doesn't belong to this menu
          {
            path: "menu-categories/other-category.md",
            frontmatter: {
              name: "Other Items",
              order: 1,
              menus: ["different-menu"],
            },
            content: "",
          },
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "special");
        expect(pdfPath !== null).toBe(true);
      },
    );
  });

  test("PDF is generated when category exists but has no items", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/test.md",
            frontmatter: { title: "Test Menu", order: 1 },
            content: "",
          },
          {
            path: "menu-categories/empty-cat.md",
            frontmatter: {
              name: "Empty Category",
              order: 1,
              menus: ["test"],
            },
            content: "Category with no items yet.",
          },
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "test");
        expect(pdfPath !== null).toBe(true);
      },
    );
  });

  test("PDF handles category with markdown content description", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/test.md",
            frontmatter: { title: "Test Menu", order: 1 },
            content: "",
          },
          {
            path: "menu-categories/with-desc.md",
            frontmatter: {
              name: "Described Category",
              order: 1,
              menus: ["test"],
            },
            // Markdown content that becomes HTML
            content:
              "**Bold** and *italic* description with [link](https://example.com).",
          },
          {
            path: "menu-items/item.md",
            frontmatter: {
              name: "Test Item",
              price: "£5.00",
              menu_categories: ["with-desc"],
            },
          },
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "test");
        expect(pdfPath !== null).toBe(true);
      },
    );
  });

  // --- Multiple Items Per Category ---
  test("PDF correctly includes multiple items in a single category", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/drinks.md",
            frontmatter: { title: "Drinks Menu", order: 1 },
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
            path: "menu-items/coffee.md",
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
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "drinks");
        expect(pdfPath !== null).toBe(true);

        // PDF with multiple items should be larger
        const size = fs.statSync(pdfPath).size;
        expect(size > 1000).toBe(true);
      },
    );
  });

  // --- Subtitle Handling ---
  test("PDF is generated correctly when menu has subtitle", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/happy-hour.md",
            frontmatter: {
              title: "Happy Hour",
              subtitle: "4pm - 7pm Daily • All drinks half price",
              order: 1,
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
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "happy-hour");
        expect(pdfPath !== null).toBe(true);
      },
    );
  });

  test("PDF is generated correctly when menu has no subtitle", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/simple.md",
            frontmatter: {
              title: "Simple Menu",
              order: 1,
              // No subtitle
            },
            content: "",
          },
          {
            path: "menu-categories/items.md",
            frontmatter: {
              name: "Items",
              order: 1,
              menus: ["simple"],
            },
            content: "",
          },
          {
            path: "menu-items/thing.md",
            frontmatter: {
              name: "Thing",
              price: "£5.00",
              menu_categories: ["items"],
            },
          },
        ],
      },
      (site) => {
        const pdfPath = findPdfInMenuDir(site, "simple");
        expect(pdfPath !== null).toBe(true);
      },
    );
  });

  // --- PDF Size Verification ---
  test("PDF size is proportional to menu content", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "menus/small.md",
            frontmatter: { title: "Small Menu", order: 1 },
            content: "",
          },
          {
            path: "menus/large.md",
            frontmatter: { title: "Large Menu", order: 2 },
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
          // Small menu: 1 item
          {
            path: "menu-items/small-item.md",
            frontmatter: {
              name: "Single Item",
              price: "£5.00",
              menu_categories: ["small-cat"],
            },
          },
          // Large menu: 5 items
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
      },
      (site) => {
        const smallPdf = findPdfInMenuDir(site, "small");
        const largePdf = findPdfInMenuDir(site, "large");

        expect(smallPdf !== null).toBe(true);
        expect(largePdf !== null).toBe(true);

        const smallSize = fs.statSync(smallPdf).size;
        const largeSize = fs.statSync(largePdf).size;

        // Large menu with more items should produce larger PDF
        expect(largeSize > smallSize).toBe(true);
      },
    );
  });
});
