#!/usr/bin/env node

/**
 * Coverage runner for Bun's native test framework.
 * Runs tests with coverage, enforces thresholds, and ratchets up limits on CI.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "../src/_lib/paths.js";

const rootDir = ROOT_DIR;
const configPath = resolve(rootDir, ".test_coverage.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");

function readLimits() {
  const content = readFileSync(configPath, "utf-8");
  return JSON.parse(content);
}

function writeLimits(limits) {
  const content = `${JSON.stringify(limits, null, "\t")}\n`;
  writeFileSync(configPath, content, "utf-8");
}

// Files excluded from coverage calculations (bootstrap/preload scripts)
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];

/**
 * Parse LCOV file to extract coverage percentages
 */
function parseLcov(lcovContent) {
  const state = lcovContent.split("\n").reduce(
    (acc, line) => {
      if (line.startsWith("SF:")) {
        const filePath = line.slice(3);
        const skipFile = COVERAGE_EXCLUDE.some((p) => filePath.endsWith(p));
        if (skipFile) {
          acc.currentFile = null;
          return acc;
        }
        acc.currentFile = filePath;
        acc.files[filePath] = {
          linesFound: 0,
          linesHit: 0,
          functionsFound: 0,
          functionsHit: 0,
          branchesFound: 0,
          branchesHit: 0,
        };
        return acc;
      }

      if (!acc.currentFile) return acc;

      const currentFile = acc.currentFile;
      if (line.startsWith("LF:")) {
        acc.files[currentFile].linesFound = parseInt(line.slice(3), 10);
      } else if (line.startsWith("LH:")) {
        acc.files[currentFile].linesHit = parseInt(line.slice(3), 10);
      } else if (line.startsWith("FNF:")) {
        acc.files[currentFile].functionsFound = parseInt(line.slice(4), 10);
      } else if (line.startsWith("FNH:")) {
        acc.files[currentFile].functionsHit = parseInt(line.slice(4), 10);
      } else if (line.startsWith("BRF:")) {
        acc.files[currentFile].branchesFound = parseInt(line.slice(4), 10);
      } else if (line.startsWith("BRH:")) {
        acc.files[currentFile].branchesHit = parseInt(line.slice(4), 10);
      } else if (line === "end_of_record") {
        acc.currentFile = null;
      }

      return acc;
    },
    { files: {}, currentFile: null },
  );

  const { files } = state;

  // Calculate totals
  const totals = Object.values(files).reduce(
    (acc, file) => {
      acc.totalLines += file.linesFound;
      acc.hitLines += file.linesHit;
      acc.totalFunctions += file.functionsFound;
      acc.hitFunctions += file.functionsHit;
      acc.totalBranches += file.branchesFound;
      acc.hitBranches += file.branchesHit;
      return acc;
    },
    {
      totalLines: 0,
      hitLines: 0,
      totalFunctions: 0,
      hitFunctions: 0,
      totalBranches: 0,
      hitBranches: 0,
    },
  );

  const {
    totalLines,
    hitLines,
    totalFunctions,
    hitFunctions,
    totalBranches,
    hitBranches,
  } = totals;

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    files,
    totals: {
      lines: totalLines > 0 ? round2((hitLines / totalLines) * 100) : 100,
      functions:
        totalFunctions > 0
          ? round2((hitFunctions / totalFunctions) * 100)
          : 100,
      branches:
        totalBranches > 0 ? round2((hitBranches / totalBranches) * 100) : 100,
    },
  };
}

/**
 * Filter coverage output to hide files with 100% coverage
 */
function filterCoverageOutput(output) {
  const lines = output.split("\n");

  const result = lines.reduce(
    (acc, line) => {
      // Check if this is a file coverage line (contains percentage)
      const fileMatch = line.match(
        /^(.+?)\s+\|\s+([\d.]+)%\s+\|\s+([\d.]+)%\s+\|\s+([\d.]+)%/,
      );
      if (fileMatch) {
        const [, , lines, funcs, branches] = fileMatch;
        const isPerfect =
          parseFloat(lines) === 100 &&
          parseFloat(funcs) === 100 &&
          parseFloat(branches) === 100;
        if (isPerfect) {
          acc.hiddenCount++;
          return acc;
        }
      }
      acc.visibleLines.push(line);
      return acc;
    },
    { visibleLines: [], hiddenCount: 0 },
  );

  if (result.hiddenCount > 0) {
    result.visibleLines.push(
      `\n(${result.hiddenCount} files with 100% coverage hidden)`,
    );
  }

  return result.visibleLines.join("\n");
}

function runCoverage() {
  const limits = readLimits();
  const verbose = process.env.VERBOSE === "1";

  // Run bun test with coverage
  const result = spawnSync(
    "bun",
    [
      "test",
      "--coverage",
      "--coverage-reporter=lcov",
      "--concurrent",
      "--timeout",
      "30000",
    ],
    {
      cwd: rootDir,
      stdio: ["inherit", "pipe", "inherit"],
      env: process.env,
    },
  );

  // Print test output (filtered if it includes coverage)
  if (result.stdout && verbose) {
    const output = result.stdout.toString();
    console.log(filterCoverageOutput(output));
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  // Parse LCOV to get actual coverage
  if (!existsSync(lcovPath)) {
    if (verbose) {
      console.log("No coverage data found, skipping threshold check");
    }
    return;
  }

  const lcovContent = readFileSync(lcovPath, "utf-8");
  const coverage = parseLcov(lcovContent);

  // Check against thresholds
  const { lines, functions, branches } = coverage.totals;

  if (verbose) {
    console.log("\n--- Coverage Summary ---");
    console.log(`Lines:     ${lines}% (threshold: ${limits.lines}%)`);
    console.log(`Functions: ${functions}% (threshold: ${limits.functions}%)`);
    console.log(`Branches:  ${branches}% (threshold: ${limits.branches}%)`);
  }

  const failures = [
    lines < limits.lines &&
      `\n❌ Line coverage ${lines}% below threshold ${limits.lines}%`,
    functions < limits.functions &&
      `\n❌ Function coverage ${functions}% below threshold ${limits.functions}%`,
    branches < limits.branches &&
      `\n❌ Branch coverage ${branches}% below threshold ${limits.branches}%`,
  ].filter(Boolean);

  for (const error of failures) {
    console.error(error);
  }

  if (failures.length > 0) {
    process.exit(1);
  }

  if (verbose) {
    console.log("\n✅ Coverage thresholds met!");
  }

  // Ratchet up limits on CI
  ratchetLimits(limits, coverage.totals, verbose);
}

function ratchetLimits(currentLimits, actual, verbose) {
  // Only ratchet on CI and main branch to avoid local cache differences and non-main branches
  if (!process.env.CI || process.env.GITHUB_REF_NAME !== "main") {
    return;
  }

  const newLimits = {
    lines:
      actual.lines > currentLimits.lines
        ? Math.floor(actual.lines)
        : currentLimits.lines,
    functions:
      actual.functions > currentLimits.functions
        ? Math.floor(actual.functions)
        : currentLimits.functions,
    branches:
      actual.branches > currentLimits.branches
        ? Math.floor(actual.branches)
        : currentLimits.branches,
  };

  const updated = JSON.stringify(newLimits) !== JSON.stringify(currentLimits);

  if (updated) {
    writeLimits(newLimits);
    if (verbose) {
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
}

runCoverage();
