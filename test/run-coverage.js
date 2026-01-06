#!/usr/bin/env node

/**
 * Coverage runner for Bun's test framework.
 * Parses LCOV output to prevent new uncovered code via an exceptions allowlist.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { toObject } from "#utils/object-entries.js";

// --- Configuration ---

const rootDir = ROOT_DIR;
const exceptionsPath = resolve(rootDir, ".coverage_exceptions.json");
const lcovPath = resolve(rootDir, "coverage", "lcov.info");
const COVERAGE_EXCLUDE = ["test/ensure-deps.js"];
const TYPES = ["lines", "functions", "branches"];

// --- Functional Helpers ---

// Set operations
const difference = (a, b) => a.filter((x) => !b.has(x));

// Curried helpers for coverage operations
const diffByFile = (fn) => (current, allowed) => {
  const result = {};
  for (const [file, items] of Object.entries(current)) {
    // If allowed[file] is true, skip entire file (no violations)
    if (allowed[file] === true) continue;
    // Handle whole-file exceptions (items === true)
    if (items === true) {
      const allowedItems = allowed[file];
      if (allowedItems && allowedItems.length > 0) {
        result[file] = true;
      }
      continue;
    }
    const diff = fn(items, new Set(allowed[file] || []));
    if (diff.length > 0) result[file] = diff;
  }
  return result;
};

// Apply operation across all coverage types (curried)
const mapTypes = (fn) => (data) =>
  toObject(TYPES, (type) => [type, fn(data, type)]);

const isNonEmpty = (obj) => Object.keys(obj).length > 0;

// --- LCOV Parsing ---

function parseLcov(content) {
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
      const parser = parseUncovered[prefix];
      if (parser) {
        const result = parser(line.slice(colonIdx + 1));
        if (result) {
          if (!uncovered[result.type][file]) uncovered[result.type][file] = [];
          uncovered[result.type][file].push(result.id);
        }
      }
    }
  }

  return uncovered;
}

// --- Exception Checking ---

function checkExceptions(uncovered, exceptions, verbose) {
  const findNew = diffByFile(difference); // items in current not in allowed
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
  const onCI = () => process.env.CI && process.env.GITHUB_REF_NAME === "main";
  if (!onCI()) return;

  const intersection = (a, b) => a.filter((x) => b.has(x));
  const findRemaining = diffByFile(intersection); // items in current that are in allowed
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
    const writeJson = (path, data) =>
      writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`, "utf-8");
    writeJson(exceptionsPath, ratcheted);
    if (verbose) {
      console.log(
        "\n📉 Coverage exceptions ratcheted down in .coverage_exceptions.json",
      );
    }
  }
}

// --- Main ---

function runCoverage() {
  const readJson = (path, fallback) =>
    existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : fallback;
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
  const exceptions = readJson(exceptionsPath, {
    lines: {},
    functions: {},
    branches: {},
  });

  if (!checkExceptions(uncovered, exceptions, verbose)) {
    process.exit(1);
  }

  if (verbose) console.log("\n✅ All code covered (or in exceptions)!");

  ratchetExceptions(exceptions, uncovered, verbose);
}

runCoverage();
