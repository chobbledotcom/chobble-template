import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ROOT_DIR } from "#lib/paths.js";
import {
  buildCpdDuplicateLines,
  buildCpdFailureLines,
  buildCpdFailureMessage,
  buildSourceExcerptLines,
  cpdMain,
  describeCloneKind,
  jscpdBinaryPath,
  loadCpdDuplicates,
  runCpd,
} from "#scripts/cpd.js";
import { lowerMinTokens, parseCpdArgs } from "#scripts/cpd-ratchet.js";
import { installedJscpd, jscpdPaths } from "#scripts/jscpd/install.js";
import { mockExitThrow, noop } from "#test/test-utils.js";

const SAMPLE_DUPLICATE = {
  format: "javascript",
  lines: 7,
  kind: "exact",
  firstFile: { name: "scripts/cpd-ratchet.js", start: 47, end: 53 },
  secondFile: { name: "scripts/cpd.js", start: 42, end: 48 },
  fragment: "throw new Error(...)",
};

// A test-local report dir: the real .jscpd-report is written by the cpd
// steps of the full suite, which run concurrently with this file.
const REPORT_DIR = join(import.meta.dirname, ".cpd-report-fixture");
const REPORT_PATH = join(REPORT_DIR, "jscpd-report.json");

const writeReport = (report) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report));
};

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

    expect(lines).toContain("❌ Clone found (javascript, 7 lines, exact)");
    expect(lines).toContain("  scripts/cpd-ratchet.js: 47-53");
    expect(lines).toContain("  Duplicated lines:");
    expect(lines).toContain("  scripts/cpd.js: 42-48");
    expect(lines).toContain("  Duplicated lines:");
    expect(lines).toContain("  Normalized duplicate fragment:");
    expect(lines).toContain("    throw new Error(...)");
  });

  test("describes renamed clones without a ratio", () => {
    expect(describeCloneKind({ kind: "renamed" })).toBe("renamed");
  });

  test("describes gap-merged similar clones with their ratio", () => {
    expect(
      describeCloneKind({ kind: "similar", method: "gap", similarity: 0.91 }),
    ).toBe("similar (gap) ~0.91");
  });

  test("describes AST-similar clones with their ratio", () => {
    expect(
      describeCloneKind({ kind: "similar", method: "ast", similarity: 1 }),
    ).toBe("similar (ast) ~1.00");
  });

  test("defaults clones without a kind to exact", () => {
    expect(describeCloneKind({})).toBe("exact");
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
    const lines = buildCpdFailureLines([SAMPLE_DUPLICATE]);

    expect(lines[0]).toBe("❌ jscpd found duplicated code");
    expect(lines.some((line) => line.includes("Write a helper"))).toBe(true);
    expect(lines.some((line) => line.includes("Curry"))).toBe(true);
  });

  test("limits duplicate details in a full failure block", () => {
    const duplicates = Array.from({ length: 6 }, (_, index) => ({
      ...SAMPLE_DUPLICATE,
      firstFile: { ...SAMPLE_DUPLICATE.firstFile, start: index + 1 },
    }));
    const lines = buildCpdFailureLines(duplicates);

    expect(lines).toContain("  ... and 1 more duplicate block(s)");
  });
});

describe("loadCpdDuplicates", () => {
  test("returns the duplicates from a written report", () => {
    writeReport({ duplicates: [SAMPLE_DUPLICATE] });

    expect(loadCpdDuplicates(REPORT_PATH)).toEqual([SAMPLE_DUPLICATE]);
  });

  test("throws when no report was written", () => {
    expect(() => loadCpdDuplicates(REPORT_PATH)).toThrow("wrote no report");
  });

  test("throws when the report lists no duplicates", () => {
    writeReport({ duplicates: [] });

    expect(() => loadCpdDuplicates(REPORT_PATH)).toThrow("lists no duplicates");
  });
});

// These tests spawn a real jscpd via npx, which can take well over the
// default timeout when the full suite's lanes load the machine.
describe("jscpdBinaryPath", () => {
  test("prefers JSCPD_BIN when set", () => {
    const previous = process.env.JSCPD_BIN;
    process.env.JSCPD_BIN = "/nix/store/jscpd/bin/jscpd";
    try {
      expect(jscpdBinaryPath()).toBe("/nix/store/jscpd/bin/jscpd");
    } finally {
      if (previous === undefined) delete process.env.JSCPD_BIN;
      else process.env.JSCPD_BIN = previous;
    }
  });

  test("uses the installed .bin/jscpd, else falls back to npx", () => {
    const previous = process.env.JSCPD_BIN;
    delete process.env.JSCPD_BIN;
    try {
      // The devenv stages .bin/jscpd locally; without it, npx (null) is the
      // npm-binary fallback that GitHub Actions uses.
      const resolved = jscpdBinaryPath();
      if (installedJscpd()) {
        expect(resolved).toBe(jscpdPaths.binaryPath);
      } else {
        expect(resolved).toBeNull();
      }
    } finally {
      if (previous === undefined) delete process.env.JSCPD_BIN;
      else process.env.JSCPD_BIN = previous;
    }
  });

  test("falls back to the repo-local bin/jscpd when no installed binary applies", () => {
    const binDir = join(ROOT_DIR, "bin");
    const local = join(binDir, "jscpd");
    const previous = process.env.JSCPD_BIN;
    delete process.env.JSCPD_BIN;
    try {
      mkdirSync(binDir, { recursive: true });
      writeFileSync(local, "");

      expect(jscpdBinaryPath(false)).toBe(local);

      rmSync(local, { force: true });
      expect(jscpdBinaryPath(false)).toBeNull();
    } finally {
      rmSync(local, { force: true });
      if (previous === undefined) delete process.env.JSCPD_BIN;
      else process.env.JSCPD_BIN = previous;
    }
  });
});

describe("runCpd", () => {
  test("runs jscpd and returns its status", () => {
    expect(runCpd(["--version"], REPORT_PATH)).toBe(0);
  }, 30_000);

  test("throws on a crashed run instead of reporting stale duplication", () => {
    // A pre-existing report from an earlier run must not make a crashed
    // run (bad flag: jscpd exits non-zero without scanning) look like a
    // duplication failure.
    writeReport({ duplicates: [SAMPLE_DUPLICATE] });

    expect(() => runCpd(["--bad-option-for-coverage"], REPORT_PATH)).toThrow(
      "wrote no report",
    );
  }, 30_000);

  test("prints guidance and returns non-zero on real duplication", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(noop);
    const duplicatedSource = [
      "const sumOfSquares = (values) => {",
      "  const squares = values.map((value) => value * value);",
      "  const total = squares.reduce((sum, value) => sum + value, 0);",
      "  return { squares, total, count: values.length };",
      "};",
      "export default sumOfSquares;",
      "",
    ].join("\n");

    // The fixture lives in the OS temp dir, outside the repo, so the
    // suite's own code-quality scanners can never pick it up.
    const runOnDuplicatedFixture = () => {
      const fixtureDir = mkdtempSync(join(tmpdir(), "cpd-fixture-"));
      try {
        writeFileSync(join(fixtureDir, "first.js"), duplicatedSource);
        writeFileSync(join(fixtureDir, "second.js"), duplicatedSource);
        return runCpd(
          [
            fixtureDir,
            "--min-tokens",
            "10",
            "--silent",
            "--output",
            REPORT_DIR,
          ],
          REPORT_PATH,
        );
      } finally {
        rmSync(fixtureDir, { force: true, recursive: true });
      }
    };

    expect(runOnDuplicatedFixture()).not.toBe(0);
    expect(errorSpy).toHaveBeenCalledWith("❌ jscpd found duplicated code");
    errorSpy.mockRestore();
  }, 30_000);
});

describe("cpd-ratchet invocation parsing", () => {
  const CPD_SCRIPT =
    "node scripts/cpd.js && node scripts/cpd.js src/_lib scripts --min-tokens 18 --ignore '**/index.js,**/mutation/**' --ignore-pattern 'import.*from'";

  test("extracts the strict segment's args with quotes stripped", () => {
    expect(parseCpdArgs(CPD_SCRIPT)).toEqual([
      "src/_lib",
      "scripts",
      "--min-tokens",
      "18",
      "--ignore",
      "**/index.js,**/mutation/**",
      "--ignore-pattern",
      "import.*from",
    ]);
  });

  test("matches the real package.json cpd script", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT_DIR, "package.json"), "utf-8"),
    );
    const args = parseCpdArgs(pkg.scripts.cpd);

    expect(args).toContain("--min-tokens");
    expect(lowerMinTokens(args).current).toBeGreaterThan(1);
  });

  test("throws when no strict segment carries --min-tokens", () => {
    expect(() => parseCpdArgs("node scripts/cpd.js")).toThrow(
      "Expected exactly one strict (--ignore-pattern, non-near) --min-tokens segment",
    );
  });

  test("throws when the strict segment is not a cpd.js invocation", () => {
    // No --ignore-pattern, so this min-tokens segment is not the strict one.
    expect(() =>
      parseCpdArgs("jscpd src --min-tokens 18 --ignore-pattern 'import.*from'"),
    ).toThrow("no longer starts with");
  });

  test("lowers only the min-tokens value", () => {
    const { current, ratchetArgs } = lowerMinTokens([
      "src",
      "--min-tokens",
      "18",
    ]);

    expect(current).toBe(18);
    expect(ratchetArgs).toEqual(["src", "--min-tokens", "17"]);
  });

  test("throws when min-tokens is missing or cannot be lowered", () => {
    expect(() => lowerMinTokens(["src"])).toThrow("--min-tokens");
    expect(() => lowerMinTokens(["--min-tokens", "1"])).toThrow("--min-tokens");
  });
});

describe("cpdMain", () => {
  test("runs jscpd over process argv and exits with its status", () => {
    const argvBackup = [...process.argv];
    process.argv.splice(2, process.argv.length - 2, "--version");
    const exitSpy = mockExitThrow();

    expect(() => cpdMain()).toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    process.argv.splice(0, process.argv.length, ...argvBackup);
  }, 30_000);
});
