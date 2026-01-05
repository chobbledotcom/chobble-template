import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import siteData from "#data/site.json" with { type: "json" };
import { createTestSite } from "#test/test-site-factory.js";

/**
 * PDF Integration Tests
 *
 * These tests verify that the PDF generation pipeline works end-to-end.
 * Without a PDF parsing library, we can only verify:
 * - PDFs are created for each menu
 * - Files have valid PDF headers (not corrupt)
 * - File sizes correlate with content amount
 *
 * Content verification (item names, prices, dietary symbols) is tested
 * in pdf.test.js via buildMenuPdfData unit tests.
 */

// PDF files start with this magic number
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const SITE_SLUG = slugify(siteData.name);

const findPdfInMenuDir = (site, menuSlug) => {
  const menuDir = path.join(site.outputDir, `menus/${menuSlug}`);
  if (!fs.existsSync(menuDir)) return null;
  const files = fs.readdirSync(menuDir);
  const pdfFile = files.find((f) => f.endsWith(".pdf"));
  return pdfFile ? path.join(menuDir, pdfFile) : null;
};

const verifyPdfHeader = (pdfPath) => {
  const fd = fs.openSync(pdfPath, "r");
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  return buffer.equals(PDF_MAGIC_BYTES);
};

describe("pdf-integration", () => {
  let site;

  beforeAll(async () => {
    site = await createTestSite({
      files: [
        // Small menu (1 item)
        {
          path: "menus/small.md",
          frontmatter: { title: "Small Menu", order: 1 },
          content: "",
        },
        {
          path: "menu-categories/small-cat.md",
          frontmatter: { name: "Small Category", order: 1, menus: ["small"] },
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

        // Large menu (5 items across 2 categories)
        {
          path: "menus/large.md",
          frontmatter: { title: "Large Menu", order: 2 },
          content: "",
        },
        {
          path: "menu-categories/large-cat-1.md",
          frontmatter: { name: "Category 1", order: 1, menus: ["large"] },
          content: "",
        },
        {
          path: "menu-categories/large-cat-2.md",
          frontmatter: { name: "Category 2", order: 2, menus: ["large"] },
          content: "",
        },
        {
          path: "menu-items/large-1.md",
          frontmatter: {
            name: "Item One",
            price: "£10",
            menu_categories: ["large-cat-1"],
            description: "First item description",
          },
        },
        {
          path: "menu-items/large-2.md",
          frontmatter: {
            name: "Item Two",
            price: "£12",
            menu_categories: ["large-cat-1"],
            description: "Second item description",
          },
        },
        {
          path: "menu-items/large-3.md",
          frontmatter: {
            name: "Item Three",
            price: "£15",
            menu_categories: ["large-cat-2"],
            description: "Third item description",
          },
        },
        {
          path: "menu-items/large-4.md",
          frontmatter: {
            name: "Item Four",
            price: "£18",
            menu_categories: ["large-cat-2"],
            description: "Fourth item description",
          },
        },
        {
          path: "menu-items/large-5.md",
          frontmatter: {
            name: "Item Five",
            price: "£20",
            menu_categories: ["large-cat-2"],
            description: "Fifth item description",
          },
        },

        // Empty menu (no items)
        {
          path: "menus/empty.md",
          frontmatter: { title: "Empty Menu", order: 3 },
          content: "",
        },
      ],
    });
    await site.build();
  });

  afterAll(() => {
    site?.cleanup();
  });

  test("PDFs are generated for all menus with correct naming", () => {
    const smallPdf = findPdfInMenuDir(site, "small");
    const largePdf = findPdfInMenuDir(site, "large");
    const emptyPdf = findPdfInMenuDir(site, "empty");

    expect(smallPdf).not.toBeNull();
    expect(largePdf).not.toBeNull();
    expect(emptyPdf).not.toBeNull();

    expect(smallPdf.endsWith(`${SITE_SLUG}-small.pdf`)).toBe(true);
    expect(largePdf.endsWith(`${SITE_SLUG}-large.pdf`)).toBe(true);
  });

  test("All generated PDFs have valid PDF headers", () => {
    const smallPdf = findPdfInMenuDir(site, "small");
    const largePdf = findPdfInMenuDir(site, "large");
    const emptyPdf = findPdfInMenuDir(site, "empty");

    expect(verifyPdfHeader(smallPdf)).toBe(true);
    expect(verifyPdfHeader(largePdf)).toBe(true);
    expect(verifyPdfHeader(emptyPdf)).toBe(true);
  });

  test("PDF file size correlates with menu content", () => {
    const smallPdf = findPdfInMenuDir(site, "small");
    const largePdf = findPdfInMenuDir(site, "large");
    const emptyPdf = findPdfInMenuDir(site, "empty");

    const smallSize = fs.statSync(smallPdf).size;
    const largeSize = fs.statSync(largePdf).size;
    const emptySize = fs.statSync(emptyPdf).size;

    // Larger menu should produce larger PDF
    expect(largeSize).toBeGreaterThan(smallSize);
    // Even empty menus produce valid PDFs (header + structure)
    expect(emptySize).toBeGreaterThan(0);
  });
});
