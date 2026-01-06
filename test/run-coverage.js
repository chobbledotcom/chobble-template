#!/usr/bin/env node

/**
 * Coverage runner for Bun's test framework.
 * Parses LCOV output to prevent new uncovered lines via an exceptions allowlist.
 * Note: Bun only outputs line coverage (DA records), not function/branch coverage.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { filter, filterMap, pipe, reduce, split } from "#utils/array-utils.js";
import { fromPairs } from "#utils/object-entries.js";

// --- Configuration ---

const rootDir = ROOT_DIR;
const exceptionsPath = resolve(rootDir, ".coverage_exceptions.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];

// --- Functional Helpers ---

const difference = (setB) => (arr) => filter((x) => !setB.has(x))(arr);
const intersection = (setB) => (arr) => filter((x) => setB.has(x))(arr);
const toSet = (arr) => new Set(arr || []);
const isNonEmpty = (obj) => Object.keys(obj).length > 0;

// Compute difference/intersection between current uncovered and allowed exceptions
const diffByFile = (setOp) => (current, allowed) =>
  pipe(
    Object.entries,
    filterMap(
      ([file, lines]) => Array.isArray(lines) && allowed[file] !== true,
      ([file, lines]) => {
        const diff = setOp(toSet(allowed[file]))(lines);
        return diff.length > 0 ? [file, diff] : null;
      },
    ),
    filter(Boolean),
    fromPairs,
  )(current);

// --- LCOV Parsing ---

// Parse DA (line data) records: "DA:lineNum,hitCount"
const parseDA = (data) => {
  const [lineNum, hits] = data.split(",").map(Number);
  return hits === 0 ? lineNum : null;
};

// Parse a single LCOV line, accumulating uncovered lines per file
const parseLine = (state, line) => {
  if (line.startsWith("SF:")) {
    const path = line.slice(3);
    const isExcluded = COVERAGE_EXCLUDE.some((p) => path.endsWith(p));
    return {
      ...state,
      file: isExcluded ? null : path.replace(`${rootDir}/`, ""),
    };
  }

  if (!state.file || line === "end_of_record") {
    return { ...state, file: null };
  }

  if (line.startsWith("DA:")) {
    const lineNum = parseDA(line.slice(3));
    if (lineNum !== null) {
      const fileLines = state.uncovered[state.file] || [];
      return {
        ...state,
        uncovered: {
          ...state.uncovered,
          [state.file]: [...fileLines, lineNum],
        },
      };
    }
  }

  return state;
};

const parseLcov = (content) =>
  pipe(
    split("\n"),
    reduce(parseLine, { file: null, uncovered: {} }),
    (state) => state.uncovered,
  )(content);

// --- Exception Checking ---

const checkExceptions = (uncovered, exceptions, verbose) => {
  const violations = diffByFile(difference)(uncovered, exceptions);

  if (isNonEmpty(violations)) {
    console.error("\n❌ New uncovered lines detected!");
    console.error("   Add tests or update .coverage_exceptions.json\n");
    for (const [file, lines] of Object.entries(violations)) {
      console.error(`   ${file}: ${lines.join(", ")}`);
    }
    return false;
  }

  if (verbose) {
    const removable = pipe(
      Object.entries,
      filterMap(
        ([, lines]) => Array.isArray(lines),
        ([file, lines]) => {
          const nowCovered = difference(toSet(uncovered[file] || []))(lines);
          return nowCovered.length > 0 ? [file, nowCovered] : null;
        },
      ),
      filter(Boolean),
      fromPairs,
    )(exceptions);

    if (isNonEmpty(removable)) {
      console.log("\n📉 Some exceptions can be removed (now covered):");
      for (const [file, lines] of Object.entries(removable)) {
        console.log(`   ${file}: ${lines.join(", ")}`);
      }
    }
  }

  return true;
};

// --- Ratcheting (CI only) ---

const isMainCI = () => process.env.CI && process.env.GITHUB_REF_NAME === "main";

const ratchetExceptions = (exceptions, uncovered, verbose) => {
  if (!isMainCI()) return;

  const ratcheted = {
    _comment: exceptions._comment,
    ...diffByFile(intersection)(exceptions, uncovered),
  };

  if (JSON.stringify(ratcheted) !== JSON.stringify(exceptions)) {
    writeFileSync(
      exceptionsPath,
      `${JSON.stringify(ratcheted, null, "\t")}\n`,
      "utf-8",
    );
    if (verbose) console.log("\n📉 Coverage exceptions ratcheted down");
  }
};

// --- Main ---

const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : fallback;

const runCoverage = () => {
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

  const uncovered = parseLcov(readFileSync(lcovPath, "utf-8"));
  const exceptions = readJson(exceptionsPath, {});

  if (!checkExceptions(uncovered, exceptions, verbose)) {
    process.exit(1);
  }

  if (verbose) console.log("\n✅ All lines covered (or in exceptions)!");

  ratchetExceptions(exceptions, uncovered, verbose);
};

runCoverage();
