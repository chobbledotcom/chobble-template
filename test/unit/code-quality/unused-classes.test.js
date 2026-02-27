// Unused CSS Classes and IDs Test
// Detects HTML classes and IDs that are never referenced in SCSS or JS files
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
import {
  filter,
  filterMap,
  flatMap,
  map,
  pipe,
  split,
} from "#toolkit/fp/array.js";
import { buildReverseIndex } from "#toolkit/fp/grouping.js";

const { readFileSync } = fs;
const { join } = path;

// Public JS files need a separate pattern (not in the standard SRC_JS_FILES)
const PUBLIC_JS_FILES = getFiles(/^src\/_lib\/public\/.*\.js$/);

// ============================================
// Class/ID Extraction from HTML
// ============================================

/**
 * Extract classes or IDs from HTML content.
 * Uses pipe and functional composition for clean data flow.
 * @param {'class' | 'id'} type - The attribute type to extract
 * @param {string} content - The HTML content to parse
 * @returns {Set<string>} - Set of extracted values
 */
const extractFromHtml = (type, content) => {
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
  const isDynamicId = (val) => val.includes("{{") || val.includes("{%");
  const isNotEmpty = (val) => val.trim() !== "";

  return type === "class"
    ? pipe(
        cleanLiquid,
        (c) => [...c.matchAll(/class="([^"]*)"/g)],
        map((m) => m[1]),
        flatMap(pipe(normalizeWhitespace, split(" "))),
        filter(isValidClass),
        (arr) => new Set(arr),
      )(content)
    : pipe(
        (c) => [...c.matchAll(/id="([^"]*)"/g)],
        map((m) => m[1]),
        filterMap(
          (val) => !isDynamicId(val) && isNotEmpty(val),
          (s) => s.trim(),
        ),
        (arr) => new Set(arr),
      )(content);
};

// ============================================
// Class/ID Extraction from JavaScript
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
 * Find CSS selector references in SCSS content.
 * @param {string} content - SCSS file content
 * @param {string} name - The class or ID name to find
 * @param {string} prefix - The selector prefix ("\\." for class, "#" for id)
 */
const findSelectorReferencesInScss = (content, name, prefix) => {
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

// Pattern builders for class references
const classPatternBuilders = [
  (e) => `querySelector(?:All)?\\s*\\([^)]*\\.${e}[^)]*\\)`,
  (e) => `getElementsByClassName\\s*\\(\\s*["']${e}["']`,
  (e) => `classList\\.(add|remove|toggle|contains)\\(\\s*["']${e}["']`,
  (e) => `class=["'][^"']*\\b${e}\\b[^"']*["']`,
  (e) => `["']\\s*${e}\\s*["']`,
  (e) => `["']\\.${e}[^"']*["']`,
  (e) => `closest\\s*\\([^)]*\\.${e}[^)]*\\)`,
];

// Pattern builders for ID references
const idPatternBuilders = [
  (e) => `getElementById\\s*\\(\\s*["']${e}["']`,
  (e) => `querySelector(?:All)?\\s*\\([^)]*#${e}[^)]*\\)`,
  (e) => `id=["']${e}["']`,
  (e) => `:\\s*["']${e}["']`,
  (e) => `=\\s*["']${e}["']`,
  (e) => `getTemplate\\s*\\(\\s*["']${e}["']`,
];

/**
 * Curried function to find class or ID references in JavaScript content.
 * Uses functional composition with pattern builders.
 * @param {'class' | 'id'} type - The reference type to find
 * @returns {(name: string) => (content: string) => boolean} - Curried function
 */
const findReferencesInJs = (type) => (name) => {
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const buildPatterns = (builders) => (escaped) =>
    builders.map((build) => new RegExp(build(escaped)));
  const testAny = (patterns) => (content) =>
    patterns.some((pattern) => pattern.test(content));
  const getDynamicIdPattern = (name) =>
    name.includes("-")
      ? new RegExp(
          `getElementById\\s*\\(\\s*\`\\$\\{[^}]+\\}-${name.split("-").pop()}\`\\s*\\)`,
        )
      : null;

  const escaped = escapeRegex(name);
  const builders = type === "class" ? classPatternBuilders : idPatternBuilders;
  const patterns = buildPatterns(builders)(escaped);
  const dynamicPattern = type === "id" ? getDynamicIdPattern(name) : null;

  return (content) =>
    testAny(patterns)(content) || dynamicPattern?.test(content);
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
    const classes = extractFromHtml("class", html);
    expect(classes.has("foo")).toBe(true);
    expect(classes.has("bar")).toBe(true);
    expect(classes.has("baz")).toBe(true);
  });

  test("Handles Liquid/Nunjucks in class attributes", () => {
    const html = `
      <div class="static {% if x %}conditional{% endif %}">
      <span class="{{ variable }} another"></span>
    `;
    const classes = extractFromHtml("class", html);
    expect(classes.has("static")).toBe(true);
    expect(classes.has("another")).toBe(true);
    // Conditional and variable classes are stripped
  });

  test("Extracts ID names from HTML id attributes", () => {
    const html = `
      <div id="main-content">
        <span id="sidebar"></span>
      </div>
    `;
    const ids = extractFromHtml("id", html);
    expect(ids.has("main-content")).toBe(true);
    expect(ids.has("sidebar")).toBe(true);
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
    expect(findSelectorReferencesInScss(scss, "cart-item", "\\.")).toBe(true);
    expect(findSelectorReferencesInScss(scss, "active", "\\.")).toBe(true);
    expect(findSelectorReferencesInScss(scss, "nonexistent", "\\.")).toBe(
      false,
    );
  });

  test("Finds class references in JS content", () => {
    const js = `
      document.querySelector(".cart-item");
      element.classList.contains("active");
      const html = \`<div class="dynamic"></div>\`;
    `;
    expect(findReferencesInJs("class")("cart-item")(js)).toBe(true);
    expect(findReferencesInJs("class")("active")(js)).toBe(true);
    expect(findReferencesInJs("class")("dynamic")(js)).toBe(true);
  });

  test("Finds ID references in SCSS and JS", () => {
    const scss = "#main-nav { display: flex; }";
    const js = `document.getElementById("sidebar");`;

    expect(findSelectorReferencesInScss(scss, "main-nav", "#")).toBe(true);
    expect(findReferencesInJs("id")("sidebar")(js)).toBe(true);
  });

  test("Scans project files and reports unused classes/IDs", () => {
    // Use pre-computed file lists
    const htmlFiles = SRC_HTML_FILES().map((f) => join(rootDir, f));
    const scssFiles = SRC_SCSS_FILES().map((f) => join(rootDir, f));
    const jsFiles = PUBLIC_JS_FILES.map((f) => join(rootDir, f));

    // Build reverse indexes: class/id name -> files where defined
    // Using buildReverseIndex which handles the grouping cleanly
    const htmlClasses = buildReverseIndex(htmlFiles, (file) => [
      ...extractFromHtml("class", readFileSync(file, "utf-8")),
    ]);
    const jsClasses = buildReverseIndex(jsFiles, (file) => [
      ...extractClassesFromJs(readFileSync(file, "utf-8")),
    ]);

    // Merge HTML and JS classes into a single map
    const allClasses = new Map(htmlClasses);
    for (const [cls, files] of jsClasses) {
      allClasses.set(cls, [...(allClasses.get(cls) || []), ...files]);
    }

    const allIds = buildReverseIndex(htmlFiles, (file) => [
      ...extractFromHtml("id", readFileSync(file, "utf-8")),
    ]);

    // Load all SCSS, JS, and HTML content for reference checking
    const scssContent = scssFiles
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");
    const jsContent = jsFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
    const htmlContent = htmlFiles
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");

    const unusedClasses = [];
    const unusedIds = [];

    // Check each class for references
    for (const [className, definedIn] of allClasses) {
      const inScss = findSelectorReferencesInScss(
        scssContent,
        className,
        "\\.",
      );
      const inJs = findReferencesInJs("class")(className)(jsContent);

      if (!inScss && !inJs) {
        unusedClasses.push({ name: className, definedIn });
      }
    }

    // IDs referenced dynamically via config variables (e.g. config.internal_link_suffix = "#content")
    const dynamicIds = new Set(["content"]);

    // Check each ID for references
    for (const [idName, definedIn] of allIds) {
      if (dynamicIds.has(idName)) continue;
      const escaped = idName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const inScss = findSelectorReferencesInScss(scssContent, idName, "#");
      const inJs = findReferencesInJs("id")(idName)(jsContent);
      // Check HTML references: href="#id", for="id", list="id"
      const htmlPatterns = [
        new RegExp(`href=["'][^"']*#${escaped}[^"']*["']`),
        new RegExp(`for=["']${escaped}["']`),
        new RegExp(`list=["']${escaped}["']`),
      ];
      const inHtml = htmlPatterns.some((pattern) => pattern.test(htmlContent));

      if (!inScss && !inJs && !inHtml) {
        unusedIds.push({ name: idName, definedIn });
      }
    }

    // Report results
    console.log("\n  📊 Analysis Results:");
    console.log(`     Total classes found: ${allClasses.size}`);
    console.log(`     Total IDs found: ${allIds.size}`);
    console.log(`     Unused classes: ${unusedClasses.length}`);
    console.log(`     Unused IDs: ${unusedIds.length}`);

    // Log unused items
    for (const [items, label] of [
      [unusedClasses, "Classes"],
      [unusedIds, "IDs"],
    ]) {
      if (items.length === 0) continue;
      console.log(`\n  ⚠️  Unused ${label}:`);
      for (const { name, definedIn } of items.sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const shortPaths = definedIn.map((f) => f.replace(/^src\//, ""));
        console.log(`     - "${name}" in: ${shortPaths.join(", ")}`);
      }
    }

    // Fail the test if there are unused classes
    expect(unusedClasses.length).toBe(0);

    // Fail the test if there are unused IDs
    expect(unusedIds.length).toBe(0);
  });
});
