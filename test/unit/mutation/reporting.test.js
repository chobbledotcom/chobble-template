import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import {
  ignoreListProblems,
  isIgnored,
  loadIgnoreList,
  mutantKey,
} from "#scripts/mutation/ignore.js";
import {
  formatSummaryLines,
  rel,
  summarize,
  writeStepSummary,
} from "#scripts/mutation/summary.js";

/** Strip ANSI colour codes so assertions read plainly. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const plain = (s) => s.replace(ANSI, "");

const mutant = (over = {}) => ({
  column: 7,
  end: 0,
  line: 42,
  newOperator: "||",
  operator: "??",
  start: 0,
  ...over,
});

const result = (status, over = {}) => ({
  file: "src/foo.js",
  mutant: mutant(over),
  status,
});

/** One result per status, each on its own line so they stay distinct mutants. */
const sample = (...statuses) =>
  statuses.map((status, index) => result(status, { line: index + 1 }));

describe("summarize", () => {
  test("scores detected (killed + timed-out) over effective mutants", () => {
    const summary = summarize(sample("killed", "timed-out", "survived"));
    expect(summary.killed).toBe(1);
    expect(summary.timedOut).toBe(1);
    expect(summary.survived).toBe(1);
    expect(summary.detected).toBe(2);
    expect(summary.effective).toBe(3);
    expect(summary.score).toBeCloseTo((2 / 3) * 100);
  });

  test("excludes ignored mutants from the denominator", () => {
    const summary = summarize([
      result("killed"),
      result("ignored", { line: 2 }),
    ]);
    // One killed of one effective mutant — the ignored one is suppressed.
    expect(summary.effective).toBe(1);
    expect(summary.ignored).toBe(1);
    expect(summary.score).toBe(100);
  });

  test("an empty run scores a vacuous 100 but zero total", () => {
    const summary = summarize([]);
    expect(summary.total).toBe(0);
    expect(summary.score).toBe(100);
  });
});

describe("formatSummaryLines", () => {
  test("flags an empty run as inconclusive", () => {
    const lines = formatSummaryLines(summarize([])).map(plain).join("\n");
    expect(lines).toContain("INCONCLUSIVE");
  });

  test("lists each survivor with its location and swap", () => {
    const lines = formatSummaryLines(summarize([result("survived")]))
      .map(plain)
      .join("\n");
    expect(lines).toContain("src/foo.js:42:7");
    expect(lines).toContain("?? → ||");
  });

  test("reports success when every mutant is detected", () => {
    const lines = formatSummaryLines(summarize([result("killed")]))
      .map(plain)
      .join("\n");
    expect(lines).toContain("All mutants were detected.");
    // With nothing suppressed, the report must not mention suppression at all.
    expect(lines).not.toContain("suppressed");
  });

  test("notes when all mutants are suppressed as known-equivalent", () => {
    const lines = formatSummaryLines(summarize([result("ignored")]))
      .map(plain)
      .join("\n");
    expect(lines).toContain("suppressed as known-equivalent");
  });

  test("renders the ignored count row alongside survivors and timeouts", () => {
    const summary = summarize(
      sample("killed", "timed-out", "survived", "ignored"),
    );
    const lines = formatSummaryLines(summary).map(plain).join("\n");
    expect(lines).toContain("ignored:");
    expect(lines).toContain("suppressed");
  });
});

describe("writeStepSummary", () => {
  const original = process.env.GITHUB_STEP_SUMMARY;
  afterEach(() => {
    if (original === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = original;
  });

  const writeFor = (results) => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-summary-"));
    const file = join(dir, "summary.md");
    process.env.GITHUB_STEP_SUMMARY = file;
    writeStepSummary(summarize(results));
    const text = readFileSync(file, "utf-8");
    rmSync(dir, { force: true, recursive: true });
    return text;
  };

  test("marks an empty run inconclusive", () => {
    expect(writeFor([])).toContain("Inconclusive");
  });

  test("reports an all-suppressed run as nothing killable", () => {
    expect(writeFor([result("ignored")])).toContain("nothing killable");
  });

  test("tabulates survivors and the suppressed count when mutants survive", () => {
    const md = writeFor([result("survived"), result("ignored", { line: 2 })]);
    expect(md).toContain("survived");
    expect(md).toContain("### Survivors");
    expect(md).toContain("`src/foo.js:42:7`");
  });

  test("headlines a clean run as all detected, with no suppression noise", () => {
    const md = writeFor([result("killed")]);
    expect(md).toContain("All 1 mutants detected");
    // Nothing ignored → no suppressed suffix and no ignored metric row.
    expect(md).not.toContain("suppressed");
    expect(md).not.toContain("ignored (suppressed)");
  });

  test("the survived headline reports a real score, never NaN", () => {
    const md = writeFor([result("survived")]);
    expect(md).toContain("mutant(s) survived");
    expect(md).not.toContain("NaN");
  });

  test("does nothing when not running inside GitHub Actions", () => {
    delete process.env.GITHUB_STEP_SUMMARY;
    // No env, no file, no throw — the call is simply a no-op.
    expect(() => writeStepSummary(summarize([result("killed")]))).not.toThrow();
  });

  test("never fails the run if the summary file cannot be written", () => {
    process.env.GITHUB_STEP_SUMMARY = join(
      tmpdir(),
      "no-such-dir-xyz",
      "summary.md",
    );
    expect(() => writeStepSummary(summarize([result("killed")]))).not.toThrow();
  });
});

describe("loadIgnoreList", () => {
  test("parses entries, skipping blanks and comments", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-ignore-"));
    const file = join(dir, "list.txt");
    writeFileSync(
      file,
      // Real entry first so any corruption of the read (e.g. concatenating onto
      // an undefined accumulator) breaks the parsed key, not just a comment.
      ["src/foo.js:42:7 ?? → ||  # equivalent", "# a comment", ""].join("\n"),
    );
    const list = loadIgnoreList(file);
    rmSync(dir, { force: true, recursive: true });
    expect(list.entries).toEqual(["src/foo.js:42:7 ??→||"]);
    expect(list.keys.has("src/foo.js:42:7 ??→||")).toBe(true);
  });

  test("returns an empty list when the file is absent", () => {
    const list = loadIgnoreList(join(tmpdir(), "definitely-missing-xyz.txt"));
    expect(list.entries).toEqual([]);
    expect(list.keys.size).toBe(0);
  });
});

describe("rel", () => {
  test("strips the project-root prefix (and its trailing slash)", () => {
    expect(rel(`${ROOT_DIR}/src/foo.js`)).toBe("src/foo.js");
  });

  test("leaves a path outside the project root untouched", () => {
    expect(rel("/elsewhere/foo.js")).toBe("/elsewhere/foo.js");
  });
});

describe("mutantKey / isIgnored", () => {
  test("a key combines relative path, location and the swap", () => {
    expect(mutantKey("src/foo.js", mutant())).toBe("src/foo.js:42:7 ??→||");
  });

  test("isIgnored matches a survivor against the loaded key set", () => {
    const ignore = { entries: [], keys: new Set(["src/foo.js:42:7 ??→||"]) };
    expect(isIgnored(ignore, "src/foo.js", mutant())).toBe(true);
    expect(isIgnored(ignore, "src/foo.js", mutant({ line: 99 }))).toBe(false);
  });
});

describe("ignoreListProblems", () => {
  const key = "src/foo.js:42:7 ??→||";

  // Validate `entries` against a run's `results` over the given mutated `files`.
  const problemsFor = (
    results,
    { entries = [key], files = ["src/foo.js"] } = {},
  ) => ignoreListProblems({ entries, keys: new Set(entries) }, results, files);

  test("accepts an entry that lines up with a suppressed survivor", () => {
    expect(problemsFor([result("ignored")])).toEqual([]);
  });

  test("flags an entry with no matching mutant as stale", () => {
    expect(problemsFor([])[0]).toContain("stale");
  });

  test("flags an entry the tests actually kill as redundant", () => {
    expect(problemsFor([result("killed")])[0]).toContain("redundant");
  });

  test("flags a repeated entry as duplicate", () => {
    const problems = problemsFor([result("ignored")], { entries: [key, key] });
    expect(problems.some((p) => p.includes("duplicate"))).toBe(true);
  });

  test("ignores entries for files outside the current run", () => {
    expect(problemsFor([], { files: ["src/other.js"] })).toEqual([]);
  });
});
