#!/usr/bin/env node

/**
 * Coverage runner for Bun's test framework.
 * Parses LCOV output to enforce thresholds and prevent new uncovered code.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "../src/_lib/paths.js";

// --- Configuration ---

const rootDir = ROOT_DIR;
const configPath = resolve(rootDir, ".test_coverage.json");
const exceptionsPath = resolve(rootDir, ".coverage_exceptions.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];
const TYPES = ["lines", "functions", "branches"];

// --- Functional Helpers ---

const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : fallback;

const writeJson = (path, data) =>
  writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`, "utf-8");

const pct = (hit, found) =>
  found > 0 ? Math.round((hit / found) * 10000) / 100 : 100;

// Set operations
const difference = (a, b) => a.filter((x) => !b.has(x));
const intersection = (a, b) => a.filter((x) => b.has(x));

// Curried helpers for coverage operations
const diffByFile = (fn) => (current, allowed) => {
  const result = {};
  for (const [file, items] of Object.entries(current)) {
    const diff = fn(items, new Set(allowed[file] || []));
    if (diff.length > 0) result[file] = diff;
  }
  return result;
};

const findNew = diffByFile(difference); // items in current not in allowed
const findRemaining = diffByFile(intersection); // items in current that are in allowed

// Apply operation across all coverage types
const mapTypes = (fn) => (data) => {
  const result = {};
  for (const type of TYPES) {
    result[type] = fn(data, type);
  }
  return result;
};

const isNonEmpty = (obj) => Object.keys(obj).length > 0;
const onCI = () => process.env.CI && process.env.GITHUB_REF_NAME === "main";

// --- LCOV Parsing ---

const lcovHandlers = {
  LF: (totals, val) => {
    totals.lines[1] += val;
  },
  LH: (totals, val) => {
    totals.lines[0] += val;
  },
  FNF: (totals, val) => {
    totals.functions[1] += val;
  },
  FNH: (totals, val) => {
    totals.functions[0] += val;
  },
  BRF: (totals, val) => {
    totals.branches[1] += val;
  },
  BRH: (totals, val) => {
    totals.branches[0] += val;
  },
};

const parseUncovered = {
  DA: (line) => {
    const [lineNum, hits] = line.split(",").map(Number);
    return hits === 0 ? { type: "lines", id: lineNum } : null;
  },
  FNDA: (line) => {
    const [hits, name] = line.split(",");
    return parseInt(hits, 10) === 0 ? { type: "functions", id: name } : null;
  },
  BRDA: (line) => {
    const [ln, block, branch, taken] = line.split(",");
    return taken === "0" || taken === "-"
      ? { type: "branches", id: `${ln}:${block}:${branch}` }
      : null;
  },
};

function parseLcov(content) {
  const totals = { lines: [0, 0], functions: [0, 0], branches: [0, 0] };
  const uncovered = { lines: {}, functions: {}, branches: {} };
  let file = null;

  for (const line of content.split("\n")) {
    if (line.startsWith("SF:")) {
      const path = line.slice(3);
      file = COVERAGE_EXCLUDE.some((p) => path.endsWith(p))
        ? null
        : path.replace(`${rootDir}/`, "");
      continue;
    }

    if (!file) continue;

    if (line === "end_of_record") {
      file = null;
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const prefix = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);

      // Handle totals
      const handler = lcovHandlers[prefix];
      if (handler) {
        handler(totals, parseInt(value, 10));
        continue;
      }

      // Handle uncovered items
      const parser = parseUncovered[prefix];
      if (parser) {
        const result = parser(value);
        if (result) {
          if (!uncovered[result.type][file]) uncovered[result.type][file] = [];
          uncovered[result.type][file].push(result.id);
        }
      }
    }
  }

  const percentages = {};
  for (const t of TYPES) {
    percentages[t] = pct(totals[t][0], totals[t][1]);
  }

  return { uncovered, percentages };
}

// --- Exception Checking ---

function checkExceptions(uncovered, exceptions, verbose) {
  const violations = mapTypes(({ uncovered, exceptions }, type) =>
    findNew(uncovered[type] || {}, exceptions[type] || {}),
  )({ uncovered, exceptions });

  const hasViolations = TYPES.some((t) => isNonEmpty(violations[t]));

  if (hasViolations) {
    console.error("\n❌ New uncovered code detected!");
    console.error(
      "   All new code must have test coverage. Either add tests or update .coverage_exceptions.json\n",
    );
    for (const type of TYPES) {
      if (!isNonEmpty(violations[type])) continue;
      console.error(`   Uncovered ${type}:`);
      for (const [file, items] of Object.entries(violations[type])) {
        console.error(`     ${file}: ${items.join(", ")}`);
      }
    }
    return false;
  }

  if (verbose) {
    const removable = mapTypes(({ uncovered, exceptions }, type) => {
      const result = {};
      for (const [file, items] of Object.entries(exceptions[type] || {})) {
        const nowCovered = difference(
          items,
          new Set(uncovered[type]?.[file] || []),
        );
        if (nowCovered.length > 0) result[file] = nowCovered;
      }
      return result;
    })({ uncovered, exceptions });

    if (TYPES.some((t) => isNonEmpty(removable[t]))) {
      console.log("\n📉 Some exceptions can be removed (code is now covered):");
      for (const type of TYPES) {
        if (!isNonEmpty(removable[type])) continue;
        for (const [file, items] of Object.entries(removable[type])) {
          console.log(`   ${file} ${type}: ${items.join(", ")}`);
        }
      }
    }
  }

  return true;
}

// --- Ratcheting (CI only) ---

function ratchetExceptions(exceptions, uncovered, verbose) {
  if (!onCI()) return;

  const ratcheted = {
    _comment: exceptions._comment,
    ...mapTypes(({ uncovered, exceptions }, type) =>
      findRemaining(exceptions[type] || {}, uncovered[type] || {}),
    )({ uncovered, exceptions }),
  };

  const changed = TYPES.some(
    (t) => JSON.stringify(ratcheted[t]) !== JSON.stringify(exceptions[t] || {}),
  );

  if (changed) {
    writeJson(exceptionsPath, ratcheted);
    if (verbose) {
      console.log(
        "\n📉 Coverage exceptions ratcheted down in .coverage_exceptions.json",
      );
    }
  }
}

function ratchetThresholds(thresholds, actual, verbose) {
  if (!onCI()) return;

  const ratcheted = {};
  for (const t of TYPES) {
    ratcheted[t] = Math.max(thresholds[t], Math.floor(actual[t]));
  }

  const changed = TYPES.some((t) => ratcheted[t] !== thresholds[t]);

  if (changed) {
    writeJson(configPath, ratcheted);
    if (verbose) {
      console.log("\n📈 Coverage thresholds updated in .test_coverage.json:");
      for (const t of TYPES) {
        if (ratcheted[t] !== thresholds[t]) {
          console.log(`   ${t}: ${thresholds[t]}% → ${ratcheted[t]}%`);
        }
      }
    }
  }
}

// --- Main ---

function runCoverage() {
  const thresholds = readJson(configPath, {
    lines: 0,
    functions: 0,
    branches: 0,
  });
  const verbose = process.env.VERBOSE === "1";

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

  if (verbose && result.stdout) console.log(result.stdout.toString());
  if (result.status !== 0) process.exit(result.status || 1);
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

  if (!checkExceptions(coverage.uncovered, exceptions, verbose)) {
    process.exit(1);
  }

  if (verbose) {
    console.log("\n--- Coverage Summary ---");
    for (const t of TYPES) {
      console.log(
        `${t.padEnd(10)} ${coverage.percentages[t]}% (threshold: ${thresholds[t]}%)`,
      );
    }
  }

  const failures = TYPES.filter((t) => coverage.percentages[t] < thresholds[t]);
  for (const t of failures) {
    console.error(
      `\n❌ ${t} coverage ${coverage.percentages[t]}% below threshold ${thresholds[t]}%`,
    );
  }

  if (failures.length > 0) process.exit(1);
  if (verbose) console.log("\n✅ Coverage thresholds met!");

  ratchetThresholds(thresholds, coverage.percentages, verbose);
  ratchetExceptions(exceptions, coverage.uncovered, verbose);
}

runCoverage();
