#!/usr/bin/env node

/**
 * Coverage runner for Bun's test framework.
 * Parses LCOV output to enforce thresholds and prevent new uncovered code.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "../src/_lib/paths.js";

const rootDir = ROOT_DIR;
const configPath = resolve(rootDir, ".test_coverage.json");
const exceptionsPath = resolve(rootDir, ".coverage_exceptions.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");

// Files excluded from coverage calculations
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];

// Coverage types we track
const COVERAGE_TYPES = ["lines", "functions", "branches"];

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`, "utf-8");
}

/**
 * Parse LCOV file to extract coverage data.
 * LCOV format reference: http://ltp.sourceforge.net/coverage/lcov/geninfo.1.php
 */
function parseLcov(lcovContent) {
  const totals = { lines: [0, 0], functions: [0, 0], branches: [0, 0] };
  const uncovered = { lines: {}, functions: {}, branches: {} };

  let file = null;
  let skip = false;

  for (const line of lcovContent.split("\n")) {
    // SF: source file path
    if (line.startsWith("SF:")) {
      const path = line.slice(3);
      skip = COVERAGE_EXCLUDE.some((p) => path.endsWith(p));
      file = skip ? null : path.replace(`${rootDir}/`, "");
      continue;
    }

    if (!file) continue;

    // LF/LH: lines found/hit
    if (line.startsWith("LF:")) {
      totals.lines[1] += parseInt(line.slice(3), 10);
    } else if (line.startsWith("LH:")) {
      totals.lines[0] += parseInt(line.slice(3), 10);
    }
    // FNF/FNH: functions found/hit
    else if (line.startsWith("FNF:")) {
      totals.functions[1] += parseInt(line.slice(4), 10);
    } else if (line.startsWith("FNH:")) {
      totals.functions[0] += parseInt(line.slice(4), 10);
    }
    // BRF/BRH: branches found/hit
    else if (line.startsWith("BRF:")) {
      totals.branches[1] += parseInt(line.slice(4), 10);
    } else if (line.startsWith("BRH:")) {
      totals.branches[0] += parseInt(line.slice(4), 10);
    }
    // DA: line data - DA:line_number,execution_count
    else if (line.startsWith("DA:")) {
      const [lineNum, hits] = line.slice(3).split(",").map(Number);
      if (hits === 0) {
        if (!uncovered.lines[file]) uncovered.lines[file] = [];
        uncovered.lines[file].push(lineNum);
      }
    }
    // FNDA: function data - FNDA:execution_count,function_name
    else if (line.startsWith("FNDA:")) {
      const [hits, name] = line.slice(5).split(",");
      if (parseInt(hits, 10) === 0) {
        if (!uncovered.functions[file]) uncovered.functions[file] = [];
        uncovered.functions[file].push(name);
      }
    }
    // BRDA: branch data - BRDA:line,block,branch,taken
    else if (line.startsWith("BRDA:")) {
      const parts = line.slice(5).split(",");
      const taken = parts[3];
      if (taken === "0" || taken === "-") {
        const branchId = `${parts[0]}:${parts[1]}:${parts[2]}`;
        if (!uncovered.branches[file]) uncovered.branches[file] = [];
        uncovered.branches[file].push(branchId);
      }
    }
    // End of record
    else if (line === "end_of_record") {
      file = null;
    }
  }

  // Calculate percentages
  const pct = (hit, found) =>
    found > 0 ? Math.round((hit / found) * 10000) / 100 : 100;

  return {
    uncovered,
    percentages: {
      lines: pct(totals.lines[0], totals.lines[1]),
      functions: pct(totals.functions[0], totals.functions[1]),
      branches: pct(totals.branches[0], totals.branches[1]),
    },
  };
}

/**
 * Check for new uncovered code not in the exceptions list.
 */
function checkExceptions(uncovered, exceptions, verbose) {
  const violations = {};
  let hasViolations = false;

  for (const type of COVERAGE_TYPES) {
    const allowed = exceptions[type] || {};
    for (const [file, items] of Object.entries(uncovered[type] || {})) {
      const allowedSet = new Set(allowed[file] || []);
      const newItems = items.filter((item) => !allowedSet.has(item));
      if (newItems.length > 0) {
        if (!violations[type]) violations[type] = {};
        violations[type][file] = newItems;
        hasViolations = true;
      }
    }
  }

  if (hasViolations) {
    console.error("\n❌ New uncovered code detected!");
    console.error(
      "   All new code must have test coverage. Either add tests or update .coverage_exceptions.json\n",
    );
    for (const type of COVERAGE_TYPES) {
      if (!violations[type]) continue;
      console.error(`   Uncovered ${type}:`);
      for (const [file, items] of Object.entries(violations[type])) {
        console.error(`     ${file}: ${items.join(", ")}`);
      }
    }
    return false;
  }

  // Report removable exceptions
  if (verbose) {
    const removable = {};
    let hasRemovable = false;

    for (const type of COVERAGE_TYPES) {
      const allowed = exceptions[type] || {};
      for (const [file, items] of Object.entries(allowed)) {
        const stillUncovered = new Set(uncovered[type]?.[file] || []);
        const nowCovered = items.filter((item) => !stillUncovered.has(item));
        if (nowCovered.length > 0) {
          if (!removable[type]) removable[type] = {};
          removable[type][file] = nowCovered;
          hasRemovable = true;
        }
      }
    }

    if (hasRemovable) {
      console.log("\n📉 Some exceptions can be removed (code is now covered):");
      for (const type of COVERAGE_TYPES) {
        if (!removable[type]) continue;
        for (const [file, items] of Object.entries(removable[type])) {
          console.log(`   ${file} ${type}: ${items.join(", ")}`);
        }
      }
    }
  }

  return true;
}

/**
 * Ratchet down exceptions on CI - remove exceptions for now-covered code.
 */
function ratchetExceptions(exceptions, uncovered, verbose) {
  if (!process.env.CI || process.env.GITHUB_REF_NAME !== "main") return;

  let updated = false;
  const newExceptions = { _comment: exceptions._comment };

  for (const type of COVERAGE_TYPES) {
    newExceptions[type] = {};
    const allowed = exceptions[type] || {};

    for (const [file, items] of Object.entries(allowed)) {
      const stillUncovered = new Set(uncovered[type]?.[file] || []);
      const remaining = items.filter((item) => stillUncovered.has(item));
      if (remaining.length > 0) {
        newExceptions[type][file] = remaining;
      }
      if (remaining.length !== items.length) {
        updated = true;
      }
    }
  }

  if (updated) {
    writeJson(exceptionsPath, newExceptions);
    if (verbose) {
      console.log(
        "\n📉 Coverage exceptions ratcheted down in .coverage_exceptions.json",
      );
    }
  }
}

/**
 * Ratchet up coverage thresholds on CI.
 */
function ratchetThresholds(thresholds, actual, verbose) {
  if (!process.env.CI || process.env.GITHUB_REF_NAME !== "main") return;

  let updated = false;
  const newThresholds = { ...thresholds };

  for (const type of COVERAGE_TYPES) {
    if (actual[type] > thresholds[type]) {
      newThresholds[type] = Math.floor(actual[type]);
      updated = true;
    }
  }

  if (updated) {
    writeJson(configPath, newThresholds);
    if (verbose) {
      console.log("\n📈 Coverage thresholds updated in .test_coverage.json:");
      for (const type of COVERAGE_TYPES) {
        if (newThresholds[type] !== thresholds[type]) {
          console.log(
            `   ${type}: ${thresholds[type]}% → ${newThresholds[type]}%`,
          );
        }
      }
    }
  }
}

function runCoverage() {
  const thresholds = readJson(configPath, {
    lines: 0,
    functions: 0,
    branches: 0,
  });
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
    { cwd: rootDir, stdio: ["inherit", "pipe", "inherit"], env: process.env },
  );

  if (verbose && result.stdout) {
    console.log(result.stdout.toString());
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  if (!existsSync(lcovPath)) {
    if (verbose) console.log("No coverage data found, skipping checks");
    return;
  }

  const coverage = parseLcov(readFileSync(lcovPath, "utf-8"));
  const exceptions = readJson(exceptionsPath, {
    lines: {},
    functions: {},
    branches: {},
  });

  // Check for new uncovered code
  if (!checkExceptions(coverage.uncovered, exceptions, verbose)) {
    process.exit(1);
  }

  // Check thresholds
  if (verbose) {
    console.log("\n--- Coverage Summary ---");
    for (const type of COVERAGE_TYPES) {
      console.log(
        `${type.padEnd(10)} ${coverage.percentages[type]}% (threshold: ${thresholds[type]}%)`,
      );
    }
  }

  let failed = false;
  for (const type of COVERAGE_TYPES) {
    if (coverage.percentages[type] < thresholds[type]) {
      console.error(
        `\n❌ ${type} coverage ${coverage.percentages[type]}% below threshold ${thresholds[type]}%`,
      );
      failed = true;
    }
  }

  if (failed) process.exit(1);

  if (verbose) console.log("\n✅ Coverage thresholds met!");

  ratchetThresholds(thresholds, coverage.percentages, verbose);
  ratchetExceptions(exceptions, coverage.uncovered, verbose);
}

runCoverage();
