/**
 * Test utilities for CfA Static
 *
 * Re-exports the generic helpers from test/test-utils/ with
 * project-specific wrappers, plus Eleventy-specific test helpers.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { expect, vi } from "vitest";
import { ROOT_DIR, SRC_DIR } from "#lib/paths.js";

// Test fixture helpers for creating Eleventy-style collection items
// (These are test-only utilities, not general FP functions)

/**
 * Curried every check over object entries.
 * @param {(key: string, value: any) => boolean} predicate
 * @returns {(obj: Record<string, any>) => boolean}
 */
const everyEntry = (predicate) => (obj) =>
  Object.entries(obj).every(([k, v]) => predicate(k, v));

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
} from "#test/test-utils/assertions.js";
import {
  ALWAYS_SKIP,
  createExtractor,
  extractFunctions,
  findFiles as getFilesRaw,
  memoizedFileGetter,
} from "#test/test-utils/code-analysis.js";
import {
  captureConsole,
  captureConsoleLogAsync,
  createConsoleCapture,
  mockFetch,
  mockTemplateConfig,
  withMockFetch,
} from "#test/test-utils/mocking.js";
// Import for internal use and re-export
import {
  bracket,
  bracketAsync,
  cleanupTempDir,
  createTempDir,
  createTempFile,
  withChdirAsync,
  withMockedCwd,
  withMockedCwdAsync,
  withMockedProcessExit,
  withSubDir,
  withSubDirAsync,
  withTempDir,
  withTempDirAsync,
  withTempFile,
} from "#test/test-utils/resource.js";

/** Shared no-op for mockImplementation calls. */
const noop = () => undefined;

/**
 * Mock process.exit to throw `exit:<code>` so a test can assert both that
 * the CLI exited and with which code, without killing the test process.
 * Restore with `.mockRestore()`.
 */
const mockExitThrow = () =>
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`exit:${code}`);
  });

/**
 * Run a CLI entry point that may call process.exit, capturing what it
 * printed to console.error. Returns the captured error lines and the
 * `exit:<code>` message (null when the entry returned without exiting),
 * with the spies restored either way.
 * @param {() => unknown} run
 * @returns {Promise<{ errors: string[], exitError: string | null }>}
 */
const captureCliFailure = async (run) => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(noop);
  const exitSpy = mockExitThrow();
  const [outcome] = await Promise.allSettled([(async () => run())()]);
  const errors = errorSpy.mock.calls.map(([line]) => String(line));
  errorSpy.mockRestore();
  exitSpy.mockRestore();
  return {
    errors,
    exitError: outcome.status === "rejected" ? outcome.reason.message : null,
  };
};

// ============================================
// Project-specific path utilities
// ============================================

const rootDir = ROOT_DIR;
const srcDir = SRC_DIR;

const createTempSnippetsDir = (testName) => {
  const tempDir = createTempDir(testName);
  const snippetsDir = path.join(tempDir, "src/snippets");
  fs.mkdirSync(snippetsDir, { recursive: true });
  return { tempDir, snippetsDir };
};

// ============================================
// File discovery utilities (project-specific ROOT_DIR)
// ============================================

/**
 * Get all files matching a pattern from the project root.
 * Wrapper around the generic findFiles with implicit ROOT_DIR.
 */
const getFiles = (pattern) => getFilesRaw(pattern, rootDir);

/**
 * Create a memoized file getter for a given pattern.
 * Uses project's ROOT_DIR implicitly.
 */
const memoizedFiles = memoizedFileGetter(rootDir);

// Production JS files: src/ only (test/ helpers are test code)
const SRC_JS_FILES = memoizedFiles(/^src\/.*\.js$/);
const SRC_HTML_FILES = memoizedFiles(/^src\/(_includes|_layouts)\/.*\.html$/);
const SRC_SCSS_FILES = memoizedFiles(/^src\/css\/.*\.scss$/);
const TEST_FILES = memoizedFiles(/^test\/.*\.js$/);
// Build/dev tooling under scripts/ and bin/. Not in SRC_JS_FILES because
// they're not part of the runtime, but they're held to the same correctness
// gates and count as production usage of any src/ exports they import.
const SCRIPT_JS_FILES = memoizedFiles(/^(scripts\/|bin\/).*\.js$/);
// Every first-party JS file the default code-quality gates scan. Gates that
// deliberately exclude tooling (organisation-style rules) combine
// SRC_JS_FILES and TEST_FILES instead.
const ALL_JS_FILES = memoizedFiles(/^(src\/|test\/|scripts\/|bin\/).*\.js$/);

// ============================================
// Object Utilities (for test infrastructure)
// ============================================
// SCSS Compilation (for testing SCSS behavior)
// ============================================

/**
 * Compile SCSS through the registered Eleventy extension (test utility).
 */
const compileScss = async (inputContent, inputPath) => {
  const { configureScss } = await import("#build/scss.js");
  const config = createMockEleventyConfig();
  configureScss(config);
  return await config.extensions.scss.compile(inputContent, inputPath)({});
};

// HTML wrapper for creating complete documents in transform tests
const wrapHtml = (body) => `<html><body>${body}</body></html>`;

// Static image popup dialog skeleton (mirrors src/_includes/image-popup.html)
// for tests that exercise the fullscreen gallery
const imagePopupDialogHtml = `
<dialog id="image-popup" class="image-popup" aria-label="Image gallery">
  <button type="button" class="popup-close" data-popup-close aria-label="Close gallery">x</button>
  <div class="popup-stage">
    <button type="button" class="popup-nav" data-nav="prev" aria-label="Previous image"><span class="popup-nav-icon"></span></button>
    <div class="popup-track" data-popup-track tabindex="0" role="group" aria-label="Images"></div>
    <button type="button" class="popup-nav" data-nav="next" aria-label="Next image"><span class="popup-nav-icon"></span></button>
  </div>
  <ul class="popup-thumbs" data-popup-thumbs hidden></ul>
  <p class="popup-status" data-popup-status aria-live="polite"></p>
</dialog>
`;

// Alt text of each slide currently in the image popup, in order
const popupSlideAlts = (dialog) =>
  [...dialog.querySelectorAll(".popup-slide img")].map((img) => img.alt);

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
  htmlTransformer: {
    addPosthtmlPlugin(extensions, plugin, options) {
      this.plugins = this.plugins || {};
      this.plugins[extensions] = { plugin, options };
    },
  },
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
  resolvePlugin: () => () => {
    // no-op: stub for plugin resolution
  },
  pathPrefix: "/",
});

// ============================================
// Test Fixture Factories
// ============================================

/** Default order for items without explicit order (matches eleventyComputed) */
const DEFAULT_ORDER = 9999;

/**
 * Create a collection item with nested data structure.
 */
const item = (name, options = {}) => ({
  data: {
    order: DEFAULT_ORDER,
    ...(name && { name }),
    ...options,
  },
});

/**
 * Create items from an array of [name, options] tuples.
 */

const createFrontmatter = (frontmatterData, content = "") =>
  matter.stringify(content, frontmatterData);

// ============================================
// Eleventy-specific assertion helpers
// ============================================

// Pre-built data array checkers
const expectResultTitles = expectDataArray("name");

// ============================================
// Mock Collection API Helpers
// ============================================

const collectionApi = (items) => ({
  getFilteredByTag: () => items,
});

// ============================================
// Curried Config Mock Factories
// ============================================

/** Configure mock and return { mockConfig, filters, asyncFilters, collections, ... } */
const withConfiguredMock = (configureFn) => () => {
  const mockConfig = createMockEleventyConfig();
  configureFn(mockConfig);
  return {
    mockConfig,
    filters: mockConfig.filters || {},
    asyncFilters: mockConfig.asyncFilters || {},
    collections: mockConfig.collections || {},
    shortcodes: mockConfig.shortcodes || {},
    asyncShortcodes: mockConfig.asyncShortcodes || {},
  };
};

// ============================================
// Module mocking with auto-restore
// ============================================

// ============================================
// Exports
// ============================================

// Export project-specific utilities
export { analyzeBlockMarkdown } from "#test/test-utils/block-markdown-analysis.js";
export {
  assertDocumentationLinks,
  assertDocumentationTarget,
  extractDocumentationExamples,
  getDocumentationFiles,
  getTableRows,
} from "#test/test-utils/documentation.js";

export {
  ALL_JS_FILES,
  // Code analysis
  ALWAYS_SKIP,
  // Resource management
  bracket,
  bracketAsync,
  captureCliFailure,
  // Mocking
  captureConsole,
  captureConsoleLogAsync,
  cleanupTempDir,
  // Collection API mocks
  collectionApi,
  compileScss,
  createConsoleCapture,
  createExtractor,
  createFrontmatter,
  // Temp file management
  createMockEleventyConfig,
  createTempDir,
  createTempFile,
  createTempSnippetsDir,
  // Data transforms
  data,
  everyEntry,
  expect,
  // Assertions
  expectArrayProp,
  expectAsyncThrows,
  expectDataArray,
  expectErrorsInclude,
  // Assertions
  expectObjectProps,
  expectProp,
  expectResultTitles,
  extractFunctions,
  fs,
  // File discovery
  getFiles,
  // Image popup fixtures
  imagePopupDialogHtml,
  // Fixture factories
  item,
  mockExitThrow,
  mockFetch,
  mockTemplateConfig,
  noop,
  path,
  popupSlideAlts,
  rootDir,
  SCRIPT_JS_FILES,
  SRC_HTML_FILES,
  SRC_JS_FILES,
  SRC_SCSS_FILES,
  srcDir,
  TEST_FILES,
  toData,
  // Curried config mock factories
  withChdirAsync,
  withConfiguredMock,
  withMockedCwd,
  withMockedCwdAsync,
  withMockedProcessExit,
  withMockFetch,
  withSubDir,
  withSubDirAsync,
  withTempDir,
  withTempDirAsync,
  withTempFile,
  // Core
  wrapHtml,
};
