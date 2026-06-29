/**
 * End-to-end proof that the mutation tester actually works: it spawns real
 * `bun test` subprocesses against generated fixtures and checks that genuine
 * test gaps are caught while clean tests pass.
 *
 * Each case writes its fixtures to its own throwaway temp dir (outside test/,
 * so the code-quality scanners never see these deliberately-weak tests) and
 * invokes the real `runMutationTesting` — the same code path the CLI uses.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMutationTesting } from "#scripts/mutation/runner.js";

// Each subprocess is a fresh `bun test`; a handful of them needs real wall-clock.
const RUN_TIMEOUT = 60_000;

// Fixtures are kept tiny on purpose: every mutant spawns a fresh `bun test`
// subprocess, and this lane runs concurrently with the unit lane, so extra
// mutants would steal CPU from time-boxed unit tests.
const FIXTURES = {
  // Thorough: the single mutable operator (`+`) is exercised by an assertion.
  strong: {
    source: ["export const add = (a, b) => a + b;"],
    imports: "add",
    body: ['test("add", () => expect(add(2, 3)).toBe(5));'],
  },
  // Leaky: `untested` is never called, so mutating its `-` cannot fail any test.
  weak: {
    source: [
      "export const add = (a, b) => a + b;",
      "export const untested = (a, b) => a - b;",
    ],
    imports: "add",
    body: ['test("add", () => expect(add(2, 3)).toBe(5));'],
  },
};

/**
 * Generate a fixture in a fresh temp dir, run the real mutator against it
 * (progress output silenced, restored in `finally`), hand the exit code and
 * source path to `inspect`, then clean up. Self-contained so cases never share
 * mutable files. The generated test imports its source by ABSOLUTE path, so the
 * file never holds a relative `./` import literal for the scanners to flag.
 */
const runFixture = async (stem, inspect) => {
  const { source, imports, body } = FIXTURES[stem];
  const dir = mkdtempSync(join(tmpdir(), "mutation-e2e-"));
  const src = join(dir, `${stem}.js`);
  const testPath = join(dir, `${stem}.test.js`);
  writeFileSync(src, `${source.join("\n")}\n`);
  writeFileSync(
    testPath,
    [
      'import { expect, test } from "bun:test";',
      `import { ${imports} } from ${JSON.stringify(src)};`,
      ...body,
      "",
    ].join("\n"),
  );

  const { log, error } = console;
  const stdoutWrite = process.stdout.write.bind(process.stdout);
  console.log = () => undefined;
  console.error = () => undefined;
  process.stdout.write = () => true;
  try {
    const code = await runMutationTesting({
      exhaustive: false,
      sourceFiles: [src],
      testFiles: [testPath],
      timeout: 10_000,
    });
    return inspect(code, src);
  } finally {
    console.log = log;
    console.error = error;
    process.stdout.write = stdoutWrite;
    rmSync(dir, { force: true, recursive: true });
  }
};

describe("mutation tester (end-to-end)", () => {
  test(
    "passes (exit 0) when every mutant is killed by the tests",
    async () => {
      expect(await runFixture("strong", (code) => code)).toBe(0);
    },
    RUN_TIMEOUT,
  );

  test(
    "fails (exit 1) on a survivor and restores the source it mutated",
    async () => {
      const expected = `${FIXTURES.weak.source.join("\n")}\n`;
      const { code, onDisk } = await runFixture("weak", (code, src) => ({
        code,
        onDisk: readFileSync(src, "utf-8"),
      }));
      expect(code).toBe(1);
      // The file is back to its original contents after the in-place mutations.
      expect(onDisk).toBe(expected);
    },
    RUN_TIMEOUT,
  );
});
