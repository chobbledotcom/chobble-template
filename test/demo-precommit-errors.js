#!/usr/bin/env node

/**
 * Demonstration script to show how the improved precommit error extraction
 * handles various error outputs from different tools.
 *
 * Run: node test/demo-precommit-errors.js
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { printTruncatedList } from "#test/test-runner-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and extract the extractErrorsFromOutput function
const precommitPath = join(__dirname, "precommit.js");
const precommitCode = readFileSync(precommitPath, "utf-8");

// Extract the function using a simple eval (for demo purposes)
const functionMatch = precommitCode.match(
  /export function extractErrorsFromOutput\(output\) \{[\s\S]*?\n\}\n/,
);
if (!functionMatch) {
  console.error("Could not extract function from precommit.js");
  process.exit(1);
}

// biome-ignore lint/security/noGlobalEval: Demo script using trusted code
const extractErrorsFromOutput = eval(
  `${functionMatch[0].replace("export ", "")}; extractErrorsFromOutput`,
);

// Demo outputs from various tools
const demos = [
  {
    name: "Knip - Unused Exports",
    output: `
$ bun run knip

Unused files (3)
src/_lib/deprecated/old-util.js
src/assets/js/unused-script.js
test/fixtures/old-test.js

Unused exports (5)
src/utils/helpers.js
  - formatOldDate
  - DEPRECATED_CONSTANT
src/components/Button.js
  - privateMethod

Unused dependencies (2)
  - lodash
  - moment
`,
  },
  {
    name: "jscpd - Code Duplication",
    output: `
$ jscpd

Clone found (src/components/Form.js[15:45] - src/components/ContactForm.js[20:50])

Duplication detected: 25.5% > 25% threshold
❌ Duplication threshold exceeded

Total duplicates: 1250 lines across 15 files
`,
  },
  {
    name: "Test Failures",
    output: `
$ bun test test/unit

❌ utils.test.js > formatDate handles invalid dates
AssertionError: expected "Invalid Date" to equal "N/A"
  Expected: "N/A"
  Received: "Invalid Date"

❌ components.test.js > Button renders with correct props
AssertionError: expected undefined to be defined

2 tests failed
25 tests passed
`,
  },
  {
    name: "Coverage Failures",
    output: `
$ bun run test

❌ Coverage below threshold for statements: 85.5% < 90%
❌ Coverage below threshold for branches: 75.2% < 80%

Uncovered lines:
src/utils/helpers.js: 25, 30, 45-52
src/components/Form.js: 120, 125

Uncovered functions:
src/utils/helpers.js: formatCurrency, parseDate

These files must have test coverage:
src/new-feature.js
`,
  },
  {
    name: "Lint Errors",
    output: `
$ bunx @biomejs/biome check .

src/components/Button.js:15:3
  error: 'useState' is not defined

src/utils/helpers.js:42:10
  error: Unexpected console statement

❌ 2 errors found
`,
  },
];

console.log(`\n${"=".repeat(70)}`);
console.log("PRECOMMIT ERROR EXTRACTION DEMONSTRATION");
console.log("=".repeat(70));

for (const demo of demos) {
  console.log(`\n\n${"─".repeat(70)}`);
  console.log(`DEMO: ${demo.name}`);
  console.log("─".repeat(70));

  const errors = extractErrorsFromOutput(demo.output);

  console.log(`\nRaw output (${demo.output.split("\n").length} lines):`);
  console.log("(showing first 200 chars)");
  console.log(`${demo.output.slice(0, 200).trim()}...\n`);

  console.log(`Extracted errors (${errors.length} lines):`);
  if (errors.length === 0) {
    console.log("  (no errors extracted - this might be a problem!)");
  } else {
    printTruncatedList()(errors);
  }
}

console.log(`\n${"=".repeat(70)}`);
console.log("SUMMARY");
console.log("=".repeat(70));
console.log(`
The improved error extraction now captures:
✓ Knip outputs (Unused files, Unused exports, Unused dependencies)
✓ jscpd duplication errors (Clone found, Duplication detected)
✓ Test failures (❌ markers, AssertionError, test counts)
✓ Coverage failures (threshold violations, uncovered lines/functions)
✓ Lint errors (error markers, error counts)
✓ Stack traces (for debugging)

While filtering out:
✗ Command prompts (lines starting with $)
✗ File paths (lines starting with /)
✗ Image filenames (.jpg, .png, .gif)
✗ Node command noise (node -e ...)
✗ Empty lines and whitespace
`);
console.log(`${"=".repeat(70)}\n`);
