import { expect } from "bun:test";
import fs from "node:fs";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { Window } from "happy-dom";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const srcDir = resolve(rootDir, "src");

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
    if (!computed) {
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

// ============================================
// Assertion helpers using Bun's expect
// These provide a familiar API while using Bun's testing
// ============================================

const expectFunctionType = (obj, property, _message) => {
  if (property === undefined) {
    expect(typeof obj).toBe("function");
  } else {
    expect(obj).toBeDefined();
    expect(typeof obj[property]).toBe("function");
  }
};

const expectArrayLength = (arr, expectedLength, _message) => {
  expect(arr.length).toBe(expectedLength);
};

const expectObjectProperty = (obj, property, expectedValue, _message) => {
  expect(obj[property]).toBe(expectedValue);
};

const expectDeepEqual = (actual, expected, _message) => {
  expect(actual).toEqual(expected);
};

const expectStrictEqual = (actual, expected, _message) => {
  expect(actual).toBe(expected);
};

const expectTrue = (value, _message) => {
  expect(value).toBe(true);
};

const expectFalse = (value, _message) => {
  expect(value).toBe(false);
};

const expectThrows = (fn, errorMatcher, _message) => {
  expect(fn).toThrow(errorMatcher);
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

// Frontmatter helpers
const createFrontmatter = (frontmatterData, content = "") =>
  matter.stringify(content, frontmatterData);

// Date helpers
const createOffsetDate = (daysOffset = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
};

const formatDateString = (date) => date.toISOString().split("T")[0];

// Event fixtures
const createEvent = (title, eventDate, extraData = {}) => ({
  data: {
    title,
    event_date:
      eventDate instanceof Date ? formatDateString(eventDate) : eventDate,
    ...extraData,
  },
});

const createFutureEvent = (
  title = "Future Event",
  daysFromNow = 30,
  extraData = {},
) => createEvent(title, createOffsetDate(daysFromNow), extraData);

const createPastEvent = (title = "Past Event", daysAgo = 30, extraData = {}) =>
  createEvent(title, createOffsetDate(-daysAgo), extraData);

const createRecurringEvent = (
  title,
  recurringDate = "Every Monday",
  extraData = {},
) => ({
  data: {
    title,
    recurring_date: recurringDate,
    ...extraData,
  },
});

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
  title = "Test Product",
  categories = [],
  order = 0,
  headerImage = null,
  ...extraData
} = {}) => ({
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
  expectFunctionType,
  expectArrayLength,
  expectObjectProperty,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
  expectFalse,
  expectThrows,
  expectResultTitles,
  // Test fixture factories
  createFrontmatter,
  createOffsetDate,
  formatDateString,
  createEvent,
  createFutureEvent,
  createPastEvent,
  createRecurringEvent,
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
};
