// Unused CSS Classes and IDs Test
// Detects HTML classes and IDs that are never referenced in SCSS or JS files
// This helps identify dead code and potential cleanup opportunities

import {
  createTestRunner,
  expectTrue,
  fs,
  getFiles,
  path,
  rootDir,
  SRC_HTML_FILES,
  SRC_SCSS_FILES,
} from "./test-utils.js";

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
  let cleanedContent = content
    // Remove {{ ... }} blocks (handles nested quotes)
    .replace(/\{\{-?[\s\S]*?-?\}\}/g, " ")
    // Remove {% ... %} blocks (handles nested quotes)
    .replace(/\{%-?[\s\S]*?-?%\}/g, " ");

  // Now match class="..." attributes (handles multiline)
  const classAttrRegex = /class="([^"]*)"/g;
  let match;

  while ((match = classAttrRegex.exec(cleanedContent)) !== null) {
    const classValue = match[1]
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Split by whitespace and add valid class names only
    // Valid CSS class names: start with letter, underscore, or hyphen,
    // followed by letters, digits, underscores, or hyphens
    const validClassRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

    classValue.split(" ").forEach((cls) => {
      if (cls && validClassRegex.test(cls)) {
        classes.add(cls);
      }
    });
  }

  return classes;
};

const extractIdsFromHtml = (content) => {
  const ids = new Set();

  // Match id="..." attributes
  const idAttrRegex = /id="([^"]*)"/g;
  let match;

  while ((match = idAttrRegex.exec(content)) !== null) {
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

  // Match class="..." in template literals
  const templateClassRegex = /class="([^"$]+)"/g;
  let match;

  while ((match = templateClassRegex.exec(content)) !== null) {
    match[1].split(" ").forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    });
  }

  // Match classList.add/remove/toggle("className")
  const classListRegex = /\.classList\.(add|remove|toggle)\("([^"]+)"/g;
  while ((match = classListRegex.exec(content)) !== null) {
    match[2].split(" ").forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    });
  }

  // Match string concatenation for classes: classes += " past"
  const classConcat = /classes\s*\+=\s*["']([^"']+)["']/g;
  while ((match = classConcat.exec(content)) !== null) {
    match[1].split(" ").forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    });
  }

  // Match initial class assignment: let classes = "calendar-day"
  const classAssign = /(?:let|const|var)\s+classes\s*=\s*["']([^"']+)["']/g;
  while ((match = classAssign.exec(content)) !== null) {
    match[1].split(" ").forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    });
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

const collectAllClassesAndIds = (htmlFiles, jsFiles) => {
  const allClasses = new Map(); // class -> [files where defined]
  const allIds = new Map(); // id -> [files where defined]

  // Extract from HTML files
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf-8");
    const classes = extractClassesFromHtml(content);
    const ids = extractIdsFromHtml(content);

    for (const cls of classes) {
      if (!allClasses.has(cls)) {
        allClasses.set(cls, []);
      }
      allClasses.get(cls).push(file);
    }

    for (const id of ids) {
      if (!allIds.has(id)) {
        allIds.set(id, []);
      }
      allIds.get(id).push(file);
    }
  }

  // Extract from JS files (dynamically created HTML)
  for (const file of jsFiles) {
    const content = readFileSync(file, "utf-8");
    const classes = extractClassesFromJs(content);

    for (const cls of classes) {
      if (!allClasses.has(cls)) {
        allClasses.set(cls, []);
      }
      allClasses.get(cls).push(file);
    }
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

const testCases = [
  {
    name: "extract-classes-from-html",
    description: "Extracts class names from HTML class attributes",
    test: () => {
      const html = `
        <div class="foo bar">
          <span class="baz"></span>
        </div>
      `;
      const classes = extractClassesFromHtml(html);
      expectTrue(classes.has("foo"), "Should extract 'foo'");
      expectTrue(classes.has("bar"), "Should extract 'bar'");
      expectTrue(classes.has("baz"), "Should extract 'baz'");
    },
  },
  {
    name: "extract-classes-with-liquid",
    description: "Handles Liquid/Nunjucks in class attributes",
    test: () => {
      const html = `
        <div class="static {% if x %}conditional{% endif %}">
        <span class="{{ variable }} another"></span>
      `;
      const classes = extractClassesFromHtml(html);
      expectTrue(classes.has("static"), "Should extract static class");
      expectTrue(classes.has("another"), "Should extract 'another'");
      // Conditional and variable classes are stripped
    },
  },
  {
    name: "extract-ids-from-html",
    description: "Extracts ID names from HTML id attributes",
    test: () => {
      const html = `
        <div id="main-content">
          <span id="sidebar"></span>
        </div>
      `;
      const ids = extractIdsFromHtml(html);
      expectTrue(ids.has("main-content"), "Should extract 'main-content'");
      expectTrue(ids.has("sidebar"), "Should extract 'sidebar'");
    },
  },
  {
    name: "extract-classes-from-js",
    description: "Extracts classes from JS template literals",
    test: () => {
      const js = `
        const html = \`<div class="cart-item">
          <span class="item-name item-bold"></span>
        </div>\`;
        icon.classList.add("active");
        let classes = "base-class";
        classes += " extra";
      `;
      const classes = extractClassesFromJs(js);
      expectTrue(classes.has("cart-item"), "Should extract 'cart-item'");
      expectTrue(classes.has("item-name"), "Should extract 'item-name'");
      expectTrue(
        classes.has("active"),
        "Should extract 'active' from classList",
      );
      expectTrue(classes.has("base-class"), "Should extract from assignment");
      expectTrue(classes.has("extra"), "Should extract from concatenation");
    },
  },
  {
    name: "find-class-references-in-scss",
    description: "Finds class selectors in SCSS content",
    test: () => {
      const scss = `
        .cart-item { color: red; }
        .cart-item:hover { color: blue; }
        .cart-item.active { font-weight: bold; }
        .unused-class { display: none; }
      `;
      expectTrue(
        findClassReferencesInScss(scss, "cart-item"),
        "Should find .cart-item",
      );
      expectTrue(
        findClassReferencesInScss(scss, "active"),
        "Should find .active",
      );
      expectTrue(
        !findClassReferencesInScss(scss, "nonexistent"),
        "Should not find nonexistent class",
      );
    },
  },
  {
    name: "find-class-references-in-js",
    description: "Finds class references in JS content",
    test: () => {
      const js = `
        document.querySelector(".cart-item");
        element.classList.contains("active");
        const html = \`<div class="dynamic"></div>\`;
      `;
      expectTrue(
        findClassReferencesInJs(js, "cart-item"),
        "Should find in querySelector",
      );
      expectTrue(
        findClassReferencesInJs(js, "active"),
        "Should find in classList",
      );
      expectTrue(
        findClassReferencesInJs(js, "dynamic"),
        "Should find in template",
      );
    },
  },
  {
    name: "find-id-references",
    description: "Finds ID references in SCSS and JS",
    test: () => {
      const scss = "#main-nav { display: flex; }";
      const js = `document.getElementById("sidebar");`;

      expectTrue(
        findIdReferencesInScss(scss, "main-nav"),
        "Should find #main-nav in SCSS",
      );
      expectTrue(
        findIdReferencesInJs(js, "sidebar"),
        "Should find getElementById",
      );
    },
  },
  {
    name: "detect-unused-classes-in-project",
    description: "Scans project files and reports unused classes/IDs",
    test: () => {
      // Use pre-computed file lists
      const htmlFiles = SRC_HTML_FILES.map((f) => join(rootDir, f));
      const scssFiles = SRC_SCSS_FILES.map((f) => join(rootDir, f));
      const jsFiles = ASSET_JS_FILES.map((f) => join(rootDir, f));

      // Collect all classes and IDs defined in HTML and JS
      const { allClasses, allIds } = collectAllClassesAndIds(
        htmlFiles,
        jsFiles,
      );

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

      if (unusedClasses.length > 0) {
        console.log(`\n  ⚠️  Unused Classes:`);
        for (const { name, definedIn } of unusedClasses.sort((a, b) =>
          a.name.localeCompare(b.name),
        )) {
          const shortPaths = definedIn.map((f) => f.replace(/^src\//, ""));
          console.log(`     - "${name}" in: ${shortPaths.join(", ")}`);
        }
      }

      if (unusedIds.length > 0) {
        console.log(`\n  ⚠️  Unused IDs:`);
        for (const { name, definedIn } of unusedIds.sort((a, b) =>
          a.name.localeCompare(b.name),
        )) {
          const shortPaths = definedIn.map((f) => f.replace(/^src\//, ""));
          console.log(`     - "${name}" in: ${shortPaths.join(", ")}`);
        }
      }

      // Fail the test if there are unused classes
      expectTrue(
        unusedClasses.length === 0,
        `Found ${unusedClasses.length} unused CSS classes`,
      );

      // Fail the test if there are unused IDs
      expectTrue(
        unusedIds.length === 0,
        `Found ${unusedIds.length} unused IDs`,
      );
    },
  },
];

export default createTestRunner("unused-classes", testCases);
