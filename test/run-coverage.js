#!/usr/bin/env node

/**
 * Coverage runner for Bun's test framework.
 * Parses LCOV output to prevent new uncovered code via an exceptions allowlist.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { pipe, filter, reduce, filterMap, split } from "#utils/array-utils.js";
import { toObject, fromPairs } from "#utils/object-entries.js";

// --- Configuration ---

const rootDir = ROOT_DIR;
const exceptionsPath = resolve(rootDir, ".coverage_exceptions.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];
const TYPES = ["lines", "functions", "branches"];

// --- Functional Helpers ---
// Note: Bun's LCOV output only includes DA (line) records, not FNDA/BRDA.
// Function and branch parsing is implemented but unused until Bun adds support.

// Set operations (curried for use with pipe)
const difference = (setB) => (arr) => filter((x) => !setB.has(x))(arr);
const intersection = (setB) => (arr) => filter((x) => setB.has(x))(arr);
const toSet = (arr) => new Set(arr || []);

// Curried helpers for coverage operations
const diffByFile = (setOp) => (current, allowed) =>
  pipe(
    Object.entries,
    filterMap(
      ([file, items]) => allowed[file] !== true && items !== true,
      ([file, items]) => {
        const diff = setOp(toSet(allowed[file] || []))(items);
        return diff.length > 0 ? [file, diff] : null;
      },
    ),
    filter(Boolean),
    fromPairs,
  )(current);

// Apply operation across all coverage types (curried)
const mapTypes = (fn) => (data) =>
  toObject(TYPES, (type) => [type, fn(data, type)]);

const isNonEmpty = (obj) => Object.keys(obj).length > 0;

// --- LCOV Parsing ---

// Record parsers: extract uncovered item from LCOV line data
const parseUncovered = {
  DA: (data) => {
    const [lineNum, hits] = data.split(",").map(Number);
    return hits === 0 ? { type: "lines", id: lineNum } : null;
  },
  FNDA: (data) => {
    const [hits, name] = data.split(",");
    return parseInt(hits, 10) === 0 ? { type: "functions", id: name } : null;
  },
  BRDA: (data) => {
    const [ln, block, branch, taken] = data.split(",");
    return taken === "0" || taken === "-"
      ? { type: "branches", id: `${ln}:${block}:${branch}` }
      : null;
  },
};

// Parse a single LCOV line, returning state update
const parseLine = (state, line) => {
  // Start of file record
  if (line.startsWith("SF:")) {
    const path = line.slice(3);
    const isExcluded = COVERAGE_EXCLUDE.some((p) => path.endsWith(p));
    return { ...state, file: isExcluded ? null : path.replace(`${rootDir}/`, "") };
  }

  // End of file record or no active file
  if (!state.file || line === "end_of_record") {
    return { ...state, file: null };
  }

  // Parse coverage data lines (DA, FNDA, BRDA)
  const colonIdx = line.indexOf(":");
  if (colonIdx > 0) {
    const prefix = line.slice(0, colonIdx);
    const parser = parseUncovered[prefix];
    if (parser) {
      const result = parser(line.slice(colonIdx + 1));
      if (result) {
        const { type, id } = result;
        const fileItems = state.uncovered[type][state.file] || [];
        return {
          ...state,
          uncovered: {
            ...state.uncovered,
            [type]: { ...state.uncovered[type], [state.file]: [...fileItems, id] },
          },
        };
      }
    }
  }
  return state;
};

const parseLcov = (content) =>
  pipe(
    split("\n"),
    reduce(parseLine, { file: null, uncovered: { lines: {}, functions: {}, branches: {} } }),
    (state) => state.uncovered,
  )(content);

// --- Exception Checking ---

// Log violations grouped by type
const logViolations = (violations, label, logFn = console.error) =>
  TYPES.filter((t) => isNonEmpty(violations[t])).forEach((type) => {
    logFn(`   ${label} ${type}:`);
    Object.entries(violations[type]).forEach(([file, items]) =>
      logFn(`     ${file}: ${items.join(", ")}`),
    );
  });

const checkExceptions = (uncovered, exceptions, verbose) => {
  const findNew = diffByFile(difference);
  const violations = mapTypes(
    ({ uncovered, exceptions }, type) =>
      findNew(uncovered[type] || {}, exceptions[type] || {}),
  )({ uncovered, exceptions });

  const hasViolations = TYPES.some((t) => isNonEmpty(violations[t]));

  if (hasViolations) {
    console.error("\n❌ New uncovered code detected!");
    console.error(
      "   All new code must have test coverage. Either add tests or update .coverage_exceptions.json\n",
    );
    logViolations(violations, "Uncovered");
    return false;
  }

  if (verbose) {
    // Find exceptions that can be removed (items now covered)
    const findRemovable = (exceptions, uncovered) =>
      pipe(
        Object.entries,
        filterMap(
          ([, items]) => Array.isArray(items),
          ([file, items]) => {
            const nowCovered = difference(toSet(uncovered?.[file] || []))(items);
            return nowCovered.length > 0 ? [file, nowCovered] : null;
          },
        ),
        filter(Boolean),
        fromPairs,
      )(exceptions || {});

    const removable = mapTypes(
      ({ uncovered, exceptions }, type) =>
        findRemovable(exceptions[type], uncovered[type]),
    )({ uncovered, exceptions });

    if (TYPES.some((t) => isNonEmpty(removable[t]))) {
      console.log("\n📉 Some exceptions can be removed (code is now covered):");
      logViolations(removable, "", console.log);
    }
  }

  return true;
};

// --- Ratcheting (CI only) ---

const isMainCI = () => process.env.CI && process.env.GITHUB_REF_NAME === "main";
const writeJson = (path, data) =>
  writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`, "utf-8");

const ratchetExceptions = (exceptions, uncovered, verbose) => {
  if (!isMainCI()) return;

  const findRemaining = diffByFile(intersection);
  const ratcheted = {
    _comment: exceptions._comment,
    ...mapTypes(
      ({ uncovered, exceptions }, type) =>
        findRemaining(exceptions[type] || {}, uncovered[type] || {}),
    )({ uncovered, exceptions }),
  };

  const hasChanged = TYPES.some(
    (t) => JSON.stringify(ratcheted[t]) !== JSON.stringify(exceptions[t] || {}),
  );

  if (hasChanged) {
    writeJson(exceptionsPath, ratcheted);
    if (verbose) {
      console.log(
        "\n📉 Coverage exceptions ratcheted down in .coverage_exceptions.json",
      );
    }
  }
};

// --- Main ---

const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : fallback;

const emptyExceptions = { lines: {}, functions: {}, branches: {} };

const runCoverage = () => {
  const verbose = process.env.VERBOSE === "1";

  const result = spawnSync(
    "bun",
    ["test", "--coverage", "--coverage-reporter=lcov", "--concurrent", "--timeout", "30000"],
    { cwd: rootDir, stdio: ["inherit", "pipe", "inherit"], env: process.env },
  );

  if (verbose && result.stdout) console.log(result.stdout.toString());
  if (result.status !== 0) process.exit(result.status || 1);

  if (!existsSync(lcovPath)) {
    if (verbose) console.log("No coverage data found, skipping checks");
    return;
  }

  const uncovered = parseLcov(readFileSync(lcovPath, "utf-8"));
  const exceptions = readJson(exceptionsPath, emptyExceptions);

  if (!checkExceptions(uncovered, exceptions, verbose)) {
    process.exit(1);
  }

  if (verbose) console.log("\n✅ All code covered (or in exceptions)!");

  ratchetExceptions(exceptions, uncovered, verbose);
};

runCoverage();
