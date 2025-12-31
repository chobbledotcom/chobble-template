import assert from "assert";
import fs from "fs";
import path, { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Directories always skipped during file discovery
const ALWAYS_SKIP = new Set(["node_modules", ".git", "_site"]);

/**
 * Get all files matching a pattern from the project root.
 * Returns relative paths from root that match the regex.
 */
const getFiles = (pattern) => {
  const results = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith(".") || ALWAYS_SKIP.has(entry)) continue;

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

// Pre-computed file lists for common test patterns
const SRC_JS_FILES = getFiles(/^src\/.*\.js$/);
const ECOMMERCE_JS_FILES = getFiles(/^ecommerce-backend\/.*\.js$/).filter(
  (f) => !f.endsWith(".test.js"),
);
const SRC_HTML_FILES = getFiles(/^src\/(_includes|_layouts)\/.*\.html$/);
const SRC_SCSS_FILES = getFiles(/^src\/css\/.*\.scss$/);
const TEST_FILES = getFiles(/^test\/.*\.test\.js$/);

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
  resolvePlugin: (pluginName) => {
    // Return a mock plugin function that does nothing
    return function mockPlugin(config, options) {
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
          async (content, base) => {
            return content; // Just return content unchanged in tests
          },
        );
      }
    };
  },
  pathPrefix: "/",
});

const createTempDir = (testName, suffix = "") => {
  const dirName = `temp-${testName}${suffix ? "-" + suffix : ""}`;
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
  try {
    return callback(tempDir);
  } finally {
    cleanupTempDir(tempDir);
  }
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
  try {
    return callback();
  } finally {
    process.cwd = originalCwd;
  }
};

const runTestSuite = async (testName, testCases) => {
  try {
    console.log(`=== Running ${testName} tests ===`);

    for (const testCase of testCases) {
      const testId = `${testName}/${testCase.name}`;

      try {
        if (testCase.test) {
          testCase.test();
        } else if (testCase.asyncTest) {
          await testCase.asyncTest();
        }
        console.log(`✅ PASS: ${testId} - ${testCase.description}`);
      } catch (error) {
        console.error(`❌ FAIL: ${testId} - ${testCase.description}`);
        console.error(`   Error: ${error.message}`);
        throw error;
      }
    }

    console.log(`\n✅ All ${testName} tests passed!`);
  } catch (error) {
    console.error(`❌ Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

const createTestRunner = (testName, testCases) => {
  const runTests = () => runTestSuite(testName, testCases);

  // Always run tests when module is loaded (for script execution)
  runTests();

  return { runTests };
};

const expectFunctionType = (obj, property, message) => {
  if (property === undefined) {
    // When property is undefined, we're checking if obj itself is a function
    assert.strictEqual(
      typeof obj,
      "function",
      message || `Should be a function`,
    );
  } else {
    assert.strictEqual(
      obj !== undefined && obj !== null,
      true,
      message || `Object should exist to check ${property}`,
    );
    assert.strictEqual(
      typeof obj[property],
      "function",
      message || `${property} should be a function`,
    );
  }
};

const expectArrayLength = (arr, expectedLength, message) => {
  assert.strictEqual(
    arr.length,
    expectedLength,
    message || `Array should have length ${expectedLength}`,
  );
};

const expectObjectProperty = (obj, property, expectedValue, message) => {
  assert.strictEqual(
    obj[property],
    expectedValue,
    message || `Property ${property} should equal ${expectedValue}`,
  );
};

const expectDeepEqual = (actual, expected, message) => {
  assert.deepStrictEqual(actual, expected, message);
};

const expectStrictEqual = (actual, expected, message) => {
  assert.strictEqual(actual, expected, message);
};

const expectTrue = (value, message) => {
  assert.strictEqual(value, true, message);
};

const expectFalse = (value, message) => {
  assert.strictEqual(value, false, message);
};

const expectThrows = (fn, errorMatcher, message) => {
  assert.throws(fn, errorMatcher, message);
};

// ============================================
// Test Fixture Factories
// ============================================

// Date helpers
const createFutureDate = (daysFromNow = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const createPastDate = (daysAgo = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
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
) => createEvent(title, createFutureDate(daysFromNow), extraData);

const createPastEvent = (title = "Past Event", daysAgo = 30, extraData = {}) =>
  createEvent(title, createPastDate(daysAgo), extraData);

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

export {
  assert,
  fs,
  path,
  rootDir,
  getFiles,
  SRC_JS_FILES,
  ECOMMERCE_JS_FILES,
  SRC_HTML_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
  createMockEleventyConfig,
  createTempDir,
  createTempFile,
  createTempSnippetsDir,
  cleanupTempDir,
  withTempDir,
  withTempFile,
  withMockedCwd,
  runTestSuite,
  createTestRunner,
  expectFunctionType,
  expectArrayLength,
  expectObjectProperty,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
  expectFalse,
  expectThrows,
  // Test fixture factories
  createFutureDate,
  createPastDate,
  formatDateString,
  createEvent,
  createFutureEvent,
  createPastEvent,
  createRecurringEvent,
  createCategory,
  createProduct,
  createCollectionItem,
};
