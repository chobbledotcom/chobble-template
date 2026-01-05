#!/usr/bin/env node

/**
 * Coverage runner for Bun's native test framework.
 * Runs tests with coverage, enforces thresholds, ratchets up limits on CI,
 * and prevents new uncovered code via an exceptions allowlist.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "../src/_lib/paths.js";

const rootDir = ROOT_DIR;
const configPath = resolve(rootDir, ".test_coverage.json");
const exceptionsPath = resolve(rootDir, ".coverage_exceptions.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");

function readLimits() {
  const content = readFileSync(configPath, "utf-8");
  return JSON.parse(content);
}

function writeLimits(limits) {
  const content = `${JSON.stringify(limits, null, "\t")}\n`;
  writeFileSync(configPath, content, "utf-8");
}

function readExceptions() {
  if (!existsSync(exceptionsPath)) {
    return { lines: {}, functions: {} };
  }
  const content = readFileSync(exceptionsPath, "utf-8");
  return JSON.parse(content);
}

function writeExceptions(exceptions) {
  const content = `${JSON.stringify(exceptions, null, "\t")}\n`;
  writeFileSync(exceptionsPath, content, "utf-8");
}

// Files excluded from coverage calculations (bootstrap/preload scripts)
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];

/**
 * Parse LCOV file to extract coverage percentages and uncovered code locations
 */
function parseLcov(lcovContent) {
  const files = {};
  const uncovered = { lines: {}, functions: {} };
  let currentFile = null;
  let currentFileRelative = null;
  let skipFile = false;

  for (const line of lcovContent.split("\n")) {
    if (line.startsWith("SF:")) {
      const filePath = line.slice(3);
      skipFile = COVERAGE_EXCLUDE.some((p) => filePath.endsWith(p));
      if (skipFile) {
        currentFile = null;
        currentFileRelative = null;
        continue;
      }
      currentFile = filePath;
      currentFileRelative = filePath.replace(`${rootDir}/`, "");
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
      } else if (line.startsWith("DA:")) {
        // DA:line,hit_count - track uncovered lines
        const [lineNum, hits] = line.slice(3).split(",").map(Number);
        if (hits === 0) {
          if (!uncovered.lines[currentFileRelative]) {
            uncovered.lines[currentFileRelative] = [];
          }
          uncovered.lines[currentFileRelative].push(lineNum);
        }
      } else if (line.startsWith("FNDA:")) {
        // FNDA:hit_count,function_name - track uncovered functions
        const [hits, funcName] = line.slice(5).split(",");
        if (parseInt(hits, 10) === 0) {
          if (!uncovered.functions[currentFileRelative]) {
            uncovered.functions[currentFileRelative] = [];
          }
          uncovered.functions[currentFileRelative].push(funcName);
        }
      } else if (line === "end_of_record") {
        currentFile = null;
        currentFileRelative = null;
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
    uncovered,
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

/**
 * Check for new uncovered code not in the exceptions list.
 * Returns violations object with any new uncovered lines/functions.
 */
function checkCoverageExceptions(uncovered, exceptions, verbose) {
  const violations = { lines: {}, functions: {} };
  let hasViolations = false;

  // Check for new uncovered lines
  for (const [file, lines] of Object.entries(uncovered.lines)) {
    const allowedLines = new Set(exceptions.lines[file] || []);
    const newUncovered = lines.filter((line) => !allowedLines.has(line));
    if (newUncovered.length > 0) {
      violations.lines[file] = newUncovered;
      hasViolations = true;
    }
  }

  // Check for new uncovered functions
  for (const [file, funcs] of Object.entries(uncovered.functions)) {
    const allowedFuncs = new Set(exceptions.functions[file] || []);
    const newUncovered = funcs.filter((func) => !allowedFuncs.has(func));
    if (newUncovered.length > 0) {
      violations.functions[file] = newUncovered;
      hasViolations = true;
    }
  }

  if (hasViolations) {
    console.error("\n❌ New uncovered code detected!");
    console.error(
      "   All new code must have test coverage. Either add tests or update .coverage_exceptions.json",
    );

    if (Object.keys(violations.lines).length > 0) {
      console.error("\n   Uncovered lines:");
      for (const [file, lines] of Object.entries(violations.lines)) {
        console.error(`     ${file}: lines ${lines.join(", ")}`);
      }
    }

    if (Object.keys(violations.functions).length > 0) {
      console.error("\n   Uncovered functions:");
      for (const [file, funcs] of Object.entries(violations.functions)) {
        console.error(`     ${file}: ${funcs.join(", ")}`);
      }
    }

    return false;
  }

  // Check if any exceptions can be removed (lines are now covered)
  const removableExceptions = { lines: {}, functions: {} };
  let hasRemovable = false;

  for (const [file, allowedLines] of Object.entries(exceptions.lines)) {
    const stillUncovered = new Set(uncovered.lines[file] || []);
    const nowCovered = allowedLines.filter((line) => !stillUncovered.has(line));
    if (nowCovered.length > 0) {
      removableExceptions.lines[file] = nowCovered;
      hasRemovable = true;
    }
  }

  for (const [file, allowedFuncs] of Object.entries(exceptions.functions)) {
    const stillUncovered = new Set(uncovered.functions[file] || []);
    const nowCovered = allowedFuncs.filter((func) => !stillUncovered.has(func));
    if (nowCovered.length > 0) {
      removableExceptions.functions[file] = nowCovered;
      hasRemovable = true;
    }
  }

  if (hasRemovable && verbose) {
    console.log("\n📉 Some exceptions can be removed (code is now covered):");
    for (const [file, lines] of Object.entries(removableExceptions.lines)) {
      console.log(`   ${file}: lines ${lines.join(", ")}`);
    }
    for (const [file, funcs] of Object.entries(removableExceptions.functions)) {
      console.log(`   ${file}: ${funcs.join(", ")}`);
    }
  }

  return true;
}

/**
 * Ratchet down coverage exceptions on CI - remove exceptions for now-covered code
 */
function ratchetExceptions(exceptions, uncovered, verbose) {
  if (!process.env.CI || process.env.GITHUB_REF_NAME !== "main") {
    return;
  }

  let updated = false;
  const newExceptions = {
    _comment: exceptions._comment,
    lines: {},
    functions: {},
  };

  // Only keep exceptions for code that's still uncovered
  for (const [file, allowedLines] of Object.entries(exceptions.lines)) {
    const stillUncovered = new Set(uncovered.lines[file] || []);
    const remainingLines = allowedLines.filter((line) =>
      stillUncovered.has(line),
    );
    if (remainingLines.length > 0) {
      newExceptions.lines[file] = remainingLines;
    }
    if (remainingLines.length !== allowedLines.length) {
      updated = true;
    }
  }

  for (const [file, allowedFuncs] of Object.entries(exceptions.functions)) {
    const stillUncovered = new Set(uncovered.functions[file] || []);
    const remainingFuncs = allowedFuncs.filter((func) =>
      stillUncovered.has(func),
    );
    if (remainingFuncs.length > 0) {
      newExceptions.functions[file] = remainingFuncs;
    }
    if (remainingFuncs.length !== allowedFuncs.length) {
      updated = true;
    }
  }

  if (updated) {
    writeExceptions(newExceptions);
    if (verbose) {
      console.log(
        "\n📉 Coverage exceptions ratcheted down in .coverage_exceptions.json",
      );
    }
  }
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

  // Check coverage exceptions - prevent new uncovered code
  const exceptions = readExceptions();
  if (!checkCoverageExceptions(coverage.uncovered, exceptions, verbose)) {
    process.exit(1);
  }

  // Check against thresholds
  const { lines, functions, branches } = coverage.totals;
  let failed = false;

  if (verbose) {
    console.log("\n--- Coverage Summary ---");
    console.log(`Lines:     ${lines}% (threshold: ${limits.lines}%)`);
    console.log(`Functions: ${functions}% (threshold: ${limits.functions}%)`);
    console.log(`Branches:  ${branches}% (threshold: ${limits.branches}%)`);
  }

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

  if (verbose) {
    console.log("\n✅ Coverage thresholds met!");
  }

  // Ratchet up limits on CI
  ratchetLimits(limits, coverage.totals, verbose);

  // Ratchet down exceptions on CI (remove now-covered code from exceptions)
  ratchetExceptions(exceptions, coverage.uncovered, verbose);
}

function ratchetLimits(currentLimits, actual, verbose) {
  // Only ratchet on CI and main branch to avoid local cache differences and non-main branches
  if (!process.env.CI || process.env.GITHUB_REF_NAME !== "main") {
    return;
  }

  let updated = false;
  const newLimits = { ...currentLimits };

  if (actual.lines > currentLimits.lines) {
    newLimits.lines = Math.floor(actual.lines);
    updated = true;
  }

  if (actual.functions > currentLimits.functions) {
    newLimits.functions = Math.floor(actual.functions);
    updated = true;
  }

  if (actual.branches > currentLimits.branches) {
    newLimits.branches = Math.floor(actual.branches);
    updated = true;
  }

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
