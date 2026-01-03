import { describe, expect, test } from "bun:test";
import { ALLOWED_HTML_IN_JS } from "#test/code-quality/code-quality-exceptions.js";
import { analyzeFiles, assertNoViolations } from "#test/code-scanner.js";
import { ECOMMERCE_JS_FILES, SRC_JS_FILES } from "#test/test-utils.js";

// ============================================
// HTML-in-JS Checker Factory
// Consolidates detection and analysis of HTML in JavaScript
// ============================================

/**
 * Factory that creates an HTML-in-JS checker with methods for:
 * - Extracting string content from source
 * - Detecting HTML patterns in content
 * - Finding HTML instances in files
 * - Analyzing all JS files for violations
 */
const createHtmlInJsChecker = (jsFiles, allowedFiles, config = {}) => {
  const {
    htmlPatterns = [
      /<[a-zA-Z][a-zA-Z0-9]*[\s>]/,
      /<[a-zA-Z][a-zA-Z0-9]*\s*\/>/,
      /<\/[a-zA-Z][a-zA-Z0-9]*>/,
      /<svg[\s>]/,
      /<\/svg>/,
      /<polyline[\s>]/,
      /<path[\s>]/,
    ],
    htmlTags = new Set([
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
    ]),
  } = config;

  // ----------------------------------------
  // Internal helpers
  // ----------------------------------------

  const isCommentLine = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("*");
  };

  // ----------------------------------------
  // Extraction methods
  // ----------------------------------------

  const extractStringContent = (source) => {
    const results = [];
    const lines = source.split("\n");

    let inTemplateLiteral = false;
    let templateLiteralStart = 0;
    let templateContent = "";
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j - 1] : "";

        if (inTemplateLiteral && char === "$" && line[j + 1] === "{") {
          braceDepth++;
          j++;
          continue;
        }

        if (braceDepth > 0) {
          if (char === "{") braceDepth++;
          if (char === "}") braceDepth--;
          continue;
        }

        if (char === "`" && prevChar !== "\\") {
          if (inTemplateLiteral) {
            results.push({
              lineNumber: templateLiteralStart + 1,
              content: templateContent,
              type: "template",
            });
            inTemplateLiteral = false;
            templateContent = "";
          } else {
            inTemplateLiteral = true;
            templateLiteralStart = i;
            templateContent = "";
          }
        } else if (inTemplateLiteral) {
          templateContent += char;
        }
      }

      if (inTemplateLiteral) templateContent += "\n";

      for (const match of line.matchAll(/["']([^"'\\]|\\.)*["']/g)) {
        results.push({ lineNumber: i + 1, content: match[0], type: "string" });
      }
    }

    return results;
  };

  // ----------------------------------------
  // Detection methods
  // ----------------------------------------

  const containsHtml = (content) => {
    for (const pattern of htmlPatterns) {
      if (pattern.test(content)) {
        const match = content.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
        if (match && htmlTags.has(match[1].toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  };

  // ----------------------------------------
  // Analysis methods
  // ----------------------------------------

  const findHtmlInJs = (source) => {
    const results = [];
    for (const item of extractStringContent(source)) {
      if (containsHtml(item.content)) {
        const preview = item.content
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 60);
        results.push({
          lineNumber: item.lineNumber,
          type: item.type,
          preview: preview + (item.content.length > 60 ? "..." : ""),
        });
      }
    }
    return results;
  };

  const analyzeHtmlInJs = () => {
    const violations = [];
    const allowed = [];

    const results = analyzeFiles(jsFiles, (source, relativePath) => {
      const htmlInstances = findHtmlInJs(source);
      if (htmlInstances.length > 0) {
        return [{ file: relativePath, instances: htmlInstances }];
      }
      return [];
    });

    for (const result of results) {
      if (allowedFiles.has(result.file)) {
        allowed.push(result);
      } else {
        violations.push({
          file: result.file,
          line: result.instances[0]?.lineNumber || 1,
          code: result.instances.map((i) => i.preview).join(", "),
          instances: result.instances,
        });
      }
    }

    return { violations, allowed };
  };

  return {
    extractStringContent,
    containsHtml,
    findHtmlInJs,
    analyzeHtmlInJs,
  };
};

// Create checker instance with default config
const htmlChecker = createHtmlInJsChecker(
  [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES],
  ALLOWED_HTML_IN_JS,
);

describe("html-in-js", () => {
  test("Correctly identifies HTML in template literals", () => {
    const source = `
const template = \`<div class="test">Hello</div>\`;
const notHtml = \`Just some text\`;
    `;
    const results = htmlChecker.findHtmlInJs(source);
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(2);
  });

  test("Correctly identifies SVG in template literals", () => {
    const source = `
const icon = \`<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>\`;
    `;
    const results = htmlChecker.findHtmlInJs(source);
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
    const results = htmlChecker.findHtmlInJs(source);
    expect(results.length).toBe(1);
  });

  test("Does not flag template literals without HTML", () => {
    const source = `
const message = \`Hello, \${name}!\`;
const query = \`SELECT * FROM users WHERE id = \${id}\`;
const css = \`.class { color: red; }\`;
    `;
    const results = htmlChecker.findHtmlInJs(source);
    expect(results.length).toBe(0);
  });

  test("Does not flag comparison operators as HTML", () => {
    const source = `
const isSmaller = a < b;
const isLarger = x > y;
const check = value < 10;
    `;
    const results = htmlChecker.findHtmlInJs(source);
    expect(results.length).toBe(0);
  });

  test("No new HTML-in-JS outside the allowlist", () => {
    const { violations } = htmlChecker.analyzeHtmlInJs();
    assertNoViolations(violations, {
      message: "files with HTML in JavaScript",
      fixHint:
        "extract HTML to template files, or add to ALLOWED_HTML_IN_JS in code-quality-exceptions.js",
    });
  });

  test("Reports allowlisted HTML-in-JS files for tracking", () => {
    const { allowed } = htmlChecker.analyzeHtmlInJs();

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
