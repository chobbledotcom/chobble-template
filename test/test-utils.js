import { expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Window } from "happy-dom";
import { ROOT_DIR, SRC_DIR } from "#lib/paths.js";
import { map } from "#utils/array-utils.js";
import { memoize } from "#utils/memoize.js";

// JSDOM-compatible wrapper for happy-dom
class DOM {
  constructor(html = "", _options = {}) {
    this.window = new Window({ url: _options.url || "http://localhost" });
    if (html) {
      this.window.document.write(html);
    }
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

// ============================================
// Curried Factory Functions for Mock Config
// ============================================

/**
 * Create a method that adds items to an object map.
 * Curried: (propName) => function(name, value) that assigns this[propName][name] = value
 *
 * @param {string} propName - The property name for the object map
 * @returns {Function} Method that adds name/value pairs to the map
 *
 * @example
 * const addFilter = createMapMethod("filters");
 * // Later: addFilter.call(config, "myFilter", fn)
 */
const createMapMethod = (propName) =>
  function (name, value) {
    this[propName] = this[propName] || {};
    this[propName][name] = value;
  };

/**
 * Create a method that pushes items to an array.
 * Curried: (propName) => function(item) that pushes to this[propName]
 *
 * @param {string} propName - The property name for the array
 * @returns {Function} Method that pushes items to the array
 *
 * @example
 * const addWatchTarget = createArrayMethod("watchTargets");
 * // Later: addWatchTarget.call(config, "src/**")
 */
const createArrayMethod = (propName) =>
  function (item) {
    this[propName] = this[propName] || [];
    this[propName].push(item);
  };

// Define createMockEleventyConfig BEFORE getFiles() to avoid TDZ issues
// when getFiles() triggers circular imports during module initialization
const createMockEleventyConfig = () => ({
  addPlugin: function (plugin, config) {
    this.pluginCalls = this.pluginCalls || [];
    this.pluginCalls.push({ plugin, config });
  },
  // Object map methods - use curried factory
  addCollection: createMapMethod("collections"),
  addFilter: createMapMethod("filters"),
  addAsyncFilter: createMapMethod("asyncFilters"),
  addShortcode: createMapMethod("shortcodes"),
  addAsyncShortcode: createMapMethod("asyncShortcodes"),
  addExtension: createMapMethod("extensions"),
  addTransform: createMapMethod("transforms"),
  on: createMapMethod("eventHandlers"),
  // Array push methods - use curried factory
  addTemplateFormats: createArrayMethod("templateFormats"),
  addWatchTarget: createArrayMethod("watchTargets"),
  addPassthroughCopy: createArrayMethod("passthroughCopies"),
  // Mock plugin resolution (used by feed.js)
  resolvePlugin: () => () => {},
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

// Memoized file list getters - defer getFiles() call until first use
// to avoid TDZ issues during circular imports at module load time

/**
 * Create a memoized file getter for a given pattern.
 * Curried: (pattern) => () => files
 *
 * @param {RegExp} pattern - Regex pattern for file matching
 * @returns {Function} Memoized function that returns matching files
 *
 * @example
 * const SRC_JS_FILES = memoizedFiles(/^src\/.*\.js$/);
 * const files = SRC_JS_FILES(); // Returns array of matching files
 */
const memoizedFiles = (pattern) => memoize(() => getFiles(pattern));

const SRC_JS_FILES = memoizedFiles(/^src\/.*\.js$/);
const ECOMMERCE_JS_FILES = memoizedFiles(/^ecommerce-backend\/.*\.js$/);
const SRC_HTML_FILES = memoizedFiles(/^src\/(_includes|_layouts)\/.*\.html$/);
const SRC_SCSS_FILES = memoizedFiles(/^src\/css\/.*\.scss$/);
const TEST_FILES = memoizedFiles(/^test\/.*\.js$/);
const ALL_JS_FILES = memoizedFiles(/^(src|ecommerce-backend|test)\/.*\.js$/);

// Console capture utilities for testing output
// Uses curried factory to eliminate duplication between sync and async versions

/**
 * Create a console capture function with a given executor.
 * Curried: (executor) => (fn) => logs
 *
 * The executor receives (fn, cleanup, logs) where:
 * - fn: the function to execute
 * - cleanup: function to restore console.log
 * - logs: array of captured log strings
 *
 * @param {Function} executor - (fn, cleanup, logs) => result
 * @returns {Function} (fn) => logs - Console capture function
 *
 * @example
 * const captureSync = createConsoleCapture((fn, cleanup, logs) => { fn(); cleanup(); return logs; });
 */
const createConsoleCapture = (executor) => (fn) => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  return executor(
    fn,
    () => {
      console.log = originalLog;
    },
    logs,
  );
};

// Sync version: run fn(), restore console, return logs
const captureConsole = createConsoleCapture((fn, cleanup, logs) => {
  fn();
  cleanup();
  return logs;
});

// Async version: await fn(), restore console, return logs
const captureConsoleLogAsync = createConsoleCapture(
  async (fn, cleanup, logs) => {
    await fn();
    cleanup();
    return logs;
  },
);

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

/**
 * Bracket pattern for resource management.
 * Curried: (setup, teardown, passResource) => (arg, callback) => result
 *
 * Implements: acquire resource, use it, release it.
 *
 * @param {Function} setup - (arg) => resource - Acquire the resource
 * @param {Function} teardown - (resource) => void - Release the resource
 * @param {boolean} passResource - Whether to pass resource to callback
 * @returns {Function} (arg, callback) => result
 */
const bracket =
  (setup, teardown, passResource = true) =>
  (arg, callback) => {
    const resource = setup(arg);
    const result = passResource ? callback(resource) : callback();
    teardown(resource);
    return result;
  };

// Bracket-based resource management using curried factory
const withTempDir = bracket(createTempDir, cleanupTempDir);

const withTempFile = (testName, filename, content, callback) =>
  withTempDir(testName, (tempDir) => {
    const filePath = createTempFile(tempDir, filename, content);
    return callback(tempDir, filePath);
  });

const withMockedCwd = bracket(
  (newCwd) => {
    const original = process.cwd;
    process.cwd = () => newCwd;
    return original;
  },
  (original) => {
    process.cwd = original;
  },
  false,
);

/**
 * Assert that a result is a valid script tag with correct id and type.
 * Functional helper to reduce duplication in script tag validation.
 *
 * @param {string} result - The script tag string to validate
 */
const expectValidScriptTag = (result) => {
  expect(result.startsWith('<script id="site-config"')).toBe(true);
  expect(result.includes('type="application/json"')).toBe(true);
  expect(result.endsWith("</script>")).toBe(true);
};

/**
 * Assert that an object has expected property values.
 * Curried for use with pipe: first call with expected props map.
 *
 * @param {Object} propMap - Map of property names to expected values
 * @returns {Function} (obj) => obj (returns obj for chaining in pipe)
 *
 * @example
 * expectObjectProps({ name: "foo", count: 42 })(myObj);
 *
 * @example
 * // Use with pipe
 * pipe(
 *   expectObjectProps({ item_widths: "240,480,640" }),
 *   expectObjectProps({ gallery_thumb_widths: "240,480" })
 * )(DEFAULT_PRODUCT_DATA);
 */
const expectObjectProps = (propMap) => (obj) => {
  for (const [key, value] of Object.entries(propMap)) {
    expect(obj[key]).toBe(value);
  }
  return obj;
};

/**
 * Assert that a result array has expected values for a given property getter.
 * The most generic form - accepts any getter function.
 * Curried: first call with getter, returns assertion function.
 *
 * @param {Function} getter - (item) => value to extract from each item
 * @returns {Function} (result, expectedValues) => void
 *
 * @example
 * expectArrayProp(item => item.name)(result, ["Alpha", "Beta"]);
 * expectArrayProp(item => item.data.title)(result, ["Product 1", "Product 2"]);
 */
const expectArrayProp = (getter) => (result, expectedValues) => {
  expect(result.length).toBe(expectedValues.length);
  expectedValues.forEach((value, i) => {
    const actual = getter(result[i]);
    if (value === undefined) {
      expect(actual).toBe(undefined);
    } else {
      expect(actual).toEqual(value);
    }
  });
};

/**
 * Assert that a result array has expected values for a top-level property.
 * Curried: first call with key name, returns assertion function.
 *
 * @param {string} key - The property key to check (e.g., "name", "template")
 * @returns {Function} (result, expectedValues) => void
 *
 * @example
 * expectProp("name")(result, ["Alpha", "Beta"]);
 * expectProp("template")(result, ["input.html", "textarea.html"]);
 */
const expectProp = (key) => expectArrayProp((item) => item[key]);

/**
 * Assert that a result array has expected data values for a given key.
 * Curried: first call with key name, returns assertion function.
 * For checking result[i].data[key] patterns.
 *
 * @param {string} key - The data key to check (e.g., "gallery", "categories")
 * @returns {Function} (result, expectedValues) => void
 *
 * @example
 * const expectGalleries = expectDataArray("gallery");
 * expectGalleries(result, [["img1.jpg"], undefined, ["img3.jpg"]]);
 */
const expectDataArray = (key) => expectArrayProp((item) => item.data[key]);

// Pre-built data array checkers using curried factory
const expectGalleries = expectDataArray("gallery");
const expectResultTitles = expectDataArray("title");

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
 *
 * Pure functional implementation using reduce with immutable state.
 */
const extractFunctions = (source) => {
  // Helper: Match function declaration patterns in a line of code
  const matchFunctionStart = (line) => {
    const patterns = [
      /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, // function declarations
      /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/, // arrow functions
      /^\s*(?:async\s+)?(?!function\s)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/, // method definitions (exclude anonymous functions)
      /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?(?:function\s*)?\(/, // object methods
    ];
    const match = patterns.reduce(
      (found, pattern) => found || line.match(pattern),
      null,
    );
    return match ? match[1] : null;
  };

  // Helper: Get adjacent characters
  const getAdjacentChars = (index, chars) => ({
    prev: index > 0 ? chars[index - 1] : "",
    next: index < chars.length - 1 ? chars[index + 1] : "",
  });

  // Helper: Check if starting single-line comment
  const isSingleLineCommentStart = (char, nextChar, state) =>
    char === "/" && nextChar === "/" && !state.inComment;

  // Helper: Check if starting multi-line comment
  const isMultiLineCommentStart = (char, nextChar, state) =>
    char === "/" && nextChar === "*" && !state.inComment;

  // Helper: Check if ending multi-line comment
  const isMultiLineCommentEnd = (char, nextChar, state) =>
    char === "*" && nextChar === "/" && state.inComment;

  // Helper: Check if string delimiter (not escaped)
  const isStringDelimiter = (char, prevChar) =>
    (char === '"' || char === "'") && prevChar !== "\\";

  // Helper: Check if template literal delimiter (not escaped)
  const isTemplateDelimiter = (char, prevChar) =>
    char === "`" && prevChar !== "\\";

  // Helper: Handle opening brace
  const handleOpeningBrace = (state) => {
    const newDepth = state.braceDepth + 1;
    const newStack = state.stack.map((item) =>
      item.openBraceDepth === null
        ? { ...item, openBraceDepth: newDepth }
        : item,
    );
    return { ...state, braceDepth: newDepth, stack: newStack };
  };

  // Helper: Handle closing brace
  const handleClosingBrace = (lineNum, state) => {
    const closingIndex = state.stack.findLastIndex(
      (item) => item.openBraceDepth === state.braceDepth,
    );

    if (closingIndex < 0) {
      return { ...state, braceDepth: state.braceDepth - 1 };
    }

    const completed = state.stack[closingIndex];
    const newFunction = {
      name: completed.name,
      startLine: completed.startLine,
      endLine: lineNum,
      lineCount: lineNum - completed.startLine + 1,
    };
    return {
      ...state,
      braceDepth: state.braceDepth - 1,
      stack: state.stack.filter((_, i) => i !== closingIndex),
      functions: [...state.functions, newFunction],
    };
  };

  // Helper: Handle comment state transitions
  const handleComments = (state, char, nextChar) => {
    if (isSingleLineCommentStart(char, nextChar, state)) {
      return { ...state, stopLine: true };
    }
    if (isMultiLineCommentStart(char, nextChar, state)) {
      return { ...state, inComment: true, skipNext: true };
    }
    if (isMultiLineCommentEnd(char, nextChar, state)) {
      return { ...state, inComment: false, skipNext: true };
    }
    return null;
  };

  // Helper: Handle string delimiter state transitions
  const handleStringDelimiters = (state, char) => {
    if (!state.inString) {
      return { ...state, inString: true, stringChar: char };
    }
    if (char === state.stringChar) {
      return { ...state, inString: false, stringChar: null };
    }
    return state;
  };

  // Helper: Process a single character in the parser (curried for reduce)
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Inherent complexity from state machine logic
  const processChar = (lineNum) => (state, char, index, chars) => {
    // Quick exits for special states
    if (state.skipNext) return { ...state, skipNext: false };
    if (state.stopLine) return state;

    const { prev: prevChar, next: nextChar } = getAdjacentChars(index, chars);

    // Comment handling when not in string/template
    if (!state.inString && !state.inTemplate) {
      const result = handleComments(state, char, nextChar);
      if (result !== null) return result;
    }

    // Early exit: inside multiline comments
    if (state.inComment) return state;

    // String delimiters (when not in template)
    if (!state.inTemplate && isStringDelimiter(char, prevChar)) {
      return handleStringDelimiters(state, char);
    }

    // Template delimiters
    if (isTemplateDelimiter(char, prevChar)) {
      return { ...state, inTemplate: !state.inTemplate };
    }

    // Early exit: inside strings
    if (state.inString) return state;

    // Handle braces
    return char === "{"
      ? handleOpeningBrace(state)
      : char === "}"
        ? handleClosingBrace(lineNum, state)
        : state;
  };

  // Helper: Process a single line of source code
  const processLine = (state, line, index) => {
    const lineNum = index + 1;

    // Check for function start and add to stack if found
    const funcName = matchFunctionStart(line);
    const stateWithFunc = funcName
      ? {
          ...state,
          stack: [
            ...state.stack,
            { name: funcName, startLine: lineNum, openBraceDepth: null },
          ],
        }
      : state;

    // Process each character with reduce
    const chars = [...line];
    const lineState = { ...stateWithFunc, stopLine: false };
    const processedState = chars.reduce(processChar(lineNum), lineState);

    // Clean up line-specific flag
    const { stopLine: _, ...cleanState } = processedState;
    return cleanState;
  };
  const initialState = {
    braceDepth: 0,
    inString: false,
    stringChar: null,
    inTemplate: false,
    inComment: false,
    skipNext: false,
    functions: [],
    stack: [],
  };

  const lines = source.split("\n");
  const finalState = lines.reduce(processLine, initialState);
  return finalState.functions;
};

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
  captureConsole,
  captureConsoleLogAsync,
  createTempDir,
  createTempFile,
  createTempSnippetsDir,
  cleanupTempDir,
  withTempDir,
  withTempFile,
  withMockedCwd,
  expectValidScriptTag,
  expectResultTitles,
  expectObjectProps,
  expectArrayProp,
  expectProp,
  expectDataArray,
  expectGalleries,
  // Generic item builder
  item,
  items,
  // Test fixture factories
  createFrontmatter,
  createProduct,
  // Code analysis utilities
  createExtractor,
  extractFunctions,
  // Mock collection API helpers
  collectionApi,
  taggedCollectionApi,
};
