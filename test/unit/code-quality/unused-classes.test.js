// Unused CSS Classes Test
// Detects HTML classes that are never referenced in SCSS or JS files
// This helps identify dead code and potential cleanup opportunities

import { describe, expect, test } from "bun:test";
import {
  fs,
  getFiles,
  path,
  rootDir,
  SRC_HTML_FILES,
  SRC_SCSS_FILES,
} from "#test/test-utils.js";
import { filter, flatMap, map, pipe, split } from "#toolkit/fp/array.js";
import { buildReverseIndex } from "#toolkit/fp/grouping.js";

const { readFileSync } = fs;
const { join } = path;

// Public JS files need a separate pattern
const PUBLIC_JS_FILES = getFiles(/^src\/_lib\/public\/.*\.js$/);

// ============================================
// Class Extraction from HTML
// ============================================

/**
 * Extract classes from HTML content.
 * Uses pipe and functional composition for clean data flow.
 * @param {string} content - The HTML content to parse
 * @returns {Set<string>} - Set of extracted class names
 */
const extractClassesFromHtml = (content) => {
  const cleanLiquid = (c) =>
    c.replace(/\{\{-?[\s\S]*?-?\}\}/g, " ").replace(/\{%-?[\s\S]*?-?%\}/g, " ");
  const normalizeWhitespace = (str) => str.replace(/\s+/g, " ").trim();
  // Valid classes: start with letter/underscore/hyphen, contain alphanumeric/underscore/hyphen
  // Skip BEM modifier prefixes (e.g., "btn--" from "btn--{{ variant }}" after Liquid removal)
  const isValidClass = (cls) =>
    cls &&
    /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(cls) &&
    !cls.endsWith("--") &&
    !cls.endsWith("-");

  return pipe(
    cleanLiquid,
    (c) => [...c.matchAll(/class="([^"]*)"/g)],
    map((m) => m[1]),
    flatMap(pipe(normalizeWhitespace, split(" "))),
    filter(isValidClass),
    (arr) => new Set(arr),
  )(content);
};

// ============================================
// Class Extraction from JavaScript
// ============================================

const extractClassesFromJs = (content) => {
  // Pattern definitions: [regex, capture group index]
  const patterns = [
    [/class="([^"$]+)"/g, 1], // class="..." in template literals
    [/\.classList\.(add|remove|toggle)\("([^"]+)"/g, 2], // classList methods
    [/classes\s*\+=\s*["']([^"']+)["']/g, 1], // classes += "..."
    [/(?:let|const|var)\s+classes\s*=\s*["']([^"']+)["']/g, 1], // let classes = "..."
  ];

  // Extract all classes using flatMap to avoid repeated loops
  return new Set(
    patterns.flatMap(([regex, groupIdx]) =>
      [...content.matchAll(regex)].flatMap((match) =>
        match[groupIdx].split(" ").filter((cls) => cls.trim()),
      ),
    ),
  );
};

// ============================================
// Reference Detection in SCSS
// ============================================

/**
 * Find class selector references in SCSS content.
 * @param {string} content - SCSS file content
 * @param {string} name - The class name to find
 */
const findClassReferencesInScss = (content, name) => {
  const prefix = "\\.";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match selector in SCSS (with word boundary or valid selector chars after)
  // Handles: .class, .class:hover, .class.other, .class[attr], .class>child, #id, etc.
  const directPattern = new RegExp(
    `${prefix}${escaped}(?=[\\s,:{\\[>+~.)#]|$)`,
    "m",
  );
  if (directPattern.test(content)) return true;

  // For BEM-style modifiers (e.g., "split--reverse"), check for SCSS nesting
  // Pattern: &--modifier within a .base { } block (can be deeply nested)
  if (name.includes("--")) {
    const [base, ...modifierParts] = name.split("--");
    const modifier = modifierParts.join("--");
    const baseEscaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const modifierEscaped = modifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Check if we have .base somewhere before &--modifier (allowing any nesting depth)
    const basePattern = new RegExp(`${prefix}${baseEscaped}\\s*\\{`, "m");
    const modifierPattern = new RegExp(
      `&--${modifierEscaped}(?=[\\s,:{\\[>+~.)#]|$)`,
      "m",
    );
    if (basePattern.test(content) && modifierPattern.test(content)) return true;
  }

  return false;
};

// ============================================
// Reference Detection in JavaScript
// ============================================

// Pattern builders for class references in JS
const classPatternBuilders = [
  (e) => `querySelector(?:All)?\\s*\\([^)]*\\.${e}[^)]*\\)`,
  (e) => `getElementsByClassName\\s*\\(\\s*["']${e}["']`,
  (e) => `classList\\.(add|remove|toggle|contains)\\(\\s*["']${e}["']`,
  (e) => `class=["'][^"']*\\b${e}\\b[^"']*["']`,
  (e) => `["']\\s*${e}\\s*["']`,
  (e) => `["']\\.${e}[^"']*["']`,
  (e) => `closest\\s*\\([^)]*\\.${e}[^)]*\\)`,
];

/**
 * Find class references in JavaScript content.
 * @param {string} name - The class name to find
 * @returns {(content: string) => boolean}
 */
const findClassReferencesInJs = (name) => {
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escaped = escapeRegex(name);
  const patterns = classPatternBuilders.map(
    (build) => new RegExp(build(escaped)),
  );

  return (content) => patterns.some((pattern) => pattern.test(content));
};

// ============================================
// Test Cases
// ============================================

describe("unused-classes", () => {
  test("Extracts class names from HTML class attributes", () => {
    const html = `
      <div class="foo bar">
        <span class="baz"></span>
      </div>
    `;
    const classes = extractClassesFromHtml(html);
    expect(classes.has("foo")).toBe(true);
    expect(classes.has("bar")).toBe(true);
    expect(classes.has("baz")).toBe(true);
  });

  test("Handles Liquid/Nunjucks in class attributes", () => {
    const html = `
      <div class="static {% if x %}conditional{% endif %}">
      <span class="{{ variable }} another"></span>
    `;
    const classes = extractClassesFromHtml(html);
    expect(classes.has("static")).toBe(true);
    expect(classes.has("another")).toBe(true);
    // Conditional and variable classes are stripped
  });

  test("Extracts classes from JS template literals", () => {
    const js = `
      const html = \`<div class="cart-item">
        <span class="item-name item-bold"></span>
      </div>\`;
      icon.classList.add("active");
      let classes = "base-class";
      classes += " extra";
    `;
    const classes = extractClassesFromJs(js);
    expect(classes.has("cart-item")).toBe(true);
    expect(classes.has("item-name")).toBe(true);
    expect(classes.has("active")).toBe(true);
    expect(classes.has("base-class")).toBe(true);
    expect(classes.has("extra")).toBe(true);
  });

  test("Finds class selectors in SCSS content", () => {
    const scss = `
      .cart-item { color: red; }
      .cart-item:hover { color: blue; }
      .cart-item.active { font-weight: bold; }
      .unused-class { display: none; }
    `;
    expect(findClassReferencesInScss(scss, "cart-item")).toBe(true);
    expect(findClassReferencesInScss(scss, "active")).toBe(true);
    expect(findClassReferencesInScss(scss, "nonexistent")).toBe(false);
  });

  test("Finds class references in JS content", () => {
    const js = `
      document.querySelector(".cart-item");
      element.classList.contains("active");
      const html = \`<div class="dynamic"></div>\`;
    `;
    expect(findClassReferencesInJs("cart-item")(js)).toBe(true);
    expect(findClassReferencesInJs("active")(js)).toBe(true);
    expect(findClassReferencesInJs("dynamic")(js)).toBe(true);
  });

  test("Scans project files and reports unused classes", () => {
    // Use pre-computed file lists
    const htmlFiles = SRC_HTML_FILES().map((f) => join(rootDir, f));
    const scssFiles = SRC_SCSS_FILES().map((f) => join(rootDir, f));
    const jsFiles = PUBLIC_JS_FILES.map((f) => join(rootDir, f));

    // Build reverse indexes: class name -> files where defined
    // Using buildReverseIndex which handles the grouping cleanly
    const htmlClasses = buildReverseIndex(htmlFiles, (file) => [
      ...extractClassesFromHtml(readFileSync(file, "utf-8")),
    ]);
    const jsClasses = buildReverseIndex(jsFiles, (file) => [
      ...extractClassesFromJs(readFileSync(file, "utf-8")),
    ]);

    // Merge HTML and JS classes into a single map
    const allClasses = new Map(htmlClasses);
    for (const [cls, files] of jsClasses) {
      allClasses.set(cls, [...(allClasses.get(cls) || []), ...files]);
    }

    // Load all SCSS and JS content for reference checking
    const scssContent = scssFiles
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");
    const jsContent = jsFiles.map((f) => readFileSync(f, "utf-8")).join("\n");

    const unusedClasses = [];

    // Check each class for references
    for (const [className, definedIn] of allClasses) {
      const inScss = findClassReferencesInScss(scssContent, className);
      const inJs = findClassReferencesInJs(className)(jsContent);

      if (!inScss && !inJs) {
        unusedClasses.push({ name: className, definedIn });
      }
    }

    // Report results
    console.log("\n  📊 Analysis Results:");
    console.log(`     Total classes found: ${allClasses.size}`);
    console.log(`     Unused classes: ${unusedClasses.length}`);

    // Log unused classes
    if (unusedClasses.length > 0) {
      console.log("\n  ⚠️  Unused Classes:");
      for (const { name, definedIn } of unusedClasses.sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const shortPaths = definedIn.map((f) => f.replace(/^src\//, ""));
        console.log(`     - "${name}" in: ${shortPaths.join(", ")}`);
      }
    }

    // Fail the test if there are unused classes
    expect(unusedClasses.length).toBe(0);
  });
});
