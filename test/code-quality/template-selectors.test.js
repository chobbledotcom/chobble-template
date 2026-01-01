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

// Extract IDS from the file
function extractIds() {
  const match = selectorsContent.match(/export const IDS = \{([^}]+)\}/);
  if (!match) return {};
  const idsObj = {};
  const pairs = match[1].matchAll(/(\w+):\s*"([^"]+)"/g);
  for (const [, key, value] of pairs) {
    idsObj[key] = value;
  }
  return idsObj;
}

// Extract CLASSES object from file (nested structure)
function extractClasses() {
  const match = selectorsContent.match(
    /export const CLASSES = \{([\s\S]*?)\n\};/,
  );
  if (!match) return {};

  const classes = {};
  // Match each top-level group like QUANTITY: {...}, CART_ITEM: {...}
  const groupRegex = /(\w+):\s*\{([^}]+)\}/g;
  const groupMatches = match[1].matchAll(groupRegex);

  for (const [, groupName, groupContent] of groupMatches) {
    classes[groupName] = {};
    const pairs = groupContent.matchAll(/(\w+):\s*"([^"]+)"/g);
    for (const [, key, value] of pairs) {
      classes[groupName][key] = value;
    }
  }
  return classes;
}

// Extract TEMPLATE_DEFINITIONS to understand which classes each template needs
function extractTemplateDefinitions() {
  const match = selectorsContent.match(
    /export const TEMPLATE_DEFINITIONS = \{([\s\S]*?)\n\};/,
  );
  if (!match) return {};

  const definitions = {};
  // Match blocks like [IDS.CART_ITEM]: { ... classes: [...] }
  const templateBlocks = match[1].matchAll(
    /\[IDS\.(\w+)\]:\s*\{[^}]*classes:\s*\[([\s\S]*?)\]/g,
  );

  for (const [, templateKey, classList] of templateBlocks) {
    // Extract class references like CLASSES.CART_ITEM.NAME
    const classRefs = classList.matchAll(/CLASSES\.(\w+)\.(\w+)/g);
    definitions[templateKey] = [];
    for (const [, groupName, propName] of classRefs) {
      definitions[templateKey].push({ groupName, propName });
    }
  }
  return definitions;
}

const IDS = extractIds();
const CLASSES = extractClasses();
const TEMPLATE_DEFINITIONS = extractTemplateDefinitions();

// Build a lookup for Liquid variable expansion
function buildLiquidLookup() {
  const lookup = {};

  // Add IDS
  for (const [key, value] of Object.entries(IDS)) {
    lookup[`selectors.IDS.${key}`] = value;
  }

  // Add CLASSES
  for (const [groupName, group] of Object.entries(CLASSES)) {
    for (const [key, value] of Object.entries(group)) {
      lookup[`selectors.${groupName}.${key}`] = value;
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

  // Process Liquid includes
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
    for (const [key, id] of Object.entries(IDS)) {
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
      const templateId = IDS[templateKey];
      if (!templateId) continue;

      describe(`${templateId}`, () => {
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

        const content = templateEl.content || templateEl;

        for (const { groupName, propName } of classRefs) {
          const classGroup = CLASSES[groupName];
          if (!classGroup) continue;

          const className = classGroup[propName];
          if (!className) continue;

          it(`has class CLASSES.${groupName}.${propName} (${className})`, () => {
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

describe("Selector constants usage verification", () => {
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

  describe("IDS are used in JS", () => {
    for (const [key, id] of Object.entries(IDS)) {
      it(`IDS.${key} is used`, () => {
        const isUsed = jsContent.includes(`IDS.${key}`);
        assert.ok(isUsed, `IDS.${key} (${id}) is defined but not used`);
      });
    }
  });

  describe("SEL groups are used in JS", () => {
    for (const groupName of Object.keys(CLASSES)) {
      it(`SEL.${groupName} is used`, () => {
        const isUsed = jsContent.includes(`SEL.${groupName}`);
        assert.ok(isUsed, `SEL.${groupName} is defined but not used`);
      });
    }
  });
});

describe("HTML templates use selector constants", () => {
  const templateFiles = ["cart.html", "gallery.html", "quantity-controls.html"];

  // Build set of all class values from CLASSES
  const allClassValues = new Set();
  for (const group of Object.values(CLASSES)) {
    for (const value of Object.values(group)) {
      allClassValues.add(value);
    }
  }

  for (const filename of templateFiles) {
    const filepath = path.join(templatesDir, filename);
    if (!fs.existsSync(filepath)) continue;

    const content = fs.readFileSync(filepath, "utf-8");

    it(`${filename} uses Liquid selectors for template IDs`, () => {
      const hardcodedIds = content.match(/id="[^{][^"]*-template"/g) || [];
      assert.strictEqual(
        hardcodedIds.length,
        0,
        `Found hardcoded template IDs: ${hardcodedIds.join(", ")}`,
      );
    });

    it(`${filename} uses Liquid selectors for main classes`, () => {
      const hardcodedClasses = [];
      const classMatches = content.matchAll(/class="([^"]+)"/g);

      for (const [, classValue] of classMatches) {
        if (classValue.includes("{{")) continue;

        for (const cls of classValue.split(" ")) {
          const trimmed = cls.trim();
          if (trimmed && allClassValues.has(trimmed)) {
            hardcodedClasses.push(trimmed);
          }
        }
      }

      assert.strictEqual(
        hardcodedClasses.length,
        0,
        `Found hardcoded classes: ${hardcodedClasses.join(", ")}`,
      );
    });
  }
});
