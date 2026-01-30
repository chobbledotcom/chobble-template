import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  isCommentLine,
  withAllowlist,
} from "#test/code-scanner.js";
import { ECOMMERCE_JS_FILES, SRC_JS_FILES } from "#test/test-utils.js";
import { filterMap } from "#toolkit/fp/array.js";
import { mapObject } from "#toolkit/fp/object.js";
import { frozenSet } from "#toolkit/fp/set.js";

/**
 * Patterns that indicate HTML content in JavaScript.
 * Matches template literals or strings containing HTML tags.
 */
const HTML_PATTERNS = [
  // Opening HTML tags (including self-closing): <div, <span, <button, <a, <p, <ul, <li, etc.
  /<[a-zA-Z][a-zA-Z0-9]*[\s>]/,

  // Self-closing tags: <br/>, <img />, <input/>
  /<[a-zA-Z][a-zA-Z0-9]*\s*\/>/,

  // Closing tags: </div>, </span>, etc.
  /<\/[a-zA-Z][a-zA-Z0-9]*>/,

  // SVG-specific tags
  /<svg[\s>]/,
  /<\/svg>/,
  /<polyline[\s>]/,
  /<path[\s>]/,
];

/**
 * Patterns that should be excluded from detection (false positives)
 */
const EXCLUSION_PATTERNS = [
  // Comparisons like x < y where y starts with a letter
  /[<>]=?\s*\d/,

  // Arrow functions: =>
  /=>/,

  // Generic type parameters: Array<string>, Map<K, V>
  /\w+<\w+>/,

  // Template literal expressions: ${...}
  /\$\{[^}]+\}/,

  // CSS selectors like .class or [attribute]
  /querySelector|querySelectorAll|getElementById|getElementsBy/,

  // String contains checks
  /\.includes\s*\(\s*["'`]</,
  /\.indexOf\s*\(\s*["'`]</,
  /\.startsWith\s*\(\s*["'`]</,
  /\.endsWith\s*\(\s*["'`]</,

  // Regex patterns
  /\/.*<.*\//,
];

/**
 * Extract template literals and string content from source
 * Returns array of { lineNumber, content, type }
 */
const extractStringContent = (source) => {
  /**
   * Helper: Handle opening brace in template expression
   * (Used twice in processCharForTemplate)
   */
  const handleTemplateBraceOpen = (state, char) => ({
    ...state,
    braceDepth: state.braceDepth + 1,
    skipNext: char === "$", // Skip '{' after '$'
  });

  /**
   * Process single character for template extraction.
   * Pure function following test-utils.js pattern.
   */
  const processCharForTemplate = (lineIndex) => (state, char, index, chars) => {
    /**
     * Helper: Get adjacent characters for current position
     */
    const getAdjacent = (idx, chrs) => ({
      prev: idx > 0 ? chrs[idx - 1] : "",
      next: idx < chrs.length - 1 ? chrs[idx + 1] : "",
    });

    /**
     * Helper: Check if char is unescaped backtick
     */
    const isUnescapedBacktick = (ch, prevCh) => ch === "`" && prevCh !== "\\";

    /**
     * Helper: Check if starting template expression ${
     */
    const isTemplateExpressionStart = (ch, nextCh) =>
      ch === "$" && nextCh === "{";

    /**
     * Helper: Handle closing brace in template expression
     */
    const handleTemplateBraceClose = (st) => ({
      ...st,
      braceDepth: st.braceDepth - 1,
    });

    /**
     * Helper: Handle backtick (start or end template)
     */
    const handleBacktick = (st, lineIdx) => {
      if (st.inTemplate) {
        // End template literal
        return {
          ...st,
          inTemplate: false,
          templateContent: "",
          results: [
            ...st.results,
            {
              lineNumber: st.templateStart + 1,
              content: st.templateContent,
              type: "template",
            },
          ],
        };
      }
      // Start template literal
      return {
        ...st,
        inTemplate: true,
        templateStart: lineIdx,
        templateContent: "",
      };
    };

    if (state.skipNext) {
      return { ...state, skipNext: false };
    }

    const { prev, next } = getAdjacent(index, chars);

    // Handle template expression braces
    if (state.inTemplate && isTemplateExpressionStart(char, next)) {
      return handleTemplateBraceOpen(state, char);
    }

    if (state.braceDepth > 0) {
      if (char === "{") return handleTemplateBraceOpen(state, char);
      if (char === "}") return handleTemplateBraceClose(state);
      return state;
    }

    // Handle backticks
    if (isUnescapedBacktick(char, prev)) {
      return handleBacktick(state, lineIndex);
    }

    // Accumulate template content
    if (state.inTemplate) {
      return { ...state, templateContent: `${state.templateContent}${char}` };
    }

    return state;
  };

  /**
   * Process single line: extract template parts and regular strings.
   * Pure function returning updated state.
   */
  const processLineForStrings = (state, line, lineIndex) => {
    if (isCommentLine(line)) return state;

    // Process characters for template literals
    const chars = [...line];
    const afterChars = chars.reduce(processCharForTemplate(lineIndex), state);

    // Add newline to template content if still inside template
    const withNewline = afterChars.inTemplate
      ? { ...afterChars, templateContent: `${afterChars.templateContent}\n` }
      : afterChars;

    // Extract regular strings from this line
    const stringMatches = [...line.matchAll(/["']([^"'\\]|\\.)*["']/g)];
    const stringResults = stringMatches.map((match) => ({
      lineNumber: lineIndex + 1,
      content: match[0],
      type: "string",
    }));

    return {
      ...withNewline,
      results: [...withNewline.results, ...stringResults],
    };
  };

  const lines = source.split("\n");
  const initialState = {
    inTemplate: false,
    templateStart: 0,
    templateContent: "",
    braceDepth: 0,
    skipNext: false,
    results: [],
  };

  const finalState = lines.reduce(processLineForStrings, initialState);
  return finalState.results;
};

/**
 * Known HTML/SVG tag names for verification
 */
const HTML_TAGS = frozenSet([
  "div",
  "span",
  "p",
  "a",
  "button",
  "input",
  "form",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "br",
  "hr",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "pre",
  "code",
  "blockquote",
  "nav",
  "header",
  "footer",
  "main",
  "section",
  "article",
  "aside",
  "label",
  "select",
  "option",
  "textarea",
  "svg",
  "path",
  "polyline",
  "circle",
  "rect",
  "line",
  "polygon",
  "g",
  "defs",
  "use",
  "script",
  "style",
  "link",
  "meta",
  "head",
  "body",
  "html",
  "template",
]);

/**
 * Find HTML content in JavaScript file.
 * Returns array of { lineNumber, line } for use with analyzeWithAllowlist.
 */
const findHtmlInJs = (source) =>
  filterMap(
    (item) => {
      const matchesPattern = HTML_PATTERNS.some((pattern) =>
        pattern.test(item.content),
      );
      if (!matchesPattern) return false;

      const tagMatch = item.content.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : null;
      return tagName ? HTML_TAGS.has(tagName) : false;
    },
    (item) => {
      const preview = item.content.replace(/\s+/g, " ").trim().substring(0, 60);
      return {
        lineNumber: item.lineNumber,
        line: preview + (item.content.length > 60 ? "..." : ""),
      };
    },
  )(extractStringContent(source));

// Complete analyzer - find + allowlist + files in one definition
const htmlInJsAnalysis = withAllowlist({
  find: findHtmlInJs,
  allowlist: new Set(),
  files: () => [...SRC_JS_FILES(), ...ECOMMERCE_JS_FILES()],
});

describe("html-in-js", () => {
  test("Correctly identifies HTML in template literals", () => {
    const source = `
const template = \`<div class="test">Hello</div>\`;
const notHtml = \`Just some text\`;
    `;
    const results = findHtmlInJs(source);
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(2);
  });

  test("Correctly identifies SVG in template literals", () => {
    const source = `
const icon = \`<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>\`;
    `;
    const results = findHtmlInJs(source);
    expect(results.length).toBe(1);
  });

  test("Correctly identifies HTML in multiline template literals", () => {
    const source = `
const template = \`
  <div class="container">
    <span>Content</span>
  </div>
\`;
    `;
    const results = findHtmlInJs(source);
    expect(results.length).toBe(1);
  });

  test("Does not flag template literals without HTML", () => {
    const source = `
const message = \`Hello, \${name}!\`;
const query = \`SELECT * FROM users WHERE id = \${id}\`;
const css = \`.class { color: red; }\`;
    `;
    const results = findHtmlInJs(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag comparison operators as HTML", () => {
    const source = `
const isSmaller = a < b;
const isLarger = x > y;
const check = value < 10;
    `;
    const results = findHtmlInJs(source);
    expect(results.length).toBe(0);
  });

  test("No new HTML-in-JS outside the allowlist", () => {
    const { violations } = htmlInJsAnalysis();
    assertNoViolations(violations, {
      message: "files with HTML in JavaScript",
      fixHint: "extract HTML to template files",
    });
  });

  test("Reports allowlisted HTML-in-JS files for tracking", () => {
    const { allowed } = htmlInJsAnalysis();

    // Group by file for cleaner output
    const grouped = Object.groupBy(allowed, (a) => a.file);
    const byFile = mapObject((file, items) => [file, items.map((a) => a.line)])(
      grouped,
    );

    const fileCount = Object.keys(byFile).length;
    console.log(`\n  Allowlisted HTML-in-JS files: ${fileCount}`);
    console.log("  These should be refactored over time:\n");

    for (const [file, lines] of Object.entries(byFile)) {
      console.log(`     ${file}: ${lines.length} instance(s)`);
    }
    console.log("");
  });
});
