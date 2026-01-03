import { describe, expect, test } from "bun:test";
import { ALLOWED_HTML_IN_JS } from "#test/code-quality/code-quality-exceptions.js";
import {
  analyzeFiles,
  assertNoViolations,
  extractStringContent,
} from "#test/code-scanner.js";
import { ECOMMERCE_JS_FILES, SRC_JS_FILES } from "#test/test-utils.js";

// HTML tag patterns and known tags
const HTML_PATTERNS = [
  /<[a-zA-Z][a-zA-Z0-9]*[\s>]/,
  /<\/[a-zA-Z][a-zA-Z0-9]*>/,
];
const HTML_TAGS = new Set(
  "div span p a button input form ul ol li table tr td th thead tbody h1 h2 h3 h4 h5 h6 img br hr strong em b i u pre code blockquote nav header footer main section article aside label select option textarea svg path polyline circle rect line polygon g defs use script style link meta head body html template".split(
    " ",
  ),
);

/** Find HTML content in JavaScript source. */
const findHtmlInJs = (source) =>
  extractStringContent(source)
    .filter(({ content }) => {
      if (!HTML_PATTERNS.some((p) => p.test(content))) return false;
      const match = content.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
      return match && HTML_TAGS.has(match[1].toLowerCase());
    })
    .map(({ lineNumber, content, type }) => ({
      lineNumber,
      type,
      preview:
        content.replace(/\s+/g, " ").trim().substring(0, 60) +
        (content.length > 60 ? "..." : ""),
    }));

/**
 * Analyze JS files for HTML content, separating allowed from violations.
 */
const analyzeHtmlInJs = (jsFiles, allowedFiles) => {
  const violations = [],
    allowed = [];

  const results = analyzeFiles(jsFiles, (source, relativePath) => {
    const instances = findHtmlInJs(source);
    return instances.length > 0 ? [{ file: relativePath, instances }] : [];
  });

  for (const result of results) {
    if (allowedFiles.has(result.file)) {
      allowed.push(result);
    } else {
      violations.push({
        file: result.file,
        line: result.instances[0]?.lineNumber || 1,
        code: result.instances.map((i) => i.preview).join(", "),
      });
    }
  }
  return { violations, allowed };
};

// Files to analyze
const ALL_JS_FILES = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES];

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
    const { violations } = analyzeHtmlInJs(ALL_JS_FILES, ALLOWED_HTML_IN_JS);
    assertNoViolations(violations, {
      message: "files with HTML in JavaScript",
      fixHint:
        "extract HTML to template files, or add to ALLOWED_HTML_IN_JS in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted HTML-in-JS files for tracking", () => {
    const { allowed } = analyzeHtmlInJs(ALL_JS_FILES, ALLOWED_HTML_IN_JS);

    console.log(`\n  Allowlisted HTML-in-JS files: ${allowed.length}`);
    console.log("  These should be refactored over time:\n");

    for (const a of allowed) {
      console.log(`     ${a.file}: ${a.instances.length} instance(s)`);
    }
    console.log("");

    // This test always passes - it's informational
    expect(true).toBe(true);
  });
});
