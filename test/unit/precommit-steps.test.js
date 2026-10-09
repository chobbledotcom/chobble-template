import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { captureConsole, withTempDirAsync } from "#test/test-utils.js";

// Each test re-imports the steps module graph with coverage instrumentation;
// under the full suite's parallel lanes that exceeds the default timeout.
vi.setConfig({ testTimeout: 5000 });

const withSteps = (run) =>
  withTempDirAsync("precommit-steps", async (root) => {
    vi.resetModules();
    vi.doMock("#lib/paths.js", async (importOriginal) => ({
      ...(await importOriginal()),
      ROOT_DIR: root,
    }));
    const steps = await import("#test/precommit/steps.js");
    const cacheDir = join(root, ".cache");
    return run({
      ...steps,
      cacheDir,
      countFile: join(cacheDir, "precommit-test-count"),
      reportFile: join(cacheDir, "precommit-test-results.xml"),
    });
  });

const writeCacheFile = (file, content) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

afterEach(() => {
  vi.doUnmock("#lib/paths.js");
  vi.resetModules();
});

test("precommit preserves quality gates without regenerating artifacts before freshness checks", () =>
  withSteps(({ getSteps, reportFile }) => {
    const steps = getSteps();
    expect(steps.slice(0, -1).map(({ cmd }) => cmd)).toEqual([
      ["npm", "install"],
      ["npx", "vitest", "run", "test/unit/code-quality"],
      ["npm", "run", "lint"],
      ["npm", "run", "lint:scss"],
      ["npm", "run", "knip"],
      ["npm", "run", "typecheck"],
      ["npm", "run", "typecheck:strict"],
      ["npm", "run", "cpd"],
      ["npm", "run", "cpd:ratchet"],
    ]);
    expect(steps.at(-1)).toMatchObject({
      name: "tests",
      cmd: expect.arrayContaining([
        "npx",
        "vitest",
        "run",
        "--reporter=dot",
        "--reporter=junit",
        `--outputFile.junit=${reportFile}`,
      ]),
    });
  }));

test.each([
  { cached: undefined, progress: "(2 passed)" },
  { cached: " 12\n", progress: "(2/12 passed)" },
  { cached: "invalid", progress: "(2 passed)" },
  { cached: "0", progress: "(2 passed)" },
  { cached: "-2", progress: "(2 passed)" },
])("progress uses only a positive cached count: $cached", ({
  cached,
  progress,
}) =>
  withSteps(({ getSteps, countFile }) => {
    if (cached !== undefined) writeCacheFile(countFile, cached);
    expect(getSteps().at(-1).progress("..\n")).toBe(progress);
  }));

test("persists the summary total in a new cache for the next run's progress", () =>
  withSteps(({ persistTestTotal, getSteps, countFile }) => {
    persistTestTotal("Tests 4 passed | 1 skipped (5)");
    expect(readFileSync(countFile, "utf8")).toBe("5");
    expect(getSteps().at(-1).progress(".")).toBe("(1/5 passed)");
  }));

test("does not create a cache when the run has no summary", () =>
  withSteps(({ persistTestTotal, cacheDir }) => {
    persistTestTotal("suite crashed");
    expect(existsSync(cacheDir)).toBe(false);
  }));

test.each([
  "suite crashed",
  "Tests 0 passed (0)",
])("preserves the previous count when no usable total is reported: %s", (output) =>
  withSteps(({ persistTestTotal, countFile }) => {
    writeCacheFile(countFile, "8");
    const before = statSync(countFile, { bigint: true }).mtimeNs;
    persistTestTotal(output);
    expect(readFileSync(countFile, "utf8")).toBe("8");
    expect(statSync(countFile, { bigint: true }).mtimeNs).toBe(before);
  }));

test.each([
  false,
  true,
])("pre-run leaves an empty report destination when a stale report exists: %s", (stale) =>
  withSteps(({ getSteps, cacheDir, reportFile }) => {
    if (stale) writeCacheFile(reportFile, "stale report");
    getSteps().at(-1).preRun();
    expect(existsSync(cacheDir)).toBe(true);
    expect(existsSync(reportFile)).toBe(false);
  }));

test.each([
  undefined,
  '<testcase name="fast" time="0.500" />',
])("reports no slow-test warning for missing or fast-only reports: %s", (report) =>
  withSteps(({ reportSlowTests, reportFile }) => {
    if (report !== undefined) writeCacheFile(reportFile, report);
    expect(captureConsole(reportSlowTests)).toEqual([]);
  }));

test("slow-test warnings include available source locations", () =>
  withSteps(({ reportSlowTests, reportFile }) => {
    writeCacheFile(
      reportFile,
      `<testsuite>
      <testcase name="with line" time="0.900" file="test/located.test.js" line="12" />
      <testcase name="file only" time="0.800" file="test/file.test.js" />
      <testcase name="no location" time="0.501" />
    </testsuite>`,
    );
    expect(captureConsole(reportSlowTests)).toEqual([
      "\nSlow tests (>500ms):",
      "  900ms with line (test/located.test.js:12)",
      "  800ms file only (test/file.test.js)",
      "  501ms no location",
    ]);
  }));

test.each([
  0, 1,
])("post-run persists the total but warns only for success: status %s", (status) =>
  withSteps(({ getSteps, countFile, reportFile }) => {
    writeCacheFile(reportFile, '<testcase name="slow" time="0.600" />');
    const { postRun } = getSteps().at(-1);
    const logs = captureConsole(() => postRun("Tests 4 passed (4)", status));
    expect(readFileSync(countFile, "utf8")).toBe("4");
    expect(logs).toEqual(
      status === 0 ? ["\nSlow tests (>500ms):", "  600ms slow"] : [],
    );
  }));
