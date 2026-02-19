// Template selector contract tests
// Verifies that HTML templates contain all required template IDs

import { beforeAll, describe, expect, test } from "bun:test";
import { IDS } from "#public/utils/selectors.js";
import { fs, path, rootDir } from "#test/test-utils.js";
import { mapObject } from "#toolkit/fp/object.js";
import { loadDOM } from "#utils/lazy-dom.js";

// Build a lookup for Liquid variable expansion (IDS from selectors.js)
const LIQUID_LOOKUP = mapObject((key, value) => [
  `selectors.IDS.${key}`,
  value,
])(IDS);

// Load and parse HTML template files
const templatesDir = path.join(rootDir, "src/_includes/templates");

const loadTemplate = async (filename) => {
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
  content = content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, varName) => {
    const value = LIQUID_LOOKUP[varName.trim()];
    return value !== undefined ? value : match;
  });

  const { window } = await loadDOM(content);
  return window.document;
};

// Load all template files
let cartTemplates;
let galleryTemplates;
let quotePriceTemplates;
let quoteStepIndicatorTemplates;

beforeAll(async () => {
  [
    cartTemplates,
    galleryTemplates,
    quotePriceTemplates,
    quoteStepIndicatorTemplates,
  ] = await Promise.all([
    loadTemplate("cart.html"),
    loadTemplate("gallery.html"),
    loadTemplate("quote-price.html"),
    loadTemplate("quote-step-indicator.html"),
  ]);
});

describe("Template selector contracts", () => {
  describe("All template IDs exist in HTML", () => {
    for (const [key, id] of Object.entries(IDS)) {
      test(`template "${id}" (${key}) exists`, () => {
        let found = false;
        for (const dom of [
          cartTemplates,
          galleryTemplates,
          quotePriceTemplates,
          quoteStepIndicatorTemplates,
        ]) {
          if (dom?.getElementById(id)) {
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
    "src/_lib/public/cart/cart.js",
    "src/_lib/public/cart/quote.js",
    "src/_lib/public/cart/quote-checkout.js",
    "src/_lib/public/utils/quote-price-utils.js",
    "src/_lib/public/ui/gallery.js",
    "src/_lib/public/ui/quote-steps-progress.js",
    "src/_lib/public/utils/template.js",
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
  const templateFiles = ["cart.html", "gallery.html", "quote-price.html"];

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
