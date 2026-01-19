/**
 * Test utilities for chobble-template
 *
 * Re-exports generic utilities from @chobble/js-toolkit with project-specific
 * wrappers, plus Eleventy-specific test helpers.
 */
import { expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Window } from "happy-dom";
import { ROOT_DIR, SRC_DIR } from "#lib/paths.js";
import { map } from "#toolkit/fp/array.js";

// Test fixture helpers for creating Eleventy-style collection items
// (These are test-only utilities, not general FP functions)

/**
 * Pipeable data transform for creating test fixture collections.
 * Transforms arrays of value tuples into objects with a `data` property.
 */
const toData =
  (defaults) =>
  (...fields) =>
  (rows) =>
    rows.map((values) => ({
      data: {
        ...defaults,
        ...Object.fromEntries(fields.map((f, i) => [f, values[i]])),
      },
    }));

/**
 * Curried data transform for creating test fixture collections.
 * Creates a factory that transforms rows of values into Eleventy-style items.
 */
const data =
  (defaults) =>
  (...fields) =>
  (...rows) =>
    toData(defaults)(...fields)(rows);

import {
  expectArrayProp,
  expectAsyncThrows,
  expectDataArray,
  expectErrorsInclude,
  expectObjectProps,
  expectProp,
} from "#toolkit/test-utils/assertions.js";
import {
  ALWAYS_SKIP,
  extractFunctions,
  memoizedFileGetter,
  getFiles as toolkitGetFiles,
} from "#toolkit/test-utils/code-analysis.js";
import {
  captureConsole,
  captureConsoleLogAsync,
  createConsoleCapture,
  mockFetch,
  withMockFetch,
} from "#toolkit/test-utils/mocking.js";
// Import from toolkit for internal use and re-export
import {
  bracket,
  bracketAsync,
  cleanupTempDir,
  createTempFile,
  withMockedCwd,
  withMockedCwdAsync,
  withMockedProcessExit,
  withSubDir,
  withSubDirAsync,
} from "#toolkit/test-utils/resource.js";

// ============================================
// Project-specific path utilities
// ============================================

const rootDir = ROOT_DIR;
const srcDir = SRC_DIR;

// Wrap toolkit's createTempDir to use test directory (not cwd)
const createTempDir = (testName, suffix = "") => {
  const uniqueId = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 9)}`;
  const dirName = `temp-${testName}${suffix ? `-${suffix}` : ""}-${uniqueId}`;
  const tempDir = path.join(__dirname, dirName);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
};

const createTempSnippetsDir = (testName) => {
  const tempDir = createTempDir(testName);
  const snippetsDir = path.join(tempDir, "src/snippets");
  fs.mkdirSync(snippetsDir, { recursive: true });
  return { tempDir, snippetsDir };
};

// Create project-specific withTempDir functions using our createTempDir
const withTempDir = bracket(createTempDir, cleanupTempDir);
const withTempDirAsync = bracketAsync(createTempDir, cleanupTempDir);

const withTempFile = (testName, filename, content, callback) =>
  withTempDir(testName, (tempDir) => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return callback(tempDir, filePath);
  });

// ============================================
// File discovery utilities (project-specific ROOT_DIR)
// ============================================

/**
 * Get all files matching a pattern from the project root.
 * Wrapper around toolkit's getFiles with implicit ROOT_DIR.
 */
const getFiles = (pattern) => toolkitGetFiles(pattern, rootDir);

/**
 * Create a memoized file getter for a given pattern.
 * Uses project's ROOT_DIR implicitly.
 */
const memoizedFiles = memoizedFileGetter(rootDir);

// Production JS files: src/ and packages/ (excluding test-utils which are test code)
const SRC_JS_FILES = memoizedFiles(
  /^(src\/|packages\/js-toolkit\/(?!test-utils\/)).*\.js$/,
);
const ECOMMERCE_JS_FILES = memoizedFiles(/^ecommerce-backend\/.*\.js$/);
const SRC_HTML_FILES = memoizedFiles(/^src\/(_includes|_layouts)\/.*\.html$/);
const SRC_SCSS_FILES = memoizedFiles(/^src\/css\/.*\.scss$/);
const TEST_FILES = memoizedFiles(/^test\/.*\.js$/);
const ALL_JS_FILES = memoizedFiles(/^(src|ecommerce-backend|test)\/.*\.js$/);

/**
 * Create a pattern extractor for files.
 * Reads files directly (supports both absolute and relative paths).
 * For relative paths, prepends rootDir.
 */
const createExtractor =
  (pattern, transform = (m) => m[1]) =>
  (files) => {
    const fileList = Array.isArray(files) ? files : [files];
    const results = new Set();

    for (const file of fileList) {
      // Support both absolute and relative paths
      const filePath = path.isAbsolute(file) ? file : path.join(rootDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      for (const match of content.matchAll(pattern)) {
        results.add(transform(match));
      }
    }

    return results;
  };

// ============================================
// Object Utilities (for test infrastructure)
// ============================================

/**
 * Create a curried function that omits specified keys from an object.
 * Moved here from production code since it's only used in tests.
 */
const omit = (keys) => (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

// ============================================
// SCSS Compilation (for testing SCSS behavior)
// ============================================

/**
 * Compile SCSS content to CSS (test utility).
 * Moved here from production code since it's only used in tests.
 */
const compileScss = async (inputContent, inputPath) => {
  const { createScssCompiler } = await import("#build/scss.js");
  const compiler = createScssCompiler(inputContent, inputPath);
  return await compiler({});
};

// JSDOM-compatible wrapper for happy-dom
class DOM {
  constructor(html = "", _options = {}) {
    this.window = new Window({ url: _options.url || "http://localhost" });
    if (html) {
      this.window.document.write(html);
    }
  }
}

// ============================================
// Curried Factory Functions for Mock Config
// ============================================

const createMapMethod = (propName) =>
  function (name, value) {
    this[propName] = this[propName] || {};
    this[propName][name] = value;
  };

const createArrayMethod = (propName) =>
  function (item) {
    this[propName] = this[propName] || [];
    this[propName].push(item);
  };

const createMockEleventyConfig = () => ({
  addPlugin: function (plugin, config) {
    this.pluginCalls = this.pluginCalls || [];
    this.pluginCalls.push({ plugin, config });
  },
  addCollection: createMapMethod("collections"),
  addFilter: createMapMethod("filters"),
  addAsyncFilter: createMapMethod("asyncFilters"),
  addShortcode: createMapMethod("shortcodes"),
  addAsyncShortcode: createMapMethod("asyncShortcodes"),
  addPairedShortcode: createMapMethod("pairedShortcodes"),
  addExtension: createMapMethod("extensions"),
  addTransform: createMapMethod("transforms"),
  addGlobalData: createMapMethod("globalData"),
  on: createMapMethod("eventHandlers"),
  addTemplateFormats: createArrayMethod("templateFormats"),
  addWatchTarget: createArrayMethod("watchTargets"),
  addPassthroughCopy: createArrayMethod("passthroughCopies"),
  resolvePlugin: () => () => {},
  pathPrefix: "/",
});

// ============================================
// Test Fixture Factories
// ============================================

/**
 * Create a collection item with nested data structure.
 */
const item = (title, options = {}) => ({
  data: {
    ...(title && { title }),
    ...options,
  },
});

/**
 * Create items from an array of [title, options] tuples.
 */
const items = map(([title, options]) => item(title, options));

const createFrontmatter = (frontmatterData, content = "") =>
  matter.stringify(content, frontmatterData);

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

// ============================================
// Eleventy-specific assertion helpers
// ============================================

/**
 * Assert that a result is a valid script tag with correct id and type.
 */
const expectValidScriptTag = (result) => {
  expect(result.startsWith('<script id="site-config"')).toBe(true);
  expect(result.includes('type="application/json"')).toBe(true);
  expect(result.endsWith("</script>")).toBe(true);
};

// Pre-built data array checkers
const expectGalleries = expectDataArray("gallery");
const expectResultTitles = expectDataArray("title");

// ============================================
// Mock Collection API Helpers
// ============================================

const collectionApi = (items) => ({
  getFilteredByTag: () => items,
});

const taggedCollectionApi = (tagMap) => ({
  getFilteredByTag: (tag) => tagMap[tag] ?? [],
});

// ============================================
// Exports
// ============================================

// Re-export toolkit utilities
export {
  // Resource management (from toolkit)
  bracket,
  bracketAsync,
  cleanupTempDir,
  createTempFile,
  withMockedCwd,
  withMockedCwdAsync,
  withMockedProcessExit,
  withSubDir,
  withSubDirAsync,
  // Mocking (from toolkit)
  captureConsole,
  captureConsoleLogAsync,
  createConsoleCapture,
  mockFetch,
  withMockFetch,
  // Assertions (from toolkit)
  expectArrayProp,
  expectAsyncThrows,
  expectDataArray,
  expectErrorsInclude,
  expectObjectProps,
  expectProp,
  // Code analysis (from toolkit)
  ALWAYS_SKIP,
  extractFunctions,
};

// Export project-specific utilities
export {
  // Core
  DOM,
  compileScss,
  expect,
  fs,
  omit,
  path,
  rootDir,
  srcDir,
  // File discovery
  getFiles,
  SRC_JS_FILES,
  ECOMMERCE_JS_FILES,
  SRC_HTML_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
  ALL_JS_FILES,
  createExtractor,
  // Temp file management
  createMockEleventyConfig,
  createTempDir,
  createTempSnippetsDir,
  withTempDir,
  withTempDirAsync,
  withTempFile,
  // Assertions
  expectValidScriptTag,
  expectResultTitles,
  expectGalleries,
  // Data transforms
  data,
  toData,
  // Fixture factories
  item,
  items,
  createFrontmatter,
  createProduct,
  // Collection API mocks
  collectionApi,
  taggedCollectionApi,
};
