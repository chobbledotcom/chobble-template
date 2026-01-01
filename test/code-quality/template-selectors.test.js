// Template selector contract tests
// Verifies that HTML templates contain all required classes defined in selectors.js

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

// We can't import ES modules directly, so read and parse the selectors file
const selectorsPath = path.join(process.cwd(), "src/assets/js/selectors.js");
const selectorsContent = fs.readFileSync(selectorsPath, "utf-8");

// Extract TEMPLATE_IDS from the file
function extractTemplateIds() {
  const match = selectorsContent.match(
    /export const TEMPLATE_IDS = \{([^}]+)\}/,
  );
  if (!match) return {};
  const idsObj = {};
  const pairs = match[1].matchAll(/(\w+):\s*"([^"]+)"/g);
  for (const [, key, value] of pairs) {
    idsObj[key] = value;
  }
  return idsObj;
}

// Extract class constants from file (now _CLASSES instead of _SELECTORS)
function extractClassObjects() {
  const objects = {};
  const regex = /export const (\w+_CLASSES) = \{([^}]+)\}/g;
  const matches = selectorsContent.matchAll(regex);
  for (const [, name, content] of matches) {
    const classes = {};
    const pairs = content.matchAll(/(\w+):\s*"([^"]+)"/g);
    for (const [, key, value] of pairs) {
      classes[key] = value;
    }
    objects[name] = classes;
  }
  return objects;
}

// Extract TEMPLATE_DEFINITIONS to understand which classes each template needs
function extractTemplateDefinitions() {
  // Parse the TEMPLATE_DEFINITIONS block
  const match = selectorsContent.match(
    /export const TEMPLATE_DEFINITIONS = \{([\s\S]*?)\n\};/,
  );
  if (!match) return {};

  const definitions = {};
  const templateBlocks = match[1].matchAll(
    /\[TEMPLATE_IDS\.(\w+)\]:\s*\{[^}]*classes:\s*\[([\s\S]*?)\]/g,
  );

  for (const [, templateKey, classList] of templateBlocks) {
    // Extract class references from the list
    const classRefs = classList.matchAll(/(\w+_CLASSES)\.(\w+)/g);
    definitions[templateKey] = [];
    for (const [, objName, propName] of classRefs) {
      definitions[templateKey].push({ objName, propName });
    }
  }
  return definitions;
}

const TEMPLATE_IDS = extractTemplateIds();
const CLASS_OBJECTS = extractClassObjects();
const TEMPLATE_DEFINITIONS = extractTemplateDefinitions();

// Build a lookup for Liquid variable expansion
// Maps "selectors.CART_ITEM.NAME" -> "cart-item-name"
function buildLiquidLookup() {
  const lookup = {};

  // Add TEMPLATE_IDS
  for (const [key, value] of Object.entries(TEMPLATE_IDS)) {
    lookup[`selectors.TEMPLATE_IDS.${key}`] = value;
  }

  // Add class objects with short names (QUANTITY, CART_ITEM, etc.)
  const shortNames = {
    QUANTITY_CLASSES: "QUANTITY",
    CART_ITEM_CLASSES: "CART_ITEM",
    QUOTE_CART_ITEM_CLASSES: "QUOTE_CART_ITEM",
    QUOTE_CHECKOUT_ITEM_CLASSES: "QUOTE_CHECKOUT_ITEM",
    GALLERY_NAV_CLASSES: "GALLERY_NAV",
  };

  for (const [objName, classes] of Object.entries(CLASS_OBJECTS)) {
    const shortName = shortNames[objName] || objName;
    for (const [key, value] of Object.entries(classes)) {
      lookup[`selectors.${shortName}.${key}`] = value;
    }
  }

  return lookup;
}

const LIQUID_LOOKUP = buildLiquidLookup();

// Expand Liquid variables in template content
function expandLiquidVars(content) {
  return content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, varName) => {
    const value = LIQUID_LOOKUP[varName.trim()];
    return value !== undefined ? value : match;
  });
}

// Load and parse HTML template files
const templatesDir = path.join(process.cwd(), "src/_includes/templates");

function loadTemplate(filename) {
  const filepath = path.join(templatesDir, filename);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  let content = fs.readFileSync(filepath, "utf-8");

  // Process Liquid includes - replace with the included file content
  content = content.replace(
    /\{%\s*include\s*["']templates\/([^"']+)["']\s*%\}/g,
    (_, includePath) => {
      const includeFile = path.join(templatesDir, includePath);
      if (fs.existsSync(includeFile)) {
        return fs.readFileSync(includeFile, "utf-8");
      }
      return "";
    },
  );

  // Expand Liquid variables
  content = expandLiquidVars(content);

  return new JSDOM(content);
}

// Load all template files
const cartTemplates = loadTemplate("cart.html");
const galleryTemplates = loadTemplate("gallery.html");

describe("Template selector contracts", () => {
  describe("All template IDs exist in HTML", () => {
    for (const [key, id] of Object.entries(TEMPLATE_IDS)) {
      it(`template "${id}" (${key}) exists`, () => {
        let found = false;
        for (const dom of [cartTemplates, galleryTemplates]) {
          if (dom?.window.document.getElementById(id)) {
            found = true;
            break;
          }
        }
        assert.ok(
          found,
          `Template with id="${id}" not found in any template file`,
        );
      });
    }
  });

  describe("All required classes exist in templates", () => {
    for (const [templateKey, classRefs] of Object.entries(
      TEMPLATE_DEFINITIONS,
    )) {
      const templateId = TEMPLATE_IDS[templateKey];
      if (!templateId) continue;

      describe(`${templateId}`, () => {
        // Find the template in DOM
        let templateEl = null;
        for (const dom of [cartTemplates, galleryTemplates]) {
          if (dom) {
            templateEl = dom.window.document.getElementById(templateId);
            if (templateEl) break;
          }
        }

        if (!templateEl) {
          it(`template exists`, () => {
            assert.fail(`Template "${templateId}" not found`);
          });
          return;
        }

        // Get template content
        const content = templateEl.content || templateEl;

        for (const { objName, propName } of classRefs) {
          const classObj = CLASS_OBJECTS[objName];
          if (!classObj) continue;

          const className = classObj[propName];
          if (!className) continue;

          it(`has class ${objName}.${propName} (${className})`, () => {
            // Convert class name to selector by adding the dot
            const element = content.querySelector(`.${className}`);
            assert.ok(
              element,
              `Class "${className}" not found in template "${templateId}"`,
            );
          });
        }
      });
    }
  });
});

describe("Class constants usage verification", () => {
  // Read JS files that use templates
  const jsFiles = [
    "src/assets/js/cart.js",
    "src/assets/js/quote.js",
    "src/assets/js/quote-checkout.js",
    "src/assets/js/gallery.js",
    "src/assets/js/template.js",
    "src/assets/js/cart-utils.js",
  ];

  const jsContent = jsFiles
    .map((f) => {
      const filepath = path.join(process.cwd(), f);
      return fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : "";
    })
    .join("\n");

  describe("TEMPLATE_IDS are used in JS", () => {
    for (const [key, id] of Object.entries(TEMPLATE_IDS)) {
      it(`TEMPLATE_IDS.${key} is used`, () => {
        const isUsed = jsContent.includes(`TEMPLATE_IDS.${key}`);
        assert.ok(
          isUsed,
          `TEMPLATE_IDS.${key} (${id}) is defined but not used in JS files`,
        );
      });
    }
  });

  describe("All exported class objects are used", () => {
    for (const objName of Object.keys(CLASS_OBJECTS)) {
      it(`${objName} is imported somewhere`, () => {
        const isUsed = jsContent.includes(objName);
        assert.ok(isUsed, `${objName} is defined but not used in JS files`);
      });
    }
  });
});

describe("HTML templates use selector constants", () => {
  // Verify that templates use Liquid variables instead of hardcoded class names
  const templateFiles = ["cart.html", "gallery.html", "quantity-controls.html"];

  for (const filename of templateFiles) {
    const filepath = path.join(templatesDir, filename);
    if (!fs.existsSync(filepath)) continue;

    const content = fs.readFileSync(filepath, "utf-8");

    it(`${filename} uses Liquid selectors for template IDs`, () => {
      // Check that template IDs use selectors variable
      const hardcodedIds = content.match(/id="[^{][^"]*-template"/g) || [];
      assert.strictEqual(
        hardcodedIds.length,
        0,
        `Found hardcoded template IDs: ${hardcodedIds.join(", ")}`,
      );
    });

    it(`${filename} uses Liquid selectors for main classes`, () => {
      // Check for hardcoded classes that should use selectors
      const hardcodedClasses = [];
      const classMatches = content.matchAll(/class="([^"]+)"/g);

      // Build set of all selector class values
      const selectorClassValues = new Set();
      for (const classes of Object.values(CLASS_OBJECTS)) {
        for (const value of Object.values(classes)) {
          selectorClassValues.add(value);
        }
      }

      for (const [, classValue] of classMatches) {
        // Skip if it contains a Liquid variable
        if (classValue.includes("{{")) continue;

        // Check each class in the attribute
        for (const cls of classValue.split(" ")) {
          const trimmed = cls.trim();
          // Only flag if this exact class is defined in selectors
          if (trimmed && selectorClassValues.has(trimmed)) {
            hardcodedClasses.push(trimmed);
          }
        }
      }

      assert.strictEqual(
        hardcodedClasses.length,
        0,
        `Found hardcoded classes that should use selectors: ${hardcodedClasses.join(", ")}`,
      );
    });
  }
});
