import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { configureCollectionValidation } from "#eleventy/validate-collections.js";
import { createMockEleventyConfig, withTempDir } from "#test/test-utils.js";

/**
 * Helper: set up the plugin and return the eleventy.before handler.
 */
const getHandler = (srcDir) => {
  const mockConfig = createMockEleventyConfig();
  configureCollectionValidation(mockConfig, srcDir);
  return mockConfig.eventHandlers["eleventy.before"];
};

/**
 * Helper: create a file inside a temp directory, creating parent dirs.
 */
const writeFile = (base, relativePath, content) => {
  const fullPath = path.join(base, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
};

describe("configureCollectionValidation", () => {
  test("registers an eleventy.before event handler", () => {
    const mockConfig = createMockEleventyConfig();
    configureCollectionValidation(mockConfig);
    expect(mockConfig.eventHandlers["eleventy.before"]).toBeDefined();
  });

  test("does not throw when all collection references are registered", () => {
    withTempDir("valid-collections", (tempDir) => {
      writeFile(
        tempDir,
        "collections/collections.js",
        'eleventyConfig.addCollection("products", fn);',
      );
      writeFile(
        tempDir,
        "pages/index.html",
        "<p>{{ collections.products.size }}</p>",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });

  test("throws when template references an unregistered collection", () => {
    withTempDir("unregistered-collection", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(
        tempDir,
        "pages/index.html",
        "<p>{{ collections.nonexistent }}</p>",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).toThrow(/Unregistered collection references/);
    });
  });

  test("error message includes file path and line number", () => {
    withTempDir("error-details", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(
        tempDir,
        "pages/shop.html",
        "line one\n{{ collections.bogus }}\n",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).toThrow(/pages\/shop\.html:2/);
    });
  });

  test("error message includes the unregistered collection name", () => {
    withTempDir("error-name", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(tempDir, "views/page.html", "{{ collections.typoName }}");
      const handler = getHandler(tempDir);
      expect(() => handler()).toThrow(/collections\.typoName/);
    });
  });

  test("detects bracket notation references", () => {
    withTempDir("bracket-notation", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(tempDir, "views/page.html", '{{ collections["missing"] }}');
      const handler = getHandler(tempDir);
      expect(() => handler()).toThrow(/collections\.missing/);
    });
  });

  test("ignores collections.size and collections.length", () => {
    withTempDir("ignored-props", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(
        tempDir,
        "views/page.html",
        "{{ collections.size }}\n{{ collections.length }}",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });

  test("discovers tag-based collections from JSON directory data", () => {
    withTempDir("tag-collections", (tempDir) => {
      writeFile(tempDir, "team/team.json", '{ "tags": ["team"] }');
      writeFile(tempDir, "views/page.html", "{{ collections.team }}");
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });

  test("always includes the built-in 'all' collection", () => {
    withTempDir("builtin-all", (tempDir) => {
      writeFile(tempDir, "views/page.html", "{{ collections.all }}");
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });

  test("scans .liquid files for collection references", () => {
    withTempDir("liquid-files", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(tempDir, "views/page.liquid", "{{ collections.missing }}");
      const handler = getHandler(tempDir);
      expect(() => handler()).toThrow(/collections\.missing/);
    });
  });

  test("finds files in nested subdirectories", () => {
    withTempDir("nested-dirs", (tempDir) => {
      writeFile(tempDir, "app.js", "");
      writeFile(
        tempDir,
        "deeply/nested/dir/page.html",
        "{{ collections.deep }}",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).toThrow(/collections\.deep/);
    });
  });

  test("discovers filter-based collections from configure-filters.js", () => {
    withTempDir("filter-collections", (tempDir) => {
      writeFile(
        tempDir,
        "_lib/filters/configure-filters.js",
        'const config = { pages: "filteredByColor", redirects: "colorRedirects" };',
      );
      writeFile(
        tempDir,
        "views/page.html",
        "{{ collections.filteredByColor }}",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });

  test("discovers ListingFilterUI collections from filter names", () => {
    withTempDir("listing-filter-ui", (tempDir) => {
      writeFile(
        tempDir,
        "_lib/filters/configure-filters.js",
        'const config = { pages: "filteredBySize" };',
      );
      writeFile(
        tempDir,
        "views/page.html",
        "{{ collections.filteredBySizeListingFilterUI }}",
      );
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });

  test("works when configure-filters.js does not exist", () => {
    withTempDir("no-filters", (tempDir) => {
      writeFile(tempDir, "lib.js", '.addCollection("items", fn);');
      writeFile(tempDir, "views/page.html", "{{ collections.items }}");
      const handler = getHandler(tempDir);
      expect(() => handler()).not.toThrow();
    });
  });
});
