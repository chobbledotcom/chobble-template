#!/usr/bin/env bun
/**
 * In-house mutation tester — "tests for your tests".
 *
 * Mutates binary/logical/assignment operators (and unary/update/boolean/
 * statement nodes) in the given source file(s), runs the mapped test file(s),
 * and reports which mutants SURVIVED (were not caught by any assertion). It
 * proves which code changes your tests fail to notice.
 *
 * The operator tables and AST walk are derived from Mutasaurus (MIT); the
 * execution model is our own — see scripts/mutation/LICENSE.mutasaurus.md.
 *
 * Usage: bun run mutation <source-glob> <test-glob> [options]
 */

import { ROOT_DIR } from "#lib/paths.js";
import { runMutationTesting } from "./mutation/runner.js";

const DEFAULT_TIMEOUT = 10_000;

const USAGE = `Usage:
  bun run mutation <source-glob> <test-glob> [options]
  bun run mutation --source <glob> --test <glob> [--source …] [--test …]

Mutates operators in the source file(s), runs the mapped test file(s), and
reports which mutants survived (were NOT caught by your tests).

Options:
  --exhaustive     Try every operator replacement, not just one per operator.
  --timeout <ms>   Per-mutant timeout floor (default ${DEFAULT_TIMEOUT}).
  -h, --help       Show this help.

Examples:
  bun run mutation src/_lib/utils/slug-utils.js test/unit/utils/slug-utils.test.js
  bun run mutation 'src/_lib/filters/*.js' 'test/unit/filters/*.test.js' --exhaustive`;

/** Boolean flags: set a field on the accumulator and consume no extra args. */
const BOOLEAN_FLAGS = {
  "--exhaustive": (p) => {
    p.exhaustive = true;
  },
  "-h": (p) => {
    p.help = true;
  },
  "--help": (p) => {
    p.help = true;
  },
};

/** Value flags: take the next arg as their value. */
const VALUE_FLAGS = {
  "--source": (p, v) => p.sources.push(v),
  "--test": (p, v) => p.tests.push(v),
  "--timeout": (p, v) => {
    p.timeout = Number(v);
  },
};

/**
 * Apply a single recognised flag to the accumulator, returning how many
 * extra args it consumed, or null when `arg` is not a known flag.
 */
const applyFlag = (parsed, arg, next) => {
  const boolFlag = BOOLEAN_FLAGS[arg];
  if (boolFlag) {
    boolFlag(parsed);
    return 0;
  }
  const valueFlag = VALUE_FLAGS[arg];
  if (valueFlag && next !== undefined) {
    valueFlag(parsed, next);
    return 1;
  }
  return null;
};

/**
 * Resolve positional args into source/test globs, returning an error message
 * or null. Flag-form (--source/--test) and positional-form are exclusive: a
 * leftover positional alongside flags means a glob expanded past the single
 * value a flag consumed, which would silently narrow the run — reject it.
 */
const resolvePositionals = (parsed, positional) => {
  if (parsed.sources.length > 0 || parsed.tests.length > 0) {
    return positional.length > 0
      ? `Unexpected positional argument(s) alongside --source/--test: ${positional.join(", ")}. ` +
          "A glob likely expanded to multiple files — quote it " +
          "(e.g. --source 'src/_lib/filters/*.js') or pass repeated flags."
      : null;
  }
  if (positional[0] !== undefined) parsed.sources.push(positional[0]);
  if (positional[1] !== undefined) parsed.tests.push(positional[1]);
  return positional.length > 2
    ? `Too many positional arguments (${positional.length}). Quote your globs ` +
        "so the shell can't expand them."
    : null;
};

const validate = (parsed, positional) => {
  const badTimeout = !Number.isFinite(parsed.timeout) || parsed.timeout < 0;
  parsed.error =
    resolvePositionals(parsed, positional) ??
    (badTimeout
      ? "Invalid --timeout: expected a non-negative number of milliseconds."
      : null);
};

const parseArgs = (args) => {
  const parsed = {
    error: null,
    exhaustive: false,
    help: false,
    sources: [],
    tests: [],
    timeout: DEFAULT_TIMEOUT,
  };
  const positional = [];
  let index = 0;
  while (index < args.length) {
    const consumed = applyFlag(parsed, args[index], args[index + 1]);
    if (consumed === null) positional.push(args[index]);
    else index += consumed;
    index += 1;
  }
  validate(parsed, positional);
  return parsed;
};

/** Expand source/test globs to absolute, sorted, de-duplicated file paths. */
const expand = (globs) => {
  const paths = new Set();
  for (const glob of globs) {
    for (const path of new Bun.Glob(glob).scanSync({
      absolute: true,
      cwd: ROOT_DIR,
    })) {
      paths.add(path);
    }
  }
  return [...paths].sort();
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.error !== null) {
    console.error(args.error);
    process.exit(1);
  }
  if (args.help || args.sources.length === 0 || args.tests.length === 0) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  const sourceFiles = expand(args.sources);
  const testFiles = expand(args.tests);
  if (sourceFiles.length === 0) {
    console.error("No source files matched.");
    process.exit(1);
  }
  if (testFiles.length === 0) {
    console.error("No test files matched.");
    process.exit(1);
  }

  const code = await runMutationTesting({
    exhaustive: args.exhaustive,
    sourceFiles,
    testFiles,
    timeout: args.timeout,
  });
  process.exit(code);
};

main();
