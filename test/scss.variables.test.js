import { readFileSync } from "node:fs";
import fg from "fast-glob";
const { globSync } = fg;

/**
 * Test that all CSS variables used in SCSS files are defined in :root
 */

const SCSS_DIR = "src/css";
const STYLE_FILE = "src/css/style.scss";

// Variables that are defined elsewhere (theme files, JS, etc.) or have fallbacks
const ALLOWED_UNDEFINED = [
  "--scroll-fade-selectors", // Defined in theme files via @use
];

function extractUsedVariables(scssFiles) {
  const used = new Set();
  const varPattern = /var\(--([a-z][a-z0-9-]*)/g;

  for (const file of scssFiles) {
    const content = readFileSync(file, "utf-8");
    let match;
    while ((match = varPattern.exec(content)) !== null) {
      used.add(`--${match[1]}`);
    }
  }

  return used;
}

function extractDefinedVariables(styleFile) {
  const defined = new Set();
  const content = readFileSync(styleFile, "utf-8");

  // Match variable definitions like: --color-bg: value;
  const defPattern = /^\s*(--[a-z][a-z0-9-]*):/gm;
  let match;
  while ((match = defPattern.exec(content)) !== null) {
    defined.add(match[1]);
  }

  return defined;
}

function runTest() {
  const scssFiles = globSync(`${SCSS_DIR}/**/*.scss`);
  const used = extractUsedVariables(scssFiles);
  const defined = extractDefinedVariables(STYLE_FILE);

  const undefined = [];
  for (const variable of used) {
    if (!defined.has(variable) && !ALLOWED_UNDEFINED.includes(variable)) {
      undefined.push(variable);
    }
  }

  if (undefined.length > 0) {
    console.error("=== CSS Variables Test FAILED ===");
    console.error(
      "The following CSS variables are used but not defined in :root:",
    );
    for (const v of undefined.sort()) {
      console.error(`  - ${v}`);
    }
    console.error("");
    console.error("Either:");
    console.error("  1. Add them to :root in src/css/style.scss");
    console.error(
      "  2. Replace with a standard variable (--color-text, --color-bg, etc.)",
    );
    console.error("  3. Add to ALLOWED_UNDEFINED if intentionally undefined");
    process.exit(1);
  }

  console.log("=== Running scss.variables tests ===");
  console.log(`✅ PASS: All ${used.size} CSS variables are defined`);
  console.log("");
  console.log("✅ All scss.variables tests passed!");
}

runTest();
