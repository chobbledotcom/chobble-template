// Unused CSS Classes and IDs Test
// Detects HTML classes and IDs that are never referenced in SCSS or JS files
// This helps identify dead code and potential cleanup opportunities

import { describe, test, expect } from "bun:test";
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
// Class/ID Extraction from HTML
// ============================================

const extractClassesFromHtml = (content) => {
  const classes = new Set();

  // First, remove all Liquid/Nunjucks blocks from the content
  // This handles nested quotes within {{ }} and {% %} blocks
  const cleanedContent = content
    // Remove {{ ... }} blocks (handles nested quotes)
    .replace(/\{\{-?[\s\S]*?-?\}\}/g, " ")
    // Remove {% ... %} blocks (handles nested quotes)
    .replace(/\{%-?[\s\S]*?-?%\}/g, " ");

  // Now match class="..." attributes (handles multiline)
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

    // Skip dynamic IDs with Liquid/Nunjucks interpolation
    if (idValue.includes("{{") || idValue.includes("{%")) {
      continue;
    }

    if (idValue.trim()) {
      ids.add(idValue.trim());
    }
  }

  return ids;
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
// Reference Detection in HTML
// ============================================

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

// ============================================
// Reference Detection in SCSS
// ============================================

const findClassReferencesInScss = (content, className) => {
  // Escape special regex characters in class name
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match .className in selectors (with word boundary or valid selector chars after)
  // This handles: .class, .class:hover, .class.other, .class[attr], .class>child, etc.
  const patterns = [new RegExp(`\\.${escaped}(?=[\\s,:{\\[>+~.)#]|$)`, "m")];

  return patterns.some((pattern) => pattern.test(content));
};

const findIdReferencesInScss = (content, idName) => {
  const escaped = idName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match #idName in selectors
  const pattern = new RegExp(`#${escaped}(?=[\\s,:{\\[>+~.#]|$)`, "m");

  return pattern.test(content);
};

// ============================================
// Reference Detection in JavaScript
// ============================================

const findClassReferencesInJs = (content, className) => {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    // querySelector/querySelectorAll with class
    new RegExp(`querySelector(?:All)?\\s*\\([^)]*\\.${escaped}[^)]*\\)`),
    // getElementsByClassName
    new RegExp(`getElementsByClassName\\s*\\(\\s*["']${escaped}["']`),
    // classList operations
    new RegExp(
      `classList\\.(add|remove|toggle|contains)\\(\\s*["']${escaped}["']`,
    ),
    // Class in template literal HTML
    new RegExp(`class=["'][^"']*\\b${escaped}\\b[^"']*["']`),
    // String containing class name (for dynamic class building)
    new RegExp(`["']\\s*${escaped}\\s*["']`),
    // CSS selector string like ".className" or ".className:hover"
    new RegExp(`["']\\.${escaped}[^"']*["']`),
    // closest() with class selector
    new RegExp(`closest\\s*\\([^)]*\\.${escaped}[^)]*\\)`),
  ];

  return patterns.some((pattern) => pattern.test(content));
};

const findIdReferencesInJs = (content, idName) => {
  const escaped = idName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    // getElementById
    new RegExp(`getElementById\\s*\\(\\s*["']${escaped}["']`),
    // querySelector with ID
    new RegExp(`querySelector(?:All)?\\s*\\([^)]*#${escaped}[^)]*\\)`),
    // ID in template literal HTML
    new RegExp(`id=["']${escaped}["']`),
    // ID stored in const object (e.g., ELEMENT_IDS = { form: "theme-editor-form" })
    new RegExp(`:\\s*["']${escaped}["']`),
    // ID stored in const variable (e.g., const CART_OVERLAY_ID = "cart-overlay")
    new RegExp(`=\\s*["']${escaped}["']`),
    // getTemplate("id") for native <template> elements
    new RegExp(`getTemplate\\s*\\(\\s*["']${escaped}["']`),
  ];

  if (patterns.some((pattern) => pattern.test(content))) {
    return true;
  }

  // Check for dynamic ID construction in template literals
  // e.g., getElementById(`${tabId}-tab`) where idName is "fonts-tab"
  // Match patterns like: getElementById(`${...}-suffix`)
  if (idName.includes("-")) {
    const suffix = idName.split("-").pop(); // e.g., "tab" from "fonts-tab"
    const dynamicPattern = new RegExp(
      `getElementById\\s*\\(\\s*\`\\$\\{[^}]+\\}-${suffix}\`\\s*\\)`,
    );
    if (dynamicPattern.test(content)) {
      return true;
    }
  }

  return false;
};

// ============================================
// Main Analysis Functions
// ============================================

/**
 * Add items from a Set to a Map with file tracking.
 */
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
    addToMap(allClasses, extractClassesFromHtml(content), file);
    addToMap(allIds, extractIdsFromHtml(content), file);
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
  // Load all SCSS, JS, and HTML content
  const scssContent = scssFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
  const jsContent = jsFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
  const htmlContent = htmlFiles.map((f) => readFileSync(f, "utf-8")).join("\n");

  const unusedClasses = [];
  const unusedIds = [];

  // Check each class
  for (const [className, definedIn] of allClasses) {
    const inScss = findClassReferencesInScss(scssContent, className);
    const inJs = findClassReferencesInJs(jsContent, className);

    if (!inScss && !inJs) {
      unusedClasses.push({ name: className, definedIn });
    }
  }

  // Check each ID
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

  test("Extracts ID names from HTML id attributes", () => {
    const html = `
      <div id="main-content">
        <span id="sidebar"></span>
      </div>
    `;
    const ids = extractIdsFromHtml(html);
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
    expect(findClassReferencesInJs(js, "cart-item")).toBe(true);
    expect(findClassReferencesInJs(js, "active")).toBe(true);
    expect(findClassReferencesInJs(js, "dynamic")).toBe(true);
  });

  test("Finds ID references in SCSS and JS", () => {
    const scss = "#main-nav { display: flex; }";
    const js = `document.getElementById("sidebar");`;

    expect(findIdReferencesInScss(scss, "main-nav")).toBe(true);
    expect(findIdReferencesInJs(js, "sidebar")).toBe(true);
  });

  test("Scans project files and reports unused classes/IDs", () => {
    // Use pre-computed file lists
    const htmlFiles = SRC_HTML_FILES.map((f) => join(rootDir, f));
    const scssFiles = SRC_SCSS_FILES.map((f) => join(rootDir, f));
    const jsFiles = ASSET_JS_FILES.map((f) => join(rootDir, f));

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
