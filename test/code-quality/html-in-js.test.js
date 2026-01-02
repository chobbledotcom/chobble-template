import { ALLOWED_HTML_IN_JS } from "#test/code-quality/code-quality-exceptions.js";
import { analyzeFiles, assertNoViolations } from "#test/code-scanner.js";
import {
  createTestRunner,
  ECOMMERCE_JS_FILES,
  expectTrue,
  SRC_JS_FILES,
} from "#test/test-utils.js";

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
 * Check if a line is inside a comment
 */
const isCommentLine = (line) => {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*");
};

/**
 * Extract template literals and string content from source
 * Returns array of { lineNumber, content, type }
 */
const extractStringContent = (source) => {
  const results = [];
  const lines = source.split("\n");

  let inTemplateLiteral = false;
  let templateLiteralStart = 0;
  let templateContent = "";
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment lines
    if (isCommentLine(line)) continue;

    // Track template literals across lines
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : "";

      // Handle template literal expressions ${...}
      if (inTemplateLiteral && char === "$" && line[j + 1] === "{") {
        braceDepth++;
        j++; // Skip the {
        continue;
      }

      if (braceDepth > 0) {
        if (char === "{") braceDepth++;
        if (char === "}") braceDepth--;
        continue;
      }

      // Unescaped backtick
      if (char === "`" && prevChar !== "\\") {
        if (inTemplateLiteral) {
          // End of template literal
          results.push({
            lineNumber: templateLiteralStart + 1,
            content: templateContent,
            type: "template",
          });
          inTemplateLiteral = false;
          templateContent = "";
        } else {
          // Start of template literal
          inTemplateLiteral = true;
          templateLiteralStart = i;
          templateContent = "";
        }
      } else if (inTemplateLiteral) {
        templateContent += char;
      }
    }

    if (inTemplateLiteral) {
      templateContent += "\n";
    }

    // Also check for regular strings with HTML on this line
    // Match single and double quoted strings
    const stringMatches = line.matchAll(/["']([^"'\\]|\\.)*["']/g);
    for (const match of stringMatches) {
      results.push({
        lineNumber: i + 1,
        content: match[0],
        type: "string",
      });
    }
  }

  return results;
};

/**
 * Check if content contains HTML
 */
const containsHtml = (content) => {
  // Check exclusion patterns first
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(content)) {
      // If it matches an exclusion but also clearly has HTML, continue checking
      // This is a simple heuristic
    }
  }

  // Check for HTML patterns
  for (const pattern of HTML_PATTERNS) {
    if (pattern.test(content)) {
      // Verify it's not a false positive
      // Check if it looks like actual HTML (has closing > or is a known tag)
      const match = content.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
      if (match) {
        const tagName = match[1].toLowerCase();
        // Common HTML/SVG tags
        const htmlTags = new Set([
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

        if (htmlTags.has(tagName)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Find HTML content in JavaScript file
 */
const findHtmlInJs = (source) => {
  const results = [];
  const stringContent = extractStringContent(source);

  for (const item of stringContent) {
    if (containsHtml(item.content)) {
      // Get a preview of the HTML
      const preview = item.content.replace(/\s+/g, " ").trim().substring(0, 60);

      results.push({
        lineNumber: item.lineNumber,
        type: item.type,
        preview: preview + (item.content.length > 60 ? "..." : ""),
      });
    }
  }

  return results;
};

/**
 * Analyze all JS files for HTML content
 */
const analyzeHtmlInJs = () => {
  const violations = [];
  const allowed = [];

  // Check source JS files (not test files - tests often have HTML fixtures)
  const allJsFiles = [...SRC_JS_FILES, ...ECOMMERCE_JS_FILES];

  const results = analyzeFiles(allJsFiles, (source, relativePath) => {
    const htmlInstances = findHtmlInJs(source);
    if (htmlInstances.length > 0) {
      return [{ file: relativePath, instances: htmlInstances }];
    }
    return [];
  });

  for (const result of results) {
    if (ALLOWED_HTML_IN_JS.has(result.file)) {
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

const testCases = [
  {
    name: "detect-html-in-template-literal",
    description: "Correctly identifies HTML in template literals",
    test: () => {
      const source = `
const template = \`<div class="test">Hello</div>\`;
const notHtml = \`Just some text\`;
      `;
      const results = findHtmlInJs(source);
      expectTrue(
        results.length === 1,
        `Expected 1 HTML instance, found ${results.length}`,
      );
      expectTrue(
        results[0].lineNumber === 2,
        `Expected line 2, got ${results[0].lineNumber}`,
      );
    },
  },
  {
    name: "detect-svg-in-template-literal",
    description: "Correctly identifies SVG in template literals",
    test: () => {
      const source = `
const icon = \`<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>\`;
      `;
      const results = findHtmlInJs(source);
      expectTrue(
        results.length === 1,
        `Expected 1 SVG instance, found ${results.length}`,
      );
    },
  },
  {
    name: "detect-multiline-template",
    description: "Correctly identifies HTML in multiline template literals",
    test: () => {
      const source = `
const template = \`
  <div class="container">
    <span>Content</span>
  </div>
\`;
      `;
      const results = findHtmlInJs(source);
      expectTrue(
        results.length === 1,
        `Expected 1 HTML instance, found ${results.length}`,
      );
    },
  },
  {
    name: "ignore-non-html-templates",
    description: "Does not flag template literals without HTML",
    test: () => {
      const source = `
const message = \`Hello, \${name}!\`;
const query = \`SELECT * FROM users WHERE id = \${id}\`;
const css = \`.class { color: red; }\`;
      `;
      const results = findHtmlInJs(source);
      expectTrue(
        results.length === 0,
        `Expected 0 HTML instances, found ${results.length}`,
      );
    },
  },
  {
    name: "ignore-comparison-operators",
    description: "Does not flag comparison operators as HTML",
    test: () => {
      const source = `
const isSmaller = a < b;
const isLarger = x > y;
const check = value < 10;
      `;
      const results = findHtmlInJs(source);
      expectTrue(
        results.length === 0,
        `Expected 0 HTML instances (comparisons), found ${results.length}`,
      );
    },
  },
  {
    name: "no-new-html-in-js",
    description: "No new HTML-in-JS outside the allowlist",
    test: () => {
      const { violations } = analyzeHtmlInJs();
      assertNoViolations(expectTrue, violations, {
        message: "files with HTML in JavaScript",
        fixHint:
          "extract HTML to template files, or add to ALLOWED_HTML_IN_JS in code-quality-exceptions.js",
      });
    },
  },
  {
    name: "report-allowed-html-in-js",
    description: "Reports allowlisted HTML-in-JS files for tracking",
    test: () => {
      const { allowed } = analyzeHtmlInJs();

      console.log(`\n  Allowlisted HTML-in-JS files: ${allowed.length}`);
      console.log("  These should be refactored over time:\n");

      for (const a of allowed) {
        console.log(`     ${a.file}: ${a.instances.length} instance(s)`);
      }
      console.log("");

      // This test always passes - it's informational
      expectTrue(true, "Reported allowlisted HTML-in-JS files");
    },
  },
];

createTestRunner("html-in-js", testCases);
