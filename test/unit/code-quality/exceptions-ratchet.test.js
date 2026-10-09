import { describe, expect, test } from "vitest";
import * as exceptions from "#test/code-quality/code-quality-exceptions.js";
import { frozenSet } from "#utils/fp/set.js";

/**
 * Per-entry ratchet for test/code-quality/code-quality-exceptions.js.
 *
 * The central exceptions file is a deletion-only legacy baseline: entries
 * may only disappear, never be replaced. Any entry the baseline below does
 * not record fails as a new violation - including one slipped in to
 * balance out a deletion elsewhere, which a count-only ratchet would miss.
 * Any recorded entry that disappears fails with a ready-to-paste
 * replacement baseline so every deletion is locked in immediately.
 * Legitimate entry edits (a shifted line, a renamed export) surface as
 * both a removal and an addition and require an explicitly reviewed update.
 * The suggested replacement only removes entries; it never approves additions.
 */

const RATCHET_BASELINE = {
  ALLOWED_DATA_FALLBACKS: [],
  ALLOWED_DOM_CONSTRUCTOR: ["test/unit/code-quality/dom-mocking.test.js"],
  ALLOWED_NULLISH_COALESCING: ["src/_data/eleventyComputed.js"],
  ALLOWED_PROCESS_CWD: ["test/test-utils/resource.js"],
  ALLOWED_SINGLE_USE_FUNCTIONS: [
    "src/_lib/eleventy/file-utils.js",
    "src/_lib/eleventy/html-transform.js",
    "test/unit/code-quality/html-in-js.test.js",
  ],
  ALLOWED_TEST_ONLY_EXPORTS: [],
  ALLOWED_TRY_CATCHES: [
    "scripts/customise-cms/index.js:179",
    "scripts/mutation/runner.js:384",
    "scripts/mutation/runner.js:405",
    "scripts/mutation/summary.js:219",
    "test/ensure-deps.js:26",
    "test/integration/pages-yml-validation.test.js:45",
    "test/test-utils/assertions.js:127",
  ],
};

const compareExceptions = (baseline, current) => ({
  added: Object.entries(current).flatMap(([name, set]) =>
    [...set]
      .filter((entry) => !baseline[name].includes(entry))
      .map((entry) => `${name}: ${entry}`),
  ),
  removed: Object.entries(baseline).flatMap(([name, entries]) =>
    entries
      .filter((entry) => !current[name].has(entry))
      .map((entry) => `${name}: ${entry}`),
  ),
  deletionOnlyBaseline: Object.fromEntries(
    Object.entries(baseline).map(([name, entries]) => [
      name,
      entries.filter((entry) => current[name].has(entry)),
    ]),
  ),
});

describe("exceptions-ratchet", () => {
  test.each([
    ["unchanged entries", ["legacy"], [], [], ["legacy"]],
    ["addition only", ["legacy", "new"], ["RULE: new"], [], ["legacy"]],
    ["deletion only", [], [], ["RULE: legacy"], []],
    ["replacement", ["new"], ["RULE: new"], ["RULE: legacy"], []],
  ])("compares %s without approving additions", (_name, entries, added, removed, retained) => {
    expect(
      compareExceptions({ RULE: ["legacy"] }, { RULE: frozenSet(entries) }),
    ).toEqual({ added, removed, deletionOnlyBaseline: { RULE: retained } });
  });

  test("deletion updates keep unrelated new exceptions rejected", () => {
    const current = { FIRST: frozenSet([]), SECOND: frozenSet(["new"]) };
    const { deletionOnlyBaseline } = compareExceptions(
      { FIRST: ["legacy"], SECOND: [] },
      current,
    );

    expect(compareExceptions(deletionOnlyBaseline, current).added).toEqual([
      "SECOND: new",
    ]);
  });

  test("every exported allowlist is a Set", () => {
    const nonSets = Object.entries(exceptions)
      .filter(([, set]) => !(set instanceof Set))
      .map(([name]) => name);

    expect(nonSets).toEqual([]);
  });

  test("baseline covers every exported allowlist", () => {
    expect(Object.keys(exceptions).sort()).toEqual(
      Object.keys(RATCHET_BASELINE).sort(),
    );
  });

  test("allowlists gain no entries the baseline does not record", () => {
    const { added } = compareExceptions(RATCHET_BASELINE, exceptions);

    if (added.length > 0) {
      console.log("\n  New code-quality exception entries:");
      for (const entry of added) {
        console.log(`    - ${entry}`);
      }
      console.log(
        "\n  The central exceptions file is deletion-only: fix the code or",
      );
      console.log(
        "  fix the check - never add entries for new violations. If an",
      );
      console.log(
        "  entry merely moved (renamed file, shifted line), request an",
      );
      console.log("  explicit review of that baseline update instead.");
    }

    expect(added).toEqual([]);
  });

  test("entries removed since the baseline are locked in", () => {
    const { removed, deletionOnlyBaseline } = compareExceptions(
      RATCHET_BASELINE,
      exceptions,
    );

    if (removed.length > 0) {
      console.log("\n  Allowlist entries no longer present:");
      for (const entry of removed) {
        console.log(`    - ${entry}`);
      }
      console.log("\n  Lock the win in - replace RATCHET_BASELINE with:\n");
      console.log(JSON.stringify(deletionOnlyBaseline, null, 2));
    }

    expect(removed).toEqual([]);
  });
});
