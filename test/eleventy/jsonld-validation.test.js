import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import Validator from "@adobe/structured-data-validator";
import WebAutoExtractor from "@marbec/web-auto-extractor";
import { createTestSite, withTestSite } from "#test/test-site-factory.js";
import { rootDir } from "#test/test-utils.js";

/**
 * JSON-LD Validation Tests
 *
 * Validates rendered pages contain valid JSON-LD structured data conforming
 * to schema.org specifications. Uses local schema definitions for CI reliability.
 *
 * @see https://github.com/adobe/structured-data-validator
 */

// ============================================
// Schema.org Validator (functional, no mutable state)
// ============================================

// Load schema definitions from local file (for CI reliability)
const schemaPath = path.join(
  rootDir,
  "test/schemas/schemaorg-all-https.jsonld",
);
const schemaOrgDefinitions = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

const createValidator = () => new Validator(schemaOrgDefinitions);

const createExtractor = () =>
  new WebAutoExtractor({
    addLocation: true,
    embedSource: ["rdfa", "microdata"],
  });

/**
 * Collect errors and warnings from validation results
 */
const collectValidationIssues = (results) =>
  results.reduce(
    (acc, result) => ({
      errors: [...acc.errors, ...(result.errors || [])],
      warnings: [...acc.warnings, ...(result.warnings || [])],
    }),
    { errors: [], warnings: [] },
  );

/**
 * Validate HTML against schema.org definitions
 */
const validateWithSchemaOrg = async (html) => {
  const validator = createValidator();
  const extractor = createExtractor();
  const extractedData = extractor.parse(html);
  const results = await validator.validate(extractedData);
  const { errors, warnings } = collectValidationIssues(results);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    results,
  };
};

// ============================================
// JSON-LD Extraction (pure functions)
// ============================================

const JSON_LD_PATTERN =
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;

const parseJsonSafe = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const extractJsonLd = (html) => {
  const match = html.match(JSON_LD_PATTERN);
  return match ? parseJsonSafe(match[1]) : null;
};

const getEntities = (jsonLd) => jsonLd?.["@graph"] ?? (jsonLd ? [jsonLd] : []);

const findEntityByType = (jsonLd, type) =>
  getEntities(jsonLd).find((e) => e["@type"] === type) ?? null;

// ============================================
// Validation Functions (pure, composable)
// ============================================

const VALID_CONTEXTS = new Set([
  "https://schema.org",
  "http://schema.org/",
  "https://schema.org/",
]);

const validateContext = (jsonLd) => {
  if (!jsonLd) return { valid: false, error: "No JSON-LD found" };
  if (!jsonLd["@context"]) return { valid: false, error: "Missing @context" };
  if (!VALID_CONTEXTS.has(jsonLd["@context"]))
    return { valid: false, error: `Invalid @context: ${jsonLd["@context"]}` };
  return { valid: true, error: null };
};

// Required properties by type (based on Google Rich Results requirements)
const REQUIRED_PROPERTIES = {
  Organization: ["name", "url"],
  WebSite: ["name", "url"],
  Product: ["image"],
  BlogPosting: ["publisher"],
  WebPage: [],
  Event: [],
};

const validateEntityProperties = (entity, type) => {
  if (!entity) return { valid: false, errors: [`No ${type} entity found`] };

  const typeError =
    entity["@type"] !== type
      ? [`Expected @type "${type}", got "${entity["@type"]}"`]
      : [];

  const missingProps = (REQUIRED_PROPERTIES[type] || [])
    .filter((prop) => !entity[prop])
    .map((prop) => `Missing required property: ${prop}`);

  const errors = [...typeError, ...missingProps];
  return { valid: errors.length === 0, errors };
};

// ============================================
// Test Fixtures (factory functions)
// ============================================

const createFile = (path, frontmatter, content) => ({
  path,
  frontmatter,
  content,
});

const productFile = (slug, title, options = {}) =>
  createFile(
    `products/${slug}.md`,
    {
      title,
      tags: ["product"],
      ...(options.price && { price: options.price }),
      header_image: `src/images/${options.image || "placeholder.jpg"}`,
      meta_description: options.description || `Description for ${title}`,
      ...options.extra,
    },
    options.content || `# ${title}\n\nProduct content.`,
  );

const newsFile = (slug, title, options = {}) =>
  createFile(
    `news/2024-01-01-${slug}.md`,
    {
      title,
      ...(options.author && { author: options.author }),
      header_image: `src/images/${options.image || "placeholder.jpg"}`,
      meta_description: options.description || `Description for ${title}`,
      ...options.extra,
    },
    options.content || `# ${title}\n\nNews content.`,
  );

const pageFile = (slug, title, options = {}) =>
  createFile(
    `pages/${slug}.md`,
    {
      title,
      layout: options.layout || "page",
      permalink: options.permalink || `/${slug}/`,
      meta_description: options.description || `Description for ${title}`,
      ...options.extra,
    },
    options.content || `# ${title}\n\nPage content.`,
  );

// ============================================
// Test Data
// ============================================

const TEST_SITE_CONFIG = {
  dataFiles: [
    {
      filename: "site.json",
      data: {
        name: "Test Site",
        url: "https://test.example.com",
        description: "A test site for JSON-LD validation",
        logo: "/images/logo.png",
      },
    },
    {
      filename: "meta.json",
      data: {
        legalName: "Test Site Ltd",
        foundingDate: "2020",
        founders: [{ name: "John Founder" }],
        address: {
          streetAddress: "123 Test Street",
          locality: "Test City",
          region: "Test Region",
          postalCode: "TE1 1ST",
          country: "GB",
        },
        contactPoints: [
          {
            telephone: "+44-1234-567890",
            type: "customer service",
            areaServed: "GB",
          },
        ],
      },
    },
  ],
  files: [
    productFile("test-product", "Test Product", {
      price: "£49.99",
      description: "A wonderful test product",
    }),
    newsFile("test-post", "Test News Post", {
      description: "An important news update",
    }),
    createFile(
      "pages/index.md",
      {
        title: "Welcome",
        layout: "home",
        permalink: "/",
        meta_description: "Welcome to our test site",
      },
      "# Welcome\n\nHome page content.",
    ),
    createFile(
      "pages/contact.md",
      {
        title: "Contact Us",
        layout: "contact",
        permalink: "/contact/",
        meta_description: "Get in touch with us",
      },
      "# Contact\n\nContact page content.",
    ),
    pageFile("about", "About Us", {
      description: "Learn about our company",
    }),
  ],
  images: ["placeholder.jpg"],
};

const ALL_TEST_PAGES = [
  "/products/test-product/index.html",
  "/news/test-post/index.html",
  "/index.html",
  "/contact/index.html",
  "/about/index.html",
];

const PAGES_WITH_WEBSITE = [
  "/products/test-product/index.html",
  "/news/test-post/index.html",
  "/index.html",
];

// ============================================
// Test Helpers
// ============================================

const assertSchemaOrgValid = async (html, label) => {
  const result = await validateWithSchemaOrg(html);
  if (!result.valid) {
    console.log(`${label} schema.org validation errors:`, result.errors);
  }
  expect(result.valid).toBe(true);
};

const assertEntityValid = (site, pagePath, entityType) => {
  const html = site.getOutput(pagePath);
  const jsonLd = extractJsonLd(html);
  const entity = findEntityByType(jsonLd, entityType);
  const result = validateEntityProperties(entity, entityType);
  expect(result.valid).toBe(true);
};

// ============================================
// Tests
// ============================================

describe("JSON-LD structured data validation", () => {
  describe("comprehensive validation", () => {
    let site;

    beforeAll(async () => {
      site = await createTestSite(TEST_SITE_CONFIG);
      await site.build();
    });

    afterAll(() => site?.cleanup());

    // --- Schema.org Validation Tests ---

    test("Product page validates against schema.org", async () => {
      const html = site.getOutput("/products/test-product/index.html");
      await assertSchemaOrgValid(html, "Product");
    });

    test("News post validates against schema.org", async () => {
      const html = site.getOutput("/news/test-post/index.html");
      await assertSchemaOrgValid(html, "BlogPosting");
    });

    test("Home page validates against schema.org", async () => {
      const html = site.getOutput("/index.html");
      await assertSchemaOrgValid(html, "Home page");
    });

    test("Contact page validates against schema.org", async () => {
      const html = site.getOutput("/contact/index.html");
      await assertSchemaOrgValid(html, "Contact");
    });

    test("About page validates against schema.org", async () => {
      const html = site.getOutput("/about/index.html");
      await assertSchemaOrgValid(html, "About page");
    });

    // --- Basic JSON-LD Structure Tests ---

    test("Product page contains valid JSON-LD structure", () => {
      const html = site.getOutput("/products/test-product/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
      expect(Array.isArray(jsonLd["@graph"])).toBe(true);
    });

    test("News post contains valid JSON-LD structure", () => {
      const html = site.getOutput("/news/test-post/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
    });

    test("Home page contains valid JSON-LD structure", () => {
      const html = site.getOutput("/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
    });

    test("Contact page contains valid JSON-LD structure", () => {
      const html = site.getOutput("/contact/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
    });

    // --- Organization Schema Tests ---

    test("All pages include valid Organization entity", () => {
      for (const pagePath of ALL_TEST_PAGES) {
        assertEntityValid(site, pagePath, "Organization");
      }
    });

    test("Organization entity has proper @id for cross-referencing", () => {
      const jsonLd = extractJsonLd(site.getOutput("/index.html"));
      const org = findEntityByType(jsonLd, "Organization");

      expect(org["@id"]).toBeDefined();
      expect(org["@id"]).toContain("#organization");
    });

    // --- WebSite Schema Tests ---

    test("Pages include valid WebSite entity", () => {
      for (const pagePath of PAGES_WITH_WEBSITE) {
        assertEntityValid(site, pagePath, "WebSite");
      }
    });

    test("WebSite entity has proper @id for cross-referencing", () => {
      const jsonLd = extractJsonLd(site.getOutput("/index.html"));
      const website = findEntityByType(jsonLd, "WebSite");

      expect(website["@id"]).toBeDefined();
      expect(website["@id"]).toContain("#website");
    });

    // --- Product Schema Tests ---

    test("Product page includes valid Product entity", () => {
      assertEntityValid(site, "/products/test-product/index.html", "Product");
    });

    test("Product entity has image property", () => {
      const jsonLd = extractJsonLd(
        site.getOutput("/products/test-product/index.html"),
      );
      const product = findEntityByType(jsonLd, "Product");

      expect(product.image).toBeDefined();
      expect(typeof product.image).toBe("string");
    });

    // --- BlogPosting Schema Tests ---

    test("News post includes valid BlogPosting entity", () => {
      assertEntityValid(site, "/news/test-post/index.html", "BlogPosting");
    });

    test("BlogPosting includes publisher with @type Organization", () => {
      const jsonLd = extractJsonLd(
        site.getOutput("/news/test-post/index.html"),
      );
      const post = findEntityByType(jsonLd, "BlogPosting");

      expect(post.publisher).toBeDefined();
      expect(post.publisher["@type"]).toBe("Organization");
    });

    test("BlogPosting references website via isPartOf", () => {
      const jsonLd = extractJsonLd(
        site.getOutput("/news/test-post/index.html"),
      );
      const post = findEntityByType(jsonLd, "BlogPosting");

      expect(post.isPartOf).toBeDefined();
      expect(post.isPartOf["@id"]).toContain("#website");
    });

    // --- WebPage Schema Tests ---

    test("Regular page includes WebPage entity", () => {
      const jsonLd = extractJsonLd(site.getOutput("/about/index.html"));
      const page = findEntityByType(jsonLd, "WebPage");

      expect(page).not.toBeNull();
      expect(page["@type"]).toBe("WebPage");
    });

    // --- @context validation ---

    test("JSON-LD uses https://schema.org context", () => {
      for (const pagePath of PAGES_WITH_WEBSITE) {
        const jsonLd = extractJsonLd(site.getOutput(pagePath));
        expect(jsonLd["@context"]).toBe("https://schema.org");
      }
    });

    // --- JSON Structure Tests ---

    test("JSON-LD is valid parseable JSON on all pages", () => {
      for (const pagePath of ALL_TEST_PAGES) {
        const jsonLd = extractJsonLd(site.getOutput(pagePath));
        expect(jsonLd).not.toBeNull();
        expect(typeof jsonLd).toBe("object");
      }
    });

    test("All @graph entities have @type", () => {
      const entities = getEntities(
        extractJsonLd(site.getOutput("/index.html")),
      );

      for (const entity of entities) {
        expect(entity["@type"]).toBeDefined();
        expect(typeof entity["@type"]).toBe("string");
      }
    });
  });

  // --- Edge Cases ---

  describe("edge cases", () => {
    test("JSON-LD handles special characters in title", async () => {
      await withTestSite(
        {
          files: [
            newsFile("special-chars", 'Test "Quotes" & Ampersands', {
              description: 'A post with special chars: <tag> & "quotes"',
            }),
          ],
          images: ["placeholder.jpg"],
        },
        async (site) => {
          const html = site.getOutput("/news/special-chars/index.html");
          const jsonLd = extractJsonLd(html);

          expect(jsonLd).not.toBeNull();
          expect(validateContext(jsonLd).valid).toBe(true);
          await assertSchemaOrgValid(html, "Special chars");
        },
      );
    });

    test("Product without price has valid JSON-LD", async () => {
      await withTestSite(
        {
          files: [
            productFile("free-product", "Free Product", {
              description: "A free product",
            }),
          ],
          images: ["placeholder.jpg"],
        },
        async (site) => {
          const html = site.getOutput("/products/free-product/index.html");
          const jsonLd = extractJsonLd(html);
          const product = findEntityByType(jsonLd, "Product");

          expect(jsonLd).not.toBeNull();
          expect(product).not.toBeNull();
          expect(product["@type"]).toBe("Product");
          await assertSchemaOrgValid(html, "Free product");
        },
      );
    });

    test("Page without header_image has valid JSON-LD", async () => {
      await withTestSite(
        {
          files: [
            createFile(
              "pages/simple.md",
              {
                title: "Simple Page",
                layout: "page",
                permalink: "/simple/",
                meta_description: "A simple page without image",
              },
              "# Simple\n\nNo image here.",
            ),
          ],
        },
        async (site) => {
          const html = site.getOutput("/simple/index.html");
          const jsonLd = extractJsonLd(html);

          expect(jsonLd).not.toBeNull();
          expect(validateContext(jsonLd).valid).toBe(true);
          await assertSchemaOrgValid(html, "No image");
        },
      );
    });
  });

  // --- Production Site Validation ---
  // Tests actual built site output (requires `bun run build` first)

  describe("production site validation", () => {
    const siteDir = path.join(rootDir, "_site");

    // Recursively find all HTML files in a directory
    const findHtmlFiles = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return findHtmlFiles(fullPath);
        if (entry.name.endsWith(".html")) return [fullPath];
        return [];
      });

    // Get relative path for display
    const relativePath = (filePath) =>
      filePath.replace(siteDir, "").replace(/^\//, "");

    test("all production pages have valid JSON-LD structure", () => {
      expect(fs.existsSync(siteDir)).toBe(true);

      const htmlFiles = findHtmlFiles(siteDir);
      expect(htmlFiles.length).toBeGreaterThan(0);

      const results = htmlFiles.map((filePath) => {
        const html = fs.readFileSync(filePath, "utf-8");
        const jsonLd = extractJsonLd(html);
        return {
          file: relativePath(filePath),
          hasJsonLd: jsonLd !== null,
          contextValid: jsonLd ? validateContext(jsonLd).valid : null,
          error: jsonLd ? validateContext(jsonLd).error : "No JSON-LD found",
        };
      });

      // Pages with JSON-LD should have valid context
      const pagesWithJsonLd = results.filter((r) => r.hasJsonLd);
      const invalidContext = pagesWithJsonLd.filter((r) => !r.contextValid);

      if (invalidContext.length > 0) {
        console.log("Pages with invalid JSON-LD context:");
        for (const r of invalidContext) {
          console.log(`  ${r.file}: ${r.error}`);
        }
      }

      expect(invalidContext.length).toBe(0);
    });

    test("all production pages validate against schema.org", async () => {
      expect(fs.existsSync(siteDir)).toBe(true);

      const htmlFiles = findHtmlFiles(siteDir);

      // Only validate pages with JSON-LD
      const pagesWithJsonLd = htmlFiles.filter((filePath) => {
        const html = fs.readFileSync(filePath, "utf-8");
        return extractJsonLd(html) !== null;
      });

      const validationResults = await Promise.all(
        pagesWithJsonLd.map(async (filePath) => {
          const html = fs.readFileSync(filePath, "utf-8");
          const result = await validateWithSchemaOrg(html);
          return {
            file: relativePath(filePath),
            valid: result.valid,
            errors: result.errors,
          };
        }),
      );

      const invalidPages = validationResults.filter((r) => !r.valid);

      if (invalidPages.length > 0) {
        console.log("\nPages with invalid schema.org data:");
        for (const r of invalidPages) {
          console.log(`\n  ${r.file}:`);
          for (const e of r.errors.slice(0, 3)) {
            console.log(`    - ${e}`);
          }
          if (r.errors.length > 3) {
            console.log(`    ... and ${r.errors.length - 3} more errors`);
          }
        }
      }

      expect(invalidPages.length).toBe(0);
    });
  });
});
