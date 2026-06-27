import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT_DIR } from "#lib/paths.js";

const SAMPLE_DUPLICATE = {
  format: "javascript",
  lines: 7,
  firstFile: { name: "scripts/cpd-ratchet.js", start: 47, end: 53 },
  secondFile: { name: "scripts/cpd.js", start: 42, end: 48 },
  fragment: "throw new Error(...)",
};

const SAMPLE_REPORT = { duplicates: [SAMPLE_DUPLICATE] };
const REPORT_DIR = join(ROOT_DIR, ".jscpd-report");
const REPORT_PATH = join(REPORT_DIR, "jscpd-report.json");
const CPD_PATH = join(ROOT_DIR, "scripts", "cpd.js");
const ORIGINAL_ARGV = [...process.argv];
const noop = () => undefined;
const exitSpy = spyOn(process, "exit").mockImplementation(noop);

process.argv.splice(
  0,
  process.argv.length,
  process.execPath,
  CPD_PATH,
  "--version",
);

const {
  buildCpdDuplicateLines,
  buildCpdFailureLines,
  buildCpdFailureMessage,
  buildSourceExcerptLines,
  loadCpdReport,
  runCpd,
  throwIfSpawnFailed,
} = await import(pathToFileURL(CPD_PATH).href);

process.argv.splice(0, process.argv.length, ...ORIGINAL_ARGV);
exitSpy.mockRestore();

afterEach(() => {
  rmSync(REPORT_DIR, { force: true, recursive: true });
});

describe("cpd failure guidance", () => {
  test("includes helper, curry, and ignore advice", () => {
    const message = buildCpdFailureMessage();

    expect(message).toContain("Write a helper");
    expect(message).toContain("Curry");
    expect(message).toContain("jscpd:ignore");
    expect(message).toContain("import blocks");
  });

  test("formats duplicate spans for the precommit summary", () => {
    const lines = buildCpdDuplicateLines(SAMPLE_DUPLICATE);

    expect(lines).toContain("❌ Clone found (javascript, 7 lines)");
    expect(lines).toContain("  scripts/cpd-ratchet.js: 47-53");
    expect(lines).toContain("  Duplicated lines:");
    expect(lines).toContain("  scripts/cpd.js: 42-48");
    expect(lines).toContain("  Normalized duplicate fragment:");
    expect(lines).toContain("    throw new Error(...)");
  });

  test("loads numbered source excerpts from duplicate spans", () => {
    const lines = buildSourceExcerptLines({
      name: "scripts/cpd.js",
      start: 1,
      end: 2,
    });

    expect(lines).toEqual(["    1 | #!/usr/bin/env node", "    2 | "]);
  });

  test("truncates long source excerpts", () => {
    const lines = buildSourceExcerptLines({
      name: "scripts/cpd.js",
      start: 1,
      end: 25,
    });

    expect(lines).toHaveLength(21);
    expect(lines.at(-1)).toBe("    ... (5 more lines)");
  });

  test("reports unavailable source for missing, invalid, or unreadable paths", () => {
    expect(buildSourceExcerptLines({ start: 1, end: 1 })).toEqual([
      "    (source unavailable)",
    ]);
    expect(
      buildSourceExcerptLines({
        name: "../outside-root.js",
        start: 1,
        end: 1,
      }),
    ).toEqual(["    (source unavailable)"]);
    expect(
      buildSourceExcerptLines({
        name: "missing-file.js",
        start: 1,
        end: 1,
      }),
    ).toEqual(["    (source unavailable)"]);
  });

  test("omits duplicate lines when a duplicate is incomplete", () => {
    expect(
      buildCpdDuplicateLines({ firstFile: SAMPLE_DUPLICATE.firstFile }),
    ).toEqual([]);
  });

  test("builds a full failure block with advice", () => {
    const lines = buildCpdFailureLines(SAMPLE_REPORT);

    expect(lines[0]).toBe("❌ jscpd found duplicated code");
    expect(lines.some((line) => line.includes("Write a helper"))).toBe(true);
    expect(lines.some((line) => line.includes("Curry"))).toBe(true);
  });

  test("limits duplicate details in a full failure block", () => {
    const duplicates = Array.from({ length: 6 }, (_, index) => ({
      ...SAMPLE_DUPLICATE,
      firstFile: { ...SAMPLE_DUPLICATE.firstFile, start: index + 1 },
    }));
    const lines = buildCpdFailureLines({ duplicates });

    expect(lines).toContain("  ... and 1 more duplicate block(s)");
  });

  test("builds guidance without duplicate details when no report is available", () => {
    const lines = buildCpdFailureLines(null);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("jscpd found duplicated code");
  });

  test("loads the jscpd json report when it exists", () => {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify(SAMPLE_REPORT));

    expect(loadCpdReport()).toEqual(SAMPLE_REPORT);
  });

  test("returns null when the jscpd report cannot be loaded", () => {
    expect(loadCpdReport()).toBeNull();
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(REPORT_PATH, "{");
    expect(loadCpdReport()).toBeNull();
  });

  test("throws a readable error when the jscpd spawn fails", () => {
    expect(() =>
      throwIfSpawnFailed(
        { error: new Error("spawn ENOENT") },
        "example-command",
      ),
    ).toThrow("Failed to run example-command: spawn ENOENT");
  });

  test("runs jscpd and returns its status", () => {
    expect(runCpd(["--version"])).toBe(0);
  });

  test("prints guidance when jscpd exits with a failure status", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(noop);

    const status = runCpd(["--bad-option-for-coverage"]);

    expect(status).not.toBe(0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("jscpd found duplicated code"),
    );
    errorSpy.mockRestore();
  });
});
