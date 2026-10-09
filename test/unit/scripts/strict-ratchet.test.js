import { describe, expect, test } from "vitest";
import {
  compareToBaseline,
  formatBaseline,
  parseErrorsByFile,
} from "#scripts/strict-typecheck-ratchet.js";

const TSC_OUTPUT = [
  "src/a.js(3,10): error TS2345: Argument of type 'string' is not assignable.",
  "src/a.js(9,1): error TS7006: Parameter 'x' implicitly has an 'any' type.",
  "scripts/b.js(12,5): error TS2532: Object is possibly 'undefined'.",
  "Found 3 errors in 2 files.",
].join("\n");

describe("parseErrorsByFile", () => {
  test("groups diagnostic lines by the file they point at", () => {
    const errorsByFile = parseErrorsByFile(TSC_OUTPUT);

    expect([...errorsByFile.keys()]).toEqual(["src/a.js", "scripts/b.js"]);
    expect(errorsByFile.get("src/a.js")).toHaveLength(2);
    expect(errorsByFile.get("scripts/b.js")).toEqual([
      "scripts/b.js(12,5): error TS2532: Object is possibly 'undefined'.",
    ]);
  });

  test("keeps file paths containing parentheses and colons intact", () => {
    const line = "src/my (odd) dir/c.js(1,1): error TS1005: ':' expected.";
    const errorsByFile = parseErrorsByFile(line);

    expect([...errorsByFile.keys()]).toEqual(["src/my (odd) dir/c.js"]);
  });

  test("ignores non-error output lines", () => {
    const errorsByFile = parseErrorsByFile("Found 0 errors.\nsome banner\n\n");

    expect(errorsByFile.size).toBe(0);
  });

  test("throws on a project-level error with no file prefix", () => {
    expect(() =>
      parseErrorsByFile("error TS5023: Unknown compiler option 'bogus'."),
    ).toThrow("project-level error");
  });
});

describe("compareToBaseline", () => {
  const errors = parseErrorsByFile(TSC_OUTPUT);

  test("passes silently when counts match the baseline exactly", () => {
    const { regressions, improvements } = compareToBaseline(errors, {
      "src/a.js": 2,
      "scripts/b.js": 1,
    });

    expect(regressions).toEqual([]);
    expect(improvements).toEqual([]);
  });

  test("flags a listed file that exceeds its baseline count", () => {
    const { regressions } = compareToBaseline(errors, {
      "src/a.js": 1,
      "scripts/b.js": 1,
    });

    expect(regressions).toEqual([{ file: "src/a.js", actual: 2, allowed: 1 }]);
  });

  test("flags an unlisted file with errors as a regression from zero", () => {
    const { regressions } = compareToBaseline(errors, { "src/a.js": 2 });

    expect(regressions).toEqual([
      { file: "scripts/b.js", actual: 1, allowed: 0 },
    ]);
  });

  test("flags a file that dropped below baseline as an improvement", () => {
    const { improvements } = compareToBaseline(errors, {
      "src/a.js": 5,
      "scripts/b.js": 1,
    });

    expect(improvements).toEqual([{ file: "src/a.js", actual: 2, allowed: 5 }]);
  });

  test("flags a baseline entry for a now-clean file so it gets removed", () => {
    const { improvements } = compareToBaseline(new Map(), {
      "src/deleted.js": 4,
    });

    expect(improvements).toEqual([
      { file: "src/deleted.js", actual: 0, allowed: 4 },
    ]);
  });
});

describe("formatBaseline", () => {
  test("renders a sorted ready-to-paste baseline literal", () => {
    const rendered = formatBaseline(parseErrorsByFile(TSC_OUTPUT));

    expect(rendered).toBe(
      [
        "const STRICT_ERROR_BASELINE = frozenObject({",
        '  "scripts/b.js": 1,',
        '  "src/a.js": 2,',
        "});",
      ].join("\n"),
    );
  });
});
