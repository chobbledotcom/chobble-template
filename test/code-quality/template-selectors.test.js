// Template selector contract tests
// Verifies that HTML templates contain all required selectors defined in selectors.js

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

// Extract selector constants from file
function extractSelectorObjects() {
  const objects = {};
  const regex = /export const (\w+_SELECTORS) = \{([^}]+)\}/g;
  const matches = selectorsContent.matchAll(regex);
  for (const [, name, content] of matches) {
    const selectors = {};
    const pairs = content.matchAll(/(\w+):\s*"([^"]+)"/g);
    for (const [, key, value] of pairs) {
      selectors[key] = value;
    }
    objects[name] = selectors;
  }
  return objects;
}

// Extract TEMPLATE_DEFINITIONS to understand which selectors each template needs
function extractTemplateDefinitions() {
  // Parse the TEMPLATE_DEFINITIONS block
  const match = selectorsContent.match(
    /export const TEMPLATE_DEFINITIONS = \{([\s\S]*?)\n\};/,
  );
  if (!match) return {};

  const definitions = {};
  const templateBlocks = match[1].matchAll(
    /\[TEMPLATE_IDS\.(\w+)\]:\s*\{[^}]*selectors:\s*\[([\s\S]*?)\]/g,
  );

  for (const [, templateKey, selectorsList] of templateBlocks) {
    // Extract selector references from the list
    const selectorRefs = selectorsList.matchAll(/(\w+_SELECTORS)\.(\w+)/g);
    definitions[templateKey] = [];
    for (const [, objName, propName] of selectorRefs) {
      definitions[templateKey].push({ objName, propName });
    }
  }
  return definitions;
}

const TEMPLATE_IDS = extractTemplateIds();
const SELECTOR_OBJECTS = extractSelectorObjects();
const TEMPLATE_DEFINITIONS = extractTemplateDefinitions();

// Load and parse HTML template files
const templatesDir = path.join(process.cwd(), "src/_includes/templates");

function loadTemplate(filename) {
  const filepath = path.join(templatesDir, filename);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, "utf-8");
  // Process Liquid includes - replace with the included file content
  const processedContent = content.replace(
    /\{%\s*include\s*["']templates\/([^"']+)["']\s*%\}/g,
    (_, includePath) => {
      const includeFile = path.join(templatesDir, includePath);
      if (fs.existsSync(includeFile)) {
        return fs.readFileSync(includeFile, "utf-8");
      }
      return "";
    },
  );
  return new JSDOM(processedContent);
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

  describe("All required selectors exist in templates", () => {
    for (const [templateKey, selectorRefs] of Object.entries(
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

        for (const { objName, propName } of selectorRefs) {
          const selectorObj = SELECTOR_OBJECTS[objName];
          if (!selectorObj) continue;

          const selector = selectorObj[propName];
          if (!selector) continue;

          it(`has selector ${objName}.${propName} (${selector})`, () => {
            const element = content.querySelector(selector);
            assert.ok(
              element,
              `Selector "${selector}" not found in template "${templateId}"`,
            );
          });
        }
      });
    }
  });
});

describe("Selector constants usage verification", () => {
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

  describe("All exported selector objects are used", () => {
    for (const objName of Object.keys(SELECTOR_OBJECTS)) {
      it(`${objName} is imported somewhere`, () => {
        const isUsed = jsContent.includes(objName);
        assert.ok(isUsed, `${objName} is defined but not used in JS files`);
      });
    }
  });
});
