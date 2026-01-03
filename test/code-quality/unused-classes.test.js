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

const { readFileSync } = fs;
const { join } = path;

// Asset JS files need a separate pattern (not in the standard SRC_JS_FILES)
const ASSET_JS_FILES = getFiles(/^src\/assets\/js\/.*\.js$/);

// ============================================
// CSS Analyzer Factory
// Consolidates all class/ID extraction and reference detection
// ============================================

/**
 * Factory function that creates a CSS analyzer with methods for:
 * - Extracting classes/IDs from HTML and JS
 * - Finding references in SCSS, JS, and HTML
 * - Analyzing unused classes and IDs across a project
 */
const createCSSAnalyzer = () => {
  // ----------------------------------------
  // Internal helper: escape regex special chars
  // ----------------------------------------
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ----------------------------------------
  // Extraction methods
  // ----------------------------------------

  const extractClassesFromHtml = (content) => {
    const classes = new Set();

    // Remove Liquid/Nunjucks blocks from the content
    const cleanedContent = content
      .replace(/\{\{-?[\s\S]*?-?\}\}/g, " ")
      .replace(/\{%-?[\s\S]*?-?%\}/g, " ");

    const classAttrRegex = /class="([^"]*)"/g;
    const validClassRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

    for (const match of cleanedContent.matchAll(classAttrRegex)) {
      const classValue = match[1].replace(/\s+/g, " ").trim();
      for (const cls of classValue.split(" ")) {
        if (cls && validClassRegex.test(cls)) {
          classes.add(cls);
        }
      }
    }

    return classes;
  };

  const extractIdsFromHtml = (content) => {
    const ids = new Set();
    const idAttrRegex = /id="([^"]*)"/g;

    for (const match of content.matchAll(idAttrRegex)) {
      const idValue = match[1];
      if (idValue.includes("{{") || idValue.includes("{%")) continue;
      if (idValue.trim()) ids.add(idValue.trim());
    }

    return ids;
  };

  const extractClassesFromJs = (content) => {
    const classes = new Set();

    const addClasses = (str) => {
      for (const cls of str.split(" ")) {
        if (cls.trim()) classes.add(cls.trim());
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

  // ----------------------------------------
  // Reference detection methods
  // ----------------------------------------

  const findClassReferencesInScss = (content, className) => {
    const escaped = escapeRegex(className);
    const pattern = new RegExp(`\\.${escaped}(?=[\\s,:{\\[>+~.)#]|$)`, "m");
    return pattern.test(content);
  };

  const findIdReferencesInScss = (content, idName) => {
    const escaped = escapeRegex(idName);
    const pattern = new RegExp(`#${escaped}(?=[\\s,:{\\[>+~.#]|$)`, "m");
    return pattern.test(content);
  };

  const findClassReferencesInJs = (content, className) => {
    const escaped = escapeRegex(className);

    const patterns = [
      new RegExp(`querySelector(?:All)?\\s*\\([^)]*\\.${escaped}[^)]*\\)`),
      new RegExp(`getElementsByClassName\\s*\\(\\s*["']${escaped}["']`),
      new RegExp(
        `classList\\.(add|remove|toggle|contains)\\(\\s*["']${escaped}["']`,
      ),
      new RegExp(`class=["'][^"']*\\b${escaped}\\b[^"']*["']`),
      new RegExp(`["']\\s*${escaped}\\s*["']`),
      new RegExp(`["']\\.${escaped}[^"']*["']`),
      new RegExp(`closest\\s*\\([^)]*\\.${escaped}[^)]*\\)`),
    ];

    return patterns.some((pattern) => pattern.test(content));
  };

  const findIdReferencesInJs = (content, idName) => {
    const escaped = escapeRegex(idName);

    const patterns = [
      new RegExp(`getElementById\\s*\\(\\s*["']${escaped}["']`),
      new RegExp(`querySelector(?:All)?\\s*\\([^)]*#${escaped}[^)]*\\)`),
      new RegExp(`id=["']${escaped}["']`),
      new RegExp(`:\\s*["']${escaped}["']`),
      new RegExp(`=\\s*["']${escaped}["']`),
      new RegExp(`getTemplate\\s*\\(\\s*["']${escaped}["']`),
    ];

    if (patterns.some((pattern) => pattern.test(content))) return true;

    // Check for dynamic ID construction in template literals
    if (idName.includes("-")) {
      const suffix = idName.split("-").pop();
      const dynamicPattern = new RegExp(
        `getElementById\\s*\\(\\s*\`\\$\\{[^}]+\\}-${suffix}\`\\s*\\)`,
      );
      if (dynamicPattern.test(content)) return true;
    }

    return false;
  };

  const findIdReferencesInHtml = (content, idName) => {
    const escaped = escapeRegex(idName);

    const patterns = [
      new RegExp(`href=["'][^"']*#${escaped}["']`),
      new RegExp(`for=["']${escaped}["']`),
    ];

    return patterns.some((pattern) => pattern.test(content));
  };

  // ----------------------------------------
  // Analysis methods
  // ----------------------------------------

  const collectAllClassesAndIds = (htmlFiles, jsFiles) => {
    const allClasses = new Map();
    const allIds = new Map();

    const addToMap = (map, items, file) => {
      for (const item of items) {
        if (!map.has(item)) map.set(item, []);
        map.get(item).push(file);
      }
    };

    for (const file of htmlFiles) {
      const content = readFileSync(file, "utf-8");
      addToMap(allClasses, extractClassesFromHtml(content), file);
      addToMap(allIds, extractIdsFromHtml(content), file);
    }

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
    const scssContent = scssFiles
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");
    const jsContent = jsFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
    const htmlContent = htmlFiles
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");

    const unusedClasses = [];
    const unusedIds = [];

    for (const [className, definedIn] of allClasses) {
      const inScss = findClassReferencesInScss(scssContent, className);
      const inJs = findClassReferencesInJs(jsContent, className);
      if (!inScss && !inJs) {
        unusedClasses.push({ name: className, definedIn });
      }
    }

    for (const [idName, definedIn] of allIds) {
      const inScss = findIdReferencesInScss(scssContent, idName);
      const inJs = findIdReferencesInJs(jsContent, idName);
      const inHtml = findIdReferencesInHtml(htmlContent, idName);
      if (!inScss && !inJs && !inHtml) {
        unusedIds.push({ name: idName, definedIn });
      }
    }

    return { unusedClasses, unusedIds };
  };

  // Return the analyzer interface
  return {
    // Extraction
    extractClassesFromHtml,
    extractIdsFromHtml,
    extractClassesFromJs,
    // Reference detection
    findClassReferencesInScss,
    findIdReferencesInScss,
    findClassReferencesInJs,
    findIdReferencesInJs,
    findIdReferencesInHtml,
    // Analysis
    collectAllClassesAndIds,
    findUnusedClassesAndIds,
  };
};

// Create a shared analyzer instance for tests
const cssAnalyzer = createCSSAnalyzer();

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
    const classes = cssAnalyzer.extractClassesFromHtml(html);
    expect(classes.has("foo")).toBe(true);
    expect(classes.has("bar")).toBe(true);
    expect(classes.has("baz")).toBe(true);
  });

  test("Handles Liquid/Nunjucks in class attributes", () => {
    const html = `
      <div class="static {% if x %}conditional{% endif %}">
      <span class="{{ variable }} another"></span>
    `;
    const classes = cssAnalyzer.extractClassesFromHtml(html);
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
    const ids = cssAnalyzer.extractIdsFromHtml(html);
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
    const classes = cssAnalyzer.extractClassesFromJs(js);
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
    expect(cssAnalyzer.findClassReferencesInScss(scss, "cart-item")).toBe(true);
    expect(cssAnalyzer.findClassReferencesInScss(scss, "active")).toBe(true);
    expect(cssAnalyzer.findClassReferencesInScss(scss, "nonexistent")).toBe(
      false,
    );
  });

  test("Finds class references in JS content", () => {
    const js = `
      document.querySelector(".cart-item");
      element.classList.contains("active");
      const html = \`<div class="dynamic"></div>\`;
    `;
    expect(cssAnalyzer.findClassReferencesInJs(js, "cart-item")).toBe(true);
    expect(cssAnalyzer.findClassReferencesInJs(js, "active")).toBe(true);
    expect(cssAnalyzer.findClassReferencesInJs(js, "dynamic")).toBe(true);
  });

  test("Finds ID references in SCSS and JS", () => {
    const scss = "#main-nav { display: flex; }";
    const js = `document.getElementById("sidebar");`;

    expect(cssAnalyzer.findIdReferencesInScss(scss, "main-nav")).toBe(true);
    expect(cssAnalyzer.findIdReferencesInJs(js, "sidebar")).toBe(true);
  });

  test("Scans project files and reports unused classes/IDs", () => {
    // Use pre-computed file lists
    const htmlFiles = SRC_HTML_FILES.map((f) => join(rootDir, f));
    const scssFiles = SRC_SCSS_FILES.map((f) => join(rootDir, f));
    const jsFiles = ASSET_JS_FILES.map((f) => join(rootDir, f));

    // Collect all classes and IDs defined in HTML and JS
    const { allClasses, allIds } = cssAnalyzer.collectAllClassesAndIds(
      htmlFiles,
      jsFiles,
    );

    // Find unused ones
    const { unusedClasses, unusedIds } = cssAnalyzer.findUnusedClassesAndIds(
      allClasses,
      allIds,
      scssFiles,
      jsFiles,
      htmlFiles,
    );

    // Report results
    const totalClasses = allClasses.size;
    const totalIds = allIds.size;

    console.log(`\n  📊 Analysis Results:`);
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
