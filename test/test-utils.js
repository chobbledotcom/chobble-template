import { expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Window } from "happy-dom";
import { map } from "#utils/array-utils.js";
import { ROOT_DIR, SRC_DIR } from "../src/_lib/paths.js";

// JSDOM-compatible wrapper for happy-dom
class DOM {
  constructor(html = "", _options = {}) {
    this.window = new Window({ url: _options.url || "http://localhost" });
    if (html) {
      this.window.document.write(html);
    }
  }

  serialize() {
    return this.window.document.documentElement.outerHTML;
  }
}

const rootDir = ROOT_DIR;
const srcDir = SRC_DIR;

// Directories always skipped during file discovery
const ALWAYS_SKIP = new Set([
  "node_modules",
  ".git",
  "_site",
  ".test-sites",
  "result", // Nix build output symlink
]);

// Define createMockEleventyConfig BEFORE getFiles() to avoid TDZ issues
// when getFiles() triggers circular imports during module initialization
const createMockEleventyConfig = () => ({
  addPlugin: function (plugin, config) {
    this.pluginCalls = this.pluginCalls || [];
    this.pluginCalls.push({ plugin, config });
  },
  addCollection: function (name, fn) {
    this.collections = this.collections || {};
    this.collections[name] = fn;
  },
  addFilter: function (name, fn) {
    this.filters = this.filters || {};
    this.filters[name] = fn;
  },
  addAsyncFilter: function (name, fn) {
    this.asyncFilters = this.asyncFilters || {};
    this.asyncFilters[name] = fn;
  },
  addShortcode: function (name, fn) {
    this.shortcodes = this.shortcodes || {};
    this.shortcodes[name] = fn;
  },
  addAsyncShortcode: function (name, fn) {
    this.asyncShortcodes = this.asyncShortcodes || {};
    this.asyncShortcodes[name] = fn;
  },
  addTemplateFormats: function (format) {
    this.templateFormats = this.templateFormats || [];
    this.templateFormats.push(format);
  },
  addExtension: function (ext, config) {
    this.extensions = this.extensions || {};
    this.extensions[ext] = config;
  },
  addTransform: function (name, fn) {
    this.transforms = this.transforms || {};
    this.transforms[name] = fn;
  },
  setLayoutsDirectory: function (dir) {
    this.layoutsDirectory = dir;
  },
  addWatchTarget: function (target) {
    this.watchTargets = this.watchTargets || [];
    this.watchTargets.push(target);
  },
  addPassthroughCopy: function (path) {
    this.passthroughCopies = this.passthroughCopies || [];
    this.passthroughCopies.push(path);
  },
  on: function (eventName, handler) {
    this.eventHandlers = this.eventHandlers || {};
    this.eventHandlers[eventName] = handler;
  },
  resolvePlugin: (pluginName) => {
    // Return a mock plugin function that does nothing
    return function mockPlugin(config, _options) {
      // Mock HTML Base plugin - adds filters that tests might need
      if (pluginName === "@11ty/eleventy/html-base-plugin") {
        config.addFilter("htmlBaseUrl", (url, base) => {
          if (base && url && !url.startsWith("http")) {
            return base + url;
          }
          return url;
        });
        config.addAsyncFilter(
          "transformWithHtmlBase",
          async (content, _base) => {
            return content; // Just return content unchanged in tests
          },
        );
      }
    };
  },
  pathPrefix: "/",
});

/**
 * Get all files matching a pattern from the project root.
 * Returns relative paths from root that match the regex.
 */
const getFiles = (pattern) => {
  const results = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      // Skip hidden files, known skip dirs, and temp test directories
      if (
        entry.startsWith(".") ||
        entry.startsWith("temp-") ||
        ALWAYS_SKIP.has(entry)
      )
        continue;

      const fullPath = path.join(dir, entry);
      const relativePath = path.relative(rootDir, fullPath);

      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (pattern.test(relativePath)) {
        results.push(relativePath);
      }
    }
  };

  walk(rootDir);
  return results;
};

// Memoized file list getter - defers getFiles() call until first use
// to avoid TDZ issues during circular imports at module load time
const memoize = (fn) => {
  let value;
  let computed = false;
  return () => {
    if (computed === false) {
      value = fn();
      computed = true;
    }
    return value;
  };
};

const SRC_JS_FILES = memoize(() => getFiles(/^src\/.*\.js$/));
const ECOMMERCE_JS_FILES = memoize(() =>
  getFiles(/^ecommerce-backend\/.*\.js$/),
);
const SRC_HTML_FILES = memoize(() =>
  getFiles(/^src\/(_includes|_layouts)\/.*\.html$/),
);
const SRC_SCSS_FILES = memoize(() => getFiles(/^src\/css\/.*\.scss$/));
const TEST_FILES = memoize(() => getFiles(/^test\/.*\.test\.js$/));
const ALL_JS_FILES = memoize(() =>
  getFiles(/^(src|ecommerce-backend|test)\/.*\.js$/),
);

// Console capture utilities for testing output
const captureConsoleLog = (fn) => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  fn();
  console.log = originalLog;
  return logs;
};

const captureConsoleLogAsync = async (fn) => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  await fn();
  console.log = originalLog;
  return logs;
};

const createTempDir = (testName, suffix = "") => {
  const dirName = `temp-${testName}${suffix ? `-${suffix}` : ""}`;
  const tempDir = path.join(__dirname, dirName);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
};

const createTempFile = (dir, filename, content) => {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const createTempSnippetsDir = (testName) => {
  const tempDir = createTempDir(testName);
  const snippetsDir = path.join(tempDir, "src/snippets");
  fs.mkdirSync(snippetsDir, { recursive: true });
  return { tempDir, snippetsDir };
};

const cleanupTempDir = (tempDir) => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const withTempDir = (testName, callback) => {
  const tempDir = createTempDir(testName);
  const result = callback(tempDir);
  cleanupTempDir(tempDir);
  return result;
};

const withTempFile = (testName, filename, content, callback) => {
  return withTempDir(testName, (tempDir) => {
    const filePath = createTempFile(tempDir, filename, content);
    return callback(tempDir, filePath);
  });
};

const withMockedCwd = (newCwd, callback) => {
  const originalCwd = process.cwd;
  process.cwd = () => newCwd;
  const result = callback();
  process.cwd = originalCwd;
  return result;
};

/**
 * Assert that a result array has expected titles in order.
 * A functional, declarative helper for the common pattern of checking
 * result.length and result[i].data.title across collection tests.
 *
 * @param {Array} result - Array of items with data.title properties
 * @param {Array<string>} expectedTitles - Titles in expected order
 */
const expectResultTitles = (result, expectedTitles) => {
  expect(result.length).toBe(expectedTitles.length);
  expectedTitles.forEach((title, i) => {
    expect(result[i].data.title).toBe(title);
  });
};

// ============================================
// Test Fixture Factories
// ============================================

// ----------------------------------------
// Generic Item Builder
// ----------------------------------------

/**
 * Create a collection item with nested data structure.
 * This is the universal builder for products, properties, events, pages, etc.
 * All collection items share this pattern: { data: { title?, ...options } }
 *
 * @param {string|null} title - Item title (null/undefined to omit title)
 * @param {Object} options - Additional data (categories, featured, filter_attributes, etc.)
 * @returns {Object} Item with { data: { title?, ...options } }
 *
 * @example
 * item("My Product", { categories: ["widgets"], featured: true })
 * item("Beach House", { locations: ["coast"], filter_attributes: [...] })
 * item(null, { filter_attributes: [attr("Size", "Large")] })
 */
const item = (title, options = {}) => ({
  data: {
    ...(title && { title }),
    ...options,
  },
});

/**
 * Create items from an array of [title, options] tuples.
 * Curried for use with pipe.
 *
 * @example
 * items([
 *   ["Product 1", { categories: ["widgets"] }],
 *   ["Product 2", { featured: true }],
 * ])
 */
const items = map(([title, options]) => item(title, options));

// ----------------------------------------
// Frontmatter helpers
// ----------------------------------------

const createFrontmatter = (frontmatterData, content = "") =>
  matter.stringify(content, frontmatterData);

// Date helpers
const createOffsetDate = (daysOffset = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
};

const formatDateString = (date) => date.toISOString().split("T")[0];

/**
 * Unified event fixture factory using functional options pattern.
 *
 * @param {Object} options
 * @param {string} [options.title] - Event title (defaults based on event type)
 * @param {Date} [options.date] - Explicit date for the event
 * @param {number} [options.daysOffset=30] - Days from today (positive=future, negative=past)
 * @param {string} [options.recurring] - Recurring date string (e.g., "Every Monday")
 * @returns {Object} Event fixture with { data: { title, event_date|recurring_date, ... } }
 */
const createEvent = ({
  title,
  date,
  daysOffset = 30,
  recurring,
  ...extraData
} = {}) => {
  if (recurring !== undefined) {
    return {
      data: {
        title: title ?? "Recurring Event",
        recurring_date: recurring,
        ...extraData,
      },
    };
  }

  const eventDate = date ?? createOffsetDate(daysOffset);

  return {
    data: {
      title: title ?? (daysOffset < 0 ? "Past Event" : "Future Event"),
      event_date:
        eventDate instanceof Date ? formatDateString(eventDate) : eventDate,
      ...extraData,
    },
  };
};

/**
 * Create multiple events from an array of options.
 * Functional composition using curried map.
 *
 * @param {Array<Object>} optionsArray - Array of createEvent option objects
 * @returns {Array<Object>} Array of event fixtures
 *
 * @example
 * createEvents([
 *   { title: "Event 1", daysOffset: 30 },
 *   { title: "Event 2", daysOffset: -30 },
 *   { recurring: "Every Monday" }
 * ])
 */
const createEvents = map(createEvent);

// Category fixtures
const createCategory = (slug, headerImage = null, extraData = {}) => ({
  fileSlug: slug,
  data: {
    header_image: headerImage,
    ...extraData,
  },
});

// Product fixtures
const createProduct = ({
  slug = null,
  title = "Test Product",
  categories = [],
  order = 0,
  headerImage = null,
  ...extraData
} = {}) => ({
  ...(slug && { fileSlug: slug }),
  data: {
    title,
    categories,
    order,
    header_image: headerImage,
    ...extraData,
  },
});

// Collection item fixtures (for navigation tests)
const createCollectionItem = (slug, url, tags = [], extraData = {}) => ({
  fileSlug: slug,
  url,
  data: {
    tags,
    ...extraData,
  },
});

// ============================================
// Code Analysis Utilities
// ============================================

/**
 * Create a pattern extractor for files.
 * Curried: (pattern, transform) => (files) => Set
 * @param {RegExp} pattern - Regex with capture group
 * @param {function} [transform] - Transform match to value (default: m => m[1])
 * @returns {function} - files => Set of extracted values
 */
const createExtractor =
  (pattern, transform = (m) => m[1]) =>
  (files) => {
    const fileList = Array.isArray(files) ? files : [files];
    const results = new Set();

    for (const file of fileList) {
      const content = fs.readFileSync(file, "utf-8");
      for (const match of content.matchAll(pattern)) {
        results.add(transform(match));
      }
    }

    return results;
  };

/**
 * Extract all function definitions from JavaScript source code.
 * Uses a stack to properly handle nested functions.
 * Returns an array of { name, startLine, endLine, lineCount }.
 */
const extractFunctions = (source) => {
  const functions = [];
  const lines = source.split("\n");
  const stack = []; // Stack of { name, startLine, braceDepth }

  let globalBraceDepth = 0;
  let inString = false;
  let stringChar = null;
  let inTemplate = false;
  let inMultilineComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for function start patterns
    const funcDeclMatch = line.match(
      /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
    );
    // Only match arrow functions with braces (multi-line bodies)
    const arrowMatch = line.match(
      /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/,
    );
    const methodMatch = line.match(
      /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/,
    );
    const objMethodMatch = line.match(
      /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?(?:function\s*)?\(/,
    );

    const match = funcDeclMatch || arrowMatch || methodMatch || objMethodMatch;

    if (match) {
      stack.push({
        name: match[1],
        startLine: lineNum,
        openBraceDepth: null, // Will be set when we see the opening brace
      });
    }

    // Process characters for brace counting
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : "";
      const nextChar = j < line.length - 1 ? line[j + 1] : "";

      // Handle comments
      if (!inString && !inTemplate) {
        if (char === "/" && nextChar === "/" && !inMultilineComment) break;
        if (char === "/" && nextChar === "*" && !inMultilineComment) {
          inMultilineComment = true;
          j++;
          continue;
        }
        if (char === "*" && nextChar === "/" && inMultilineComment) {
          inMultilineComment = false;
          j++;
          continue;
        }
      }
      if (inMultilineComment) continue;

      // Handle strings
      if (!inTemplate && (char === '"' || char === "'") && prevChar !== "\\") {
        if (inString === false) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
        continue;
      }

      // Handle template literals
      if (char === "`" && prevChar !== "\\") {
        inTemplate = !inTemplate;
        continue;
      }

      if (inString) continue;

      // Count braces
      if (char === "{") {
        globalBraceDepth++;
        // Record opening brace depth for pending functions
        for (const item of stack) {
          if (item.openBraceDepth === null) {
            item.openBraceDepth = globalBraceDepth;
          }
        }
      } else if (char === "}") {
        // Check if this closes any function on the stack
        for (let k = stack.length - 1; k >= 0; k--) {
          if (stack[k].openBraceDepth === globalBraceDepth) {
            const completed = stack.splice(k, 1)[0];
            functions.push({
              name: completed.name,
              startLine: completed.startLine,
              endLine: lineNum,
              lineCount: lineNum - completed.startLine + 1,
            });
            break;
          }
        }
        globalBraceDepth--;
      }
    }
  }

  return functions;
};

// Schema-helper test fixtures
const createSchemaPage = ({
  url = "/page/",
  fileSlug = null,
  date = null,
} = {}) => {
  const page = { url };
  if (fileSlug) page.fileSlug = fileSlug;
  if (date) page.date = date;
  return page;
};

const createSchemaSite = ({
  url = "https://example.com",
  name = "Test Site",
  logo = null,
} = {}) => {
  const site = { url, name };
  if (logo) site.logo = logo;
  return site;
};

const createSchemaData = (options = {}) => {
  const {
    pageUrl = "/page/",
    pageFileSlug = null,
    pageDate = null,
    siteUrl = "https://example.com",
    siteName = "Test Site",
    siteLogo = null,
    ...extraData
  } = options;
  const data = {
    page: createSchemaPage({
      url: pageUrl,
      fileSlug: pageFileSlug,
      date: pageDate,
    }),
    site: createSchemaSite({ url: siteUrl, name: siteName, logo: siteLogo }),
    ...extraData,
  };
  // Only add title if not explicitly set to undefined
  if (!("title" in options) || options.title !== undefined) {
    data.title = options.title ?? "Test";
  }
  return data;
};

const createProductSchemaData = ({
  fileSlug = "test",
  title = "Test Product",
  siteName = "Test Store",
  price = null,
  reviews = null,
  reviewsField = null,
  ...extraData
} = {}) => {
  const data = createSchemaData({
    pageUrl: `/products/${fileSlug}/`,
    pageFileSlug: fileSlug,
    title,
    siteName,
    ...extraData,
  });
  if (price) data.price = price;
  if (reviews && reviewsField) {
    data.collections = { reviews };
    data.reviewsField = reviewsField;
  }
  return data;
};

const createPostSchemaData = ({
  title = "Test Post",
  author = null,
  date = new Date("2024-03-15"),
  siteName = "Test Site",
  siteLogo = null,
  ...extraData
} = {}) => {
  const data = createSchemaData({
    pageUrl: "/news/test-post/",
    pageDate: date,
    title,
    siteName,
    siteLogo,
    ...extraData,
  });
  if (author) data.author = author;
  return data;
};

const createMockReview = ({
  name = "Reviewer",
  rating = 5,
  field = "products",
  items = ["test"],
  date = new Date("2024-01-15"),
} = {}) => ({
  data: { name, rating, [field]: items },
  date,
});

// ============================================
// Mock Collection API Helpers
// ============================================

/**
 * Create a mock collection API that returns items for any tag.
 * Simple version with no tag assertion.
 *
 * @param {Array} items - Items to return from getFilteredByTag
 * @returns {Object} Mock collection API with getFilteredByTag method
 *
 * @example
 * const api = collectionApi([product1, product2]);
 * createProductsCollection(api);
 */
const collectionApi = (items) => ({
  getFilteredByTag: () => items,
});

/**
 * Create a mock collection API that returns different items based on tag.
 * Uses an object map for clean multi-tag scenarios.
 *
 * @param {Object} tagMap - Map of tag names to item arrays
 * @returns {Object} Mock collection API with getFilteredByTag method
 *
 * @example
 * const api = taggedCollectionApi({
 *   product: [product1, product2],
 *   review: [review1],
 *   category: []
 * });
 */
const taggedCollectionApi = (tagMap) => ({
  getFilteredByTag: (tag) => tagMap[tag] ?? [],
});

export {
  DOM,
  expect,
  fs,
  path,
  rootDir,
  srcDir,
  getFiles,
  SRC_JS_FILES,
  ECOMMERCE_JS_FILES,
  SRC_HTML_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
  ALL_JS_FILES,
  createMockEleventyConfig,
  captureConsoleLog,
  captureConsoleLogAsync,
  createTempDir,
  createTempFile,
  createTempSnippetsDir,
  cleanupTempDir,
  withTempDir,
  withTempFile,
  withMockedCwd,
  expectResultTitles,
  // Generic item builder
  item,
  items,
  // Test fixture factories
  createFrontmatter,
  createOffsetDate,
  formatDateString,
  createEvent,
  createEvents,
  createCategory,
  createProduct,
  createCollectionItem,
  // Schema-helper fixtures
  createSchemaPage,
  createSchemaSite,
  createSchemaData,
  createProductSchemaData,
  createPostSchemaData,
  createMockReview,
  // Code analysis utilities
  createExtractor,
  extractFunctions,
  // Mock collection API helpers
  collectionApi,
  taggedCollectionApi,
};
