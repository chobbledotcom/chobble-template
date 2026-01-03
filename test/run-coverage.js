#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const configPath = resolve(rootDir, ".test_coverage.json");

function readLimits() {
  const content = readFileSync(configPath, "utf-8");
  return JSON.parse(content);
}

function writeLimits(limits) {
  const content = `${JSON.stringify(limits, null, "\t")}\n`;
  writeFileSync(configPath, content, "utf-8");
}

function filterCoverageOutput(output) {
  const lines = output.split("\n");
  const result = [];
  let dividerLine = "";
  let headerLine = "";
  const dataLines = [];
  const footerLines = [];
  let hiddenCount = 0;
  let dividerCount = 0;

  for (const line of lines) {
    // Detect divider lines (dashes with pipes)
    if (line.match(/^-+\|/)) {
      dividerCount++;
      if (dividerCount === 1) {
        // First divider - before header
        dividerLine = line;
      }
      // Skip dividers 2 and 3 - we'll reconstruct them
      continue;
    }

    if (dividerCount === 0) {
      // Lines before the table (test output, etc.)
      result.push(line);
    } else if (dividerCount === 1 && line.includes("File")) {
      // Header line (between first and second divider)
      headerLine = line;
    } else if (dividerCount >= 2 && dividerCount < 3) {
      // Data lines (between second and third divider)
      // Format: File | % Stmts | % Branch | % Funcs | % Lines | Uncovered
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 5) {
        const stmts = Number.parseFloat(parts[1]);
        const branch = Number.parseFloat(parts[2]);
        const funcs = Number.parseFloat(parts[3]);
        const linesCol = Number.parseFloat(parts[4]);

        // Keep the "All files" summary row and any row that isn't 100% in all columns
        const isAllFiles = parts[0] === "All files";
        const isPerfect =
          stmts === 100 && branch === 100 && funcs === 100 && linesCol === 100;

        if (isAllFiles || !isPerfect) {
          dataLines.push(line);
        } else {
          hiddenCount++;
        }
      } else {
        // Keep lines we can't parse
        dataLines.push(line);
      }
    } else if (dividerCount >= 3) {
      // Lines after the table
      footerLines.push(line);
    }
  }

  // Reconstruct the output with filtered data
  if (headerLine) {
    result.push(dividerLine);
    result.push(headerLine);
    result.push(dividerLine);
    result.push(...dataLines);
    result.push(dividerLine);
    result.push(...footerLines);
  }

  // Add a note about hidden files
  if (hiddenCount > 0) {
    result.push(`(${hiddenCount} files with 100% coverage hidden)`);
  }

  return result.join("\n");
}

function runCoverage() {
  const limits = readLimits();

  // Run c8 with current limits and JSON reporter
  const c8Args = [
    "--check-coverage",
    "--lines",
    String(limits.lines),
    "--functions",
    String(limits.functions),
    "--branches",
    String(limits.branches),
    "--reporter=text",
    "--reporter=json-summary",
    "--report-dir=coverage",
    "bun",
    "test/run-all-tests.js",
  ];

  // Pass through any additional args (like --verbose via TEST_VERBOSE env)
  const result = spawnSync("bunx", ["c8", ...c8Args], {
    cwd: rootDir,
    stdio: ["inherit", "pipe", "inherit"],
    env: process.env,
  });

  // Filter and print the coverage output
  if (result.stdout) {
    const output = result.stdout.toString();
    const filtered = filterCoverageOutput(output);
    console.log(filtered);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  // Tests passed, now check if we should ratchet up the limits
  ratchetLimits(limits);
}

function ratchetLimits(currentLimits) {
  // Only ratchet on CI to avoid local cache differences affecting thresholds
  if (!process.env.CI) {
    return;
  }

  // Read the JSON coverage report
  const reportPath = resolve(rootDir, "coverage", "coverage-summary.json");
  let report;
  try {
    const content = readFileSync(reportPath, "utf-8");
    report = JSON.parse(content);
  } catch {
    // No JSON report available, skip ratcheting
    return;
  }

  const total = report.total;
  if (!total) {
    return;
  }

  // Get actual coverage percentages (rounded to 2 decimal places)
  const round2 = (n) => Math.round(n * 100) / 100;
  const actualLines = round2(total.lines.pct);
  const actualFunctions = round2(total.functions.pct);
  const actualBranches = round2(total.branches.pct);

  let updated = false;
  const newLimits = { ...currentLimits };

  if (actualLines > currentLimits.lines) {
    newLimits.lines = actualLines;
    updated = true;
  }

  if (actualFunctions > currentLimits.functions) {
    newLimits.functions = actualFunctions;
    updated = true;
  }

  if (actualBranches > currentLimits.branches) {
    newLimits.branches = actualBranches;
    updated = true;
  }

  if (updated) {
    writeLimits(newLimits);
    console.log("\n📈 Coverage limits updated in .test_coverage.json:");
    if (newLimits.lines !== currentLimits.lines) {
      console.log(`   lines: ${currentLimits.lines}% → ${newLimits.lines}%`);
    }
    if (newLimits.functions !== currentLimits.functions) {
      console.log(
        `   functions: ${currentLimits.functions}% → ${newLimits.functions}%`,
      );
    }
    if (newLimits.branches !== currentLimits.branches) {
      console.log(
        `   branches: ${currentLimits.branches}% → ${newLimits.branches}%`,
      );
    }
  }
}

runCoverage();
