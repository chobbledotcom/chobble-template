import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestSite, withTestSite } from "#test/test-site-factory.js";

/**
 * JSON-LD Validation Tests
 *
 * These tests validate that rendered pages contain valid JSON-LD structured data
 * that conforms to schema.org specifications. This helps prevent Google Search Console
 * warnings about invalid structured data.
 *
 * Validates:
 * - JSON-LD is valid JSON and parseable
 * - Required @context is present and correct
 * - @graph structure is present
 * - Required properties for each schema type are included
 * - Cross-referencing with @id works correctly
 */

// ============================================
// Helper Functions
// ============================================

/**
 * Extract JSON-LD data from HTML string
 * @param {string} html - The full HTML content
 * @returns {Object|null} Parsed JSON-LD object or null if not found
 */
const extractJsonLd = (html) => {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

/**
 * Get all entities from JSON-LD @graph
 * @param {Object} jsonLd - The JSON-LD object
 * @returns {Array} Array of entities from @graph or single entity
 */
const getEntities = (jsonLd) => {
  if (!jsonLd) return [];
  if (jsonLd["@graph"]) return jsonLd["@graph"];
  return [jsonLd];
};

/**
 * Find entity by @type in JSON-LD
 * @param {Object} jsonLd - The JSON-LD object
 * @param {string} type - The @type to find
 * @returns {Object|null} The entity or null
 */
const findEntityByType = (jsonLd, type) => {
  const entities = getEntities(jsonLd);
  return entities.find((e) => e["@type"] === type) || null;
};

/**
 * Validate JSON-LD has valid @context
 * @param {Object} jsonLd - The JSON-LD object
 * @returns {{valid: boolean, error: string|null}}
 */
const validateContext = (jsonLd) => {
  if (!jsonLd) {
    return { valid: false, error: "No JSON-LD found" };
  }
  if (!jsonLd["@context"]) {
    return { valid: false, error: "Missing @context" };
  }
  const context = jsonLd["@context"];
  const validContexts = [
    "https://schema.org",
    "http://schema.org/",
    "https://schema.org/",
  ];
  if (!validContexts.includes(context)) {
    return { valid: false, error: `Invalid @context: ${context}` };
  }
  return { valid: true, error: null };
};

/**
 * Check if entity has required properties for its type
 * Based on Google's Rich Results requirements
 */
const validateEntityProperties = (entity, type) => {
  const errors = [];

  if (!entity) {
    return { valid: false, errors: [`No ${type} entity found`] };
  }

  if (entity["@type"] !== type) {
    errors.push(`Expected @type "${type}", got "${entity["@type"]}"`);
  }

  // Required properties by type (based on Google Rich Results requirements)
  const requiredByType = {
    Organization: ["name", "url"],
    WebSite: ["name", "url"],
    Product: ["image"],
    BlogPosting: ["publisher"],
    WebPage: [],
    Event: [],
  };

  const required = requiredByType[type] || [];
  for (const prop of required) {
    if (!entity[prop]) {
      errors.push(`Missing required property: ${prop}`);
    }
  }

  return { valid: errors.length === 0, errors };
};

// ============================================
// Test Fixtures
// ============================================

/**
 * Create a product page file for test site
 * Note: header_image must use src/images/ prefix for eleventyComputed to find it
 */
const productFile = (slug, title, options = {}) => ({
  path: `products/${slug}.md`,
  frontmatter: {
    title,
    tags: ["product"],
    ...(options.price && { price: options.price }),
    header_image: options.image
      ? `src/images/${options.image}`
      : "src/images/placeholder.jpg",
    meta_description: options.description || `Description for ${title}`,
    ...options.extra,
  },
  content: options.content || `# ${title}\n\nProduct content.`,
});

/**
 * Create a news post file for test site
 * Note: header_image must use src/images/ prefix for eleventyComputed to find it
 */
const newsFile = (slug, title, options = {}) => ({
  path: `news/2024-01-01-${slug}.md`,
  frontmatter: {
    title,
    ...(options.author && { author: options.author }),
    header_image: options.image
      ? `src/images/${options.image}`
      : "src/images/placeholder.jpg",
    meta_description: options.description || `Description for ${title}`,
    ...options.extra,
  },
  content: options.content || `# ${title}\n\nNews content.`,
});

/**
 * Create a regular page file for test site
 */
const pageFile = (slug, title, options = {}) => ({
  path: `pages/${slug}.md`,
  frontmatter: {
    title,
    layout: options.layout || "page",
    permalink: options.permalink || `/${slug}/`,
    meta_description: options.description || `Description for ${title}`,
    ...options.extra,
  },
  content: options.content || `# ${title}\n\nPage content.`,
});

// ============================================
// Tests
// ============================================

describe("JSON-LD structured data validation", () => {
  // Use a shared site for most tests to minimize build time
  describe("comprehensive validation", () => {
    let site;

    beforeAll(async () => {
      site = await createTestSite({
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
          // Product page
          productFile("test-product", "Test Product", {
            price: "£49.99",
            description: "A wonderful test product",
          }),
          // News post
          newsFile("test-post", "Test News Post", {
            description: "An important news update",
          }),
          // Home page
          {
            path: "pages/index.md",
            frontmatter: {
              title: "Welcome",
              layout: "home",
              permalink: "/",
              meta_description: "Welcome to our test site",
            },
            content: "# Welcome\n\nHome page content.",
          },
          // Contact page
          {
            path: "pages/contact.md",
            frontmatter: {
              title: "Contact Us",
              layout: "contact",
              permalink: "/contact/",
              meta_description: "Get in touch with us",
            },
            content: "# Contact\n\nContact page content.",
          },
          // Regular page
          pageFile("about", "About Us", {
            description: "Learn about our company",
          }),
        ],
        images: ["placeholder.jpg"],
      });
      await site.build();
    });

    afterAll(() => site?.cleanup());

    // --- Basic JSON-LD Structure Tests ---

    test("Product page contains valid JSON-LD", () => {
      const html = site.getOutput("/products/test-product/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
      expect(Array.isArray(jsonLd["@graph"])).toBe(true);
    });

    test("News post contains valid JSON-LD", () => {
      const html = site.getOutput("/news/test-post/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
    });

    test("Home page contains valid JSON-LD", () => {
      const html = site.getOutput("/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
    });

    test("Contact page contains valid JSON-LD", () => {
      const html = site.getOutput("/contact/index.html");
      const jsonLd = extractJsonLd(html);

      expect(jsonLd).not.toBeNull();
      expect(validateContext(jsonLd).valid).toBe(true);
      expect(jsonLd["@graph"]).toBeDefined();
    });

    // --- Organization Schema Tests ---

    test("All pages include Organization entity with required properties", () => {
      const pages = [
        "/products/test-product/index.html",
        "/news/test-post/index.html",
        "/index.html",
        "/contact/index.html",
        "/about/index.html",
      ];

      for (const pagePath of pages) {
        const html = site.getOutput(pagePath);
        const jsonLd = extractJsonLd(html);
        const org = findEntityByType(jsonLd, "Organization");
        const result = validateEntityProperties(org, "Organization");

        expect(result.valid).toBe(true);
      }
    });

    test("Organization entity has proper @id for cross-referencing", () => {
      const html = site.getOutput("/index.html");
      const jsonLd = extractJsonLd(html);
      const org = findEntityByType(jsonLd, "Organization");

      expect(org["@id"]).toBeDefined();
      expect(org["@id"]).toContain("#organization");
    });

    // --- WebSite Schema Tests ---

    test("All pages include WebSite entity with required properties", () => {
      const pages = [
        "/products/test-product/index.html",
        "/news/test-post/index.html",
        "/index.html",
      ];

      for (const pagePath of pages) {
        const html = site.getOutput(pagePath);
        const jsonLd = extractJsonLd(html);
        const website = findEntityByType(jsonLd, "WebSite");
        const result = validateEntityProperties(website, "WebSite");

        expect(result.valid).toBe(true);
      }
    });

    test("WebSite entity has proper @id for cross-referencing", () => {
      const html = site.getOutput("/index.html");
      const jsonLd = extractJsonLd(html);
      const website = findEntityByType(jsonLd, "WebSite");

      expect(website["@id"]).toBeDefined();
      expect(website["@id"]).toContain("#website");
    });

    // --- Product Schema Tests ---

    test("Product page includes Product entity with required properties", () => {
      const html = site.getOutput("/products/test-product/index.html");
      const jsonLd = extractJsonLd(html);
      const product = findEntityByType(jsonLd, "Product");
      const result = validateEntityProperties(product, "Product");

      expect(result.valid).toBe(true);
    });

    test("Product entity has image property", () => {
      const html = site.getOutput("/products/test-product/index.html");
      const jsonLd = extractJsonLd(html);
      const product = findEntityByType(jsonLd, "Product");

      expect(product.image).toBeDefined();
      expect(typeof product.image === "string").toBe(true);
    });

    // --- BlogPosting Schema Tests ---

    test("News post includes BlogPosting entity with required properties", () => {
      const html = site.getOutput("/news/test-post/index.html");
      const jsonLd = extractJsonLd(html);
      const post = findEntityByType(jsonLd, "BlogPosting");
      const result = validateEntityProperties(post, "BlogPosting");

      expect(result.valid).toBe(true);
    });

    test("BlogPosting includes publisher with @type Organization", () => {
      const html = site.getOutput("/news/test-post/index.html");
      const jsonLd = extractJsonLd(html);
      const post = findEntityByType(jsonLd, "BlogPosting");

      expect(post.publisher).toBeDefined();
      expect(post.publisher["@type"]).toBe("Organization");
    });

    test("BlogPosting references website via isPartOf", () => {
      const html = site.getOutput("/news/test-post/index.html");
      const jsonLd = extractJsonLd(html);
      const post = findEntityByType(jsonLd, "BlogPosting");

      expect(post.isPartOf).toBeDefined();
      expect(post.isPartOf["@id"]).toContain("#website");
    });

    // --- WebPage Schema Tests ---

    test("Regular page includes WebPage entity", () => {
      const html = site.getOutput("/about/index.html");
      const jsonLd = extractJsonLd(html);
      const page = findEntityByType(jsonLd, "WebPage");

      expect(page).not.toBeNull();
      expect(page["@type"]).toBe("WebPage");
    });

    // --- @context validation ---

    test("JSON-LD uses https://schema.org context", () => {
      const pages = [
        "/products/test-product/index.html",
        "/news/test-post/index.html",
        "/index.html",
      ];

      for (const pagePath of pages) {
        const html = site.getOutput(pagePath);
        const jsonLd = extractJsonLd(html);

        expect(jsonLd["@context"]).toBe("https://schema.org");
      }
    });

    // --- JSON Structure Tests ---

    test("JSON-LD is valid parseable JSON", () => {
      const pages = [
        "/products/test-product/index.html",
        "/news/test-post/index.html",
        "/index.html",
        "/contact/index.html",
        "/about/index.html",
      ];

      for (const pagePath of pages) {
        const html = site.getOutput(pagePath);
        const jsonLd = extractJsonLd(html);

        expect(jsonLd).not.toBeNull();
        expect(typeof jsonLd).toBe("object");
      }
    });

    test("All @graph entities have @type", () => {
      const html = site.getOutput("/index.html");
      const jsonLd = extractJsonLd(html);
      const entities = getEntities(jsonLd);

      for (const entity of entities) {
        expect(entity["@type"]).toBeDefined();
        expect(typeof entity["@type"]).toBe("string");
      }
    });
  });

  // --- Edge Cases ---

  describe("edge cases", () => {
    test("JSON-LD is parseable with special characters in title", async () => {
      await withTestSite(
        {
          files: [
            newsFile("special-chars", 'Test "Quotes" & Ampersands', {
              description: 'A post with special chars: <tag> & "quotes"',
            }),
          ],
          images: ["placeholder.jpg"],
        },
        (site) => {
          const html = site.getOutput("/news/special-chars/index.html");
          const jsonLd = extractJsonLd(html);

          expect(jsonLd).not.toBeNull();
          expect(validateContext(jsonLd).valid).toBe(true);
        },
      );
    });

    test("Product without price still has valid JSON-LD structure", async () => {
      await withTestSite(
        {
          files: [
            productFile("free-product", "Free Product", {
              description: "A free product",
            }),
          ],
          images: ["placeholder.jpg"],
        },
        (site) => {
          const html = site.getOutput("/products/free-product/index.html");
          const jsonLd = extractJsonLd(html);
          const product = findEntityByType(jsonLd, "Product");

          expect(jsonLd).not.toBeNull();
          expect(product).not.toBeNull();
          expect(product["@type"]).toBe("Product");
        },
      );
    });

    test("Page without header_image still generates valid JSON-LD", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/simple.md",
              frontmatter: {
                title: "Simple Page",
                layout: "page",
                permalink: "/simple/",
                meta_description: "A simple page without image",
              },
              content: "# Simple\n\nNo image here.",
            },
          ],
        },
        (site) => {
          const html = site.getOutput("/simple/index.html");
          const jsonLd = extractJsonLd(html);

          expect(jsonLd).not.toBeNull();
          expect(validateContext(jsonLd).valid).toBe(true);
        },
      );
    });
  });
});
