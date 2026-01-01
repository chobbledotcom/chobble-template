// Template selector contract tests
// Verifies that HTML templates contain all required template IDs

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { IDS } from "#assets/selectors.js";

// Build a lookup for Liquid variable expansion
function buildLiquidLookup() {
  const lookup = {};

  // Add IDS
  for (const [key, value] of Object.entries(IDS)) {
    lookup[`selectors.IDS.${key}`] = value;
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
});

describe("Selector constants usage verification", () => {
  const jsFiles = [
    "src/assets/js/cart.js",
    "src/assets/js/quote.js",
    "src/assets/js/quote-checkout.js",
    "src/assets/js/gallery.js",
    "src/assets/js/template.js",
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
});

describe("HTML templates use Liquid selectors for IDs", () => {
  const templateFiles = ["cart.html", "gallery.html"];

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
  }
});
