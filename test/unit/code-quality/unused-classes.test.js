// Unused CSS Classes and IDs Test
// Detects HTML classes and IDs that are never referenced in SCSS or JS files
// This helps identify dead code and potential cleanup opportunities

import { describe, expect, test } from "bun:test";
import {
  filter,
  filterMap,
  flatMap,
  map,
  pipe,
  split,
} from "#lib/utils/array-utils.js";
import {
  fs,
  getFiles,
  path,
  rootDir,
  SRC_HTML_FILES,
  SRC_SCSS_FILES,
} from "#test/test-utils.js";

const { readFileSync } = fs;
const { join } = path;

// Public JS files need a separate pattern (not in the standard SRC_JS_FILES)
const PUBLIC_JS_FILES = getFiles(/^src\/_lib\/public\/.*\.js$/);

// ============================================
// Class/ID Extraction from HTML
// ============================================

// Helper function shared between multiple test cases
const matchAll = (regex) => (content) => [...content.matchAll(regex)];
const getMatch = (index) => (match) => match[index];
const toSet = (arr) => new Set(arr);

/**
 * Extract classes or IDs from HTML content.
 * Uses pipe and functional composition for clean data flow.
 * @param {'class' | 'id'} type - The attribute type to extract
 * @param {string} content - The HTML content to parse
 * @returns {Set<string>} - Set of extracted values
 */
const extractFromHtml = (type, content) => {
  const cleanLiquid = (content) =>
    content
      .replace(/\{\{-?[\s\S]*?-?\}\}/g, " ")
      .replace(/\{%-?[\s\S]*?-?%\}/g, " ");

  const normalizeWhitespace = (str) => str.replace(/\s+/g, " ").trim();
  const isValidClass = (cls) => cls && /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(cls);
  const isDynamicId = (val) => val.includes("{{") || val.includes("{%");
  const isNotEmpty = (val) => val.trim() !== "";
  const trim = (str) => str.trim();

  return type === "class"
    ? pipe(
        cleanLiquid,
        matchAll(/class="([^"]*)"/g),
        map(getMatch(1)),
        flatMap(pipe(normalizeWhitespace, split(" "))),
        filter(isValidClass),
        toSet,
      )(content)
    : pipe(
        matchAll(/id="([^"]*)"/g),
        map(getMatch(1)),
        filterMap((val) => !isDynamicId(val) && isNotEmpty(val), trim),
        toSet,
      )(content);
};

// ============================================
// Class/ID Extraction from JavaScript
// ============================================

const extractClassesFromJs = (content) => {
  const classes = new Set();

  const addClasses = (str) => {
    for (const cls of str.split(" ")) {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    }
  };

  // Match class="..." in template literals
  for (const match of content.matchAll(/class="([^"$]+)"/g)) {
    addClasses(match[1]);
  }

  // Match classList.add/remove/toggle("className")
  for (const match of content.matchAll(
    /\.classList\.(add|remove|toggle)\("([^"]+)"/g,
  )) {
    addClasses(match[2]);
  }

  // Match string concatenation for classes: classes += " past"
  for (const match of content.matchAll(/classes\s*\+=\s*["']([^"']+)["']/g)) {
    addClasses(match[1]);
  }

  // Match initial class assignment: let classes = "calendar-day"
  for (const match of content.matchAll(
    /(?:let|const|var)\s+classes\s*=\s*["']([^"']+)["']/g,
  )) {
    addClasses(match[1]);
  }

  return classes;
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
  const pattern = new RegExp(`${prefix}${escaped}(?=[\\s,:{\\[>+~.)#]|$)`, "m");
  return pattern.test(content);
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
    const addToMap = (map, items, file) => {
      for (const item of items) {
        if (!map.has(item)) map.set(item, []);
        map.get(item).push(file);
      }
    };

    const collectAllClassesAndIds = (htmlFiles, jsFiles) => {
      const allClasses = new Map(); // class -> [files where defined]
      const allIds = new Map(); // id -> [files where defined]

      // Extract from HTML files
      for (const file of htmlFiles) {
        const content = readFileSync(file, "utf-8");
        addToMap(allClasses, extractFromHtml("class", content), file);
        addToMap(allIds, extractFromHtml("id", content), file);
      }

      // Extract from JS files (dynamically created HTML)
      for (const file of jsFiles) {
        const content = readFileSync(file, "utf-8");
        addToMap(allClasses, extractClassesFromJs(content), file);
      }

      return { allClasses, allIds };
    };

    const findUnusedClassesAndIds = (
      allClasses,
      allIds,
      scssFiles,
      jsFiles,
      htmlFiles,
    ) => {
      const findIdReferencesInHtml = (content, idName) => {
        const escaped = idName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const patterns = [
          // href="#id" or href="/path/#id" anchor links
          new RegExp(`href=["'][^"']*#${escaped}["']`),
          // for="id" label associations
          new RegExp(`for=["']${escaped}["']`),
        ];

        return patterns.some((pattern) => pattern.test(content));
      };

      // Load all SCSS, JS, and HTML content
      const scssContent = scssFiles
        .map((f) => readFileSync(f, "utf-8"))
        .join("\n");
      const jsContent = jsFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
      const htmlContent = htmlFiles
        .map((f) => readFileSync(f, "utf-8"))
        .join("\n");

      const unusedClasses = [];
      const unusedIds = [];

      // Check each class
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

      // Check each ID
      for (const [idName, definedIn] of allIds) {
        const inScss = findSelectorReferencesInScss(scssContent, idName, "#");
        const inJs = findReferencesInJs("id")(idName)(jsContent);
        const inHtml = findIdReferencesInHtml(htmlContent, idName);

        if (!inScss && !inJs && !inHtml) {
          unusedIds.push({ name: idName, definedIn });
        }
      }

      return { unusedClasses, unusedIds };
    };

    // Use pre-computed file lists
    const htmlFiles = SRC_HTML_FILES().map((f) => join(rootDir, f));
    const scssFiles = SRC_SCSS_FILES().map((f) => join(rootDir, f));
    const jsFiles = PUBLIC_JS_FILES.map((f) => join(rootDir, f));

    // Collect all classes and IDs defined in HTML and JS
    const { allClasses, allIds } = collectAllClassesAndIds(htmlFiles, jsFiles);

    // Find unused ones
    const { unusedClasses, unusedIds } = findUnusedClassesAndIds(
      allClasses,
      allIds,
      scssFiles,
      jsFiles,
      htmlFiles,
    );

    // Report results
    const totalClasses = allClasses.size;
    const totalIds = allIds.size;

    console.log("\n  📊 Analysis Results:");
    console.log(`     Total classes found: ${totalClasses}`);
    console.log(`     Total IDs found: ${totalIds}`);
    console.log(`     Unused classes: ${unusedClasses.length}`);
    console.log(`     Unused IDs: ${unusedIds.length}`);

    const logUnused = (items, label) => {
      if (items.length === 0) return;
      console.log(`\n  ⚠️  Unused ${label}:`);
      for (const { name, definedIn } of items.sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const shortPaths = definedIn.map((f) => f.replace(/^src\//, ""));
        console.log(`     - "${name}" in: ${shortPaths.join(", ")}`);
      }
    };

    logUnused(unusedClasses, "Classes");
    logUnused(unusedIds, "IDs");

    // Fail the test if there are unused classes
    expect(unusedClasses.length).toBe(0);

    // Fail the test if there are unused IDs
    expect(unusedIds.length).toBe(0);
  });
});
