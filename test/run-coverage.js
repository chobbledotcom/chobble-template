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

/**
 * Parse LCOV file to extract coverage percentages
 */
function parseLcov(lcovContent) {
  const files = {};
  let currentFile = null;

  for (const line of lcovContent.split("\n")) {
    if (line.startsWith("SF:")) {
      currentFile = line.slice(3);
      files[currentFile] = {
        linesFound: 0,
        linesHit: 0,
        functionsFound: 0,
        functionsHit: 0,
        branchesFound: 0,
        branchesHit: 0,
      };
    } else if (currentFile) {
      if (line.startsWith("LF:")) {
        files[currentFile].linesFound = parseInt(line.slice(3), 10);
      } else if (line.startsWith("LH:")) {
        files[currentFile].linesHit = parseInt(line.slice(3), 10);
      } else if (line.startsWith("FNF:")) {
        files[currentFile].functionsFound = parseInt(line.slice(4), 10);
      } else if (line.startsWith("FNH:")) {
        files[currentFile].functionsHit = parseInt(line.slice(4), 10);
      } else if (line.startsWith("BRF:")) {
        files[currentFile].branchesFound = parseInt(line.slice(4), 10);
      } else if (line.startsWith("BRH:")) {
        files[currentFile].branchesHit = parseInt(line.slice(4), 10);
      } else if (line === "end_of_record") {
        currentFile = null;
      }
    }
  }

  // Calculate totals
  let totalLines = 0,
    hitLines = 0;
  let totalFunctions = 0,
    hitFunctions = 0;
  let totalBranches = 0,
    hitBranches = 0;

  for (const file of Object.values(files)) {
    totalLines += file.linesFound;
    hitLines += file.linesHit;
    totalFunctions += file.functionsFound;
    hitFunctions += file.functionsHit;
    totalBranches += file.branchesFound;
    hitBranches += file.branchesHit;
  }

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
  const result = [];
  let hiddenCount = 0;

  for (const line of lines) {
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
        hiddenCount++;
        continue;
      }
    }
    result.push(line);
  }

  if (hiddenCount > 0) {
    result.push(`\n(${hiddenCount} files with 100% coverage hidden)`);
  }

  return result.join("\n");
}

function runCoverage() {
  const limits = readLimits();

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
  if (result.stdout) {
    const output = result.stdout.toString();
    console.log(filterCoverageOutput(output));
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  // Parse LCOV to get actual coverage
  if (!existsSync(lcovPath)) {
    console.log("No coverage data found, skipping threshold check");
    return;
  }

  const lcovContent = readFileSync(lcovPath, "utf-8");
  const coverage = parseLcov(lcovContent);

  // Check against thresholds
  const { lines, functions, branches } = coverage.totals;
  let failed = false;

  console.log("\n--- Coverage Summary ---");
  console.log(`Lines:     ${lines}% (threshold: ${limits.lines}%)`);
  console.log(`Functions: ${functions}% (threshold: ${limits.functions}%)`);
  console.log(`Branches:  ${branches}% (threshold: ${limits.branches}%)`);

  if (lines < limits.lines) {
    console.error(
      `\n❌ Line coverage ${lines}% below threshold ${limits.lines}%`,
    );
    failed = true;
  }
  if (functions < limits.functions) {
    console.error(
      `\n❌ Function coverage ${functions}% below threshold ${limits.functions}%`,
    );
    failed = true;
  }
  if (branches < limits.branches) {
    console.error(
      `\n❌ Branch coverage ${branches}% below threshold ${limits.branches}%`,
    );
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log("\n✅ Coverage thresholds met!");

  // Ratchet up limits on CI
  ratchetLimits(limits, coverage.totals);
}

function ratchetLimits(currentLimits, actual) {
  // Only ratchet on CI to avoid local cache differences affecting thresholds
  if (!process.env.CI) {
    return;
  }

  let updated = false;
  const newLimits = { ...currentLimits };

  if (actual.lines > currentLimits.lines) {
    newLimits.lines = actual.lines;
    updated = true;
  }

  if (actual.functions > currentLimits.functions) {
    newLimits.functions = actual.functions;
    updated = true;
  }

  if (actual.branches > currentLimits.branches) {
    newLimits.branches = actual.branches;
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
