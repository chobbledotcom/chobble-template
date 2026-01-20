/**
 * Code analysis utilities for tests
 *
 * Provides utilities for analyzing JavaScript source code,
 * extracting function definitions, and scanning files.
 */
import fs from "node:fs";
import path from "node:path";
import { memoize } from "../fp/memoize.js";
import { frozenSet } from "../fp/set.js";

// Directories always skipped during file discovery
const ALWAYS_SKIP = frozenSet([
  "node_modules",
  ".git",
  "_site",
  ".test-sites",
  "result", // Nix build output symlink
]);

/**
 * Get all files matching a pattern from a directory.
 * Returns relative paths from root that match the regex.
 *
 * @param {RegExp} pattern - Pattern to match file paths against
 * @param {string} rootDir - Root directory to search from
 * @returns {string[]} Array of matching file paths
 */
const getFiles = (pattern, rootDir) => {
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

/**
 * Create a memoized file getter for a given pattern.
 * Curried: (rootDir) => (pattern) => () => files
 *
 * @param {string} rootDir - Root directory to search from
 * @returns {Function} (pattern) => () => files
 *
 * @example
 * const createFileGetter = memoizedFileGetter(rootDir);
 * const SRC_JS_FILES = createFileGetter(/^src\/.*\.js$/);
 * const files = SRC_JS_FILES(); // Returns array of matching files
 */
const memoizedFileGetter = (rootDir) => (pattern) =>
  memoize(() => getFiles(pattern, rootDir));

/**
 * Create a pattern extractor for files.
 * Curried: (pattern, transform) => (files) => Set
 * @param {RegExp} pattern - Regex with capture group
 * @param {function} [transform] - Transform match to value (default: m => m[1])
 * @returns {function} - files => Set of extracted values
 */
const createExtractor =
  (pattern, transform = (m) => m[1]) =>
  (files, rootDir) => {
    const fileList = Array.isArray(files) ? files : [files];
    const results = new Set();

    for (const file of fileList) {
      const content = fs.readFileSync(path.join(rootDir, file), "utf-8");
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
 *
 * @param {string} source - JavaScript source code
 * @returns {Array<{name: string, startLine: number, endLine: number, lineCount: number}>}
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

export {
  getFiles,
  memoizedFileGetter,
  createExtractor,
  extractFunctions,
  ALWAYS_SKIP,
};
