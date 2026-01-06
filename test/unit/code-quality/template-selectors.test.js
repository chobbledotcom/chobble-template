// Template selector contract tests
// Verifies that HTML templates contain all required template IDs

import { describe, expect, test } from "bun:test";
import { IDS } from "#assets/selectors.js";
import { DOM, fs, path, rootDir } from "#test/test-utils.js";

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
const templatesDir = path.join(rootDir, "src/_includes/templates");

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

  return new DOM(content);
}

// Load all template files
const calendarTemplates = loadTemplate("calendar.html");
const cartTemplates = loadTemplate("cart.html");
const galleryTemplates = loadTemplate("gallery.html");

describe("Template selector contracts", () => {
  describe("All template IDs exist in HTML", () => {
    for (const [key, id] of Object.entries(IDS)) {
      test(`template "${id}" (${key}) exists`, () => {
        let found = false;
        for (const dom of [
          calendarTemplates,
          cartTemplates,
          galleryTemplates,
        ]) {
          if (dom?.window.document.getElementById(id)) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      });
    }
  });
});

describe("Selector constants usage verification", () => {
  const jsFiles = [
    "src/assets/js/availability-calendar.js",
    "src/assets/js/cart.js",
    "src/assets/js/quote.js",
    "src/assets/js/quote-checkout.js",
    "src/assets/js/gallery.js",
    "src/assets/js/template.js",
  ];

  const jsContent = jsFiles
    .map((f) => {
      const filepath = path.join(rootDir, f);
      return fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : "";
    })
    .join("\n");

  describe("IDS are used in JS", () => {
    for (const [key, _id] of Object.entries(IDS)) {
      test(`IDS.${key} is used`, () => {
        const isUsed = jsContent.includes(`IDS.${key}`);
        expect(isUsed).toBe(true);
      });
    }
  });
});

describe("HTML templates use Liquid selectors for IDs", () => {
  const templateFiles = ["calendar.html", "cart.html", "gallery.html"];

  for (const filename of templateFiles) {
    const filepath = path.join(templatesDir, filename);
    if (!fs.existsSync(filepath)) continue;

    const content = fs.readFileSync(filepath, "utf-8");

    test(`${filename} uses Liquid selectors for template IDs`, () => {
      const hardcodedIds = content.match(/id="[^{][^"]*-template"/g) || [];
      expect(hardcodedIds.length).toBe(0);
    });
  }
});
