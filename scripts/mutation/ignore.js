/**
 * Known-equivalent mutant ignore-list.
 *
 * Some surviving mutants are *equivalent*: no possible input distinguishes the
 * mutated code from the original (e.g. `x ?? ""` vs `x || ""` when the only
 * falsy value `x` can take is `""`, or `a - b` in a sort over an already-sorted
 * index array). They can never be killed, so once one is confirmed equivalent
 * it is recorded here and suppressed from the survivor count — letting the
 * tester gate CI on genuinely *new* survivors.
 *
 * Works for every mutation kind, not just `?? → ||`: an entry is matched purely
 * by location and the displayed `from → to`, so it mirrors a survivor line from
 * the report. The file format is one entry per line, plus an optional reason:
 *
 *   path:line:col  from → to   # why it is equivalent
 *
 * Entries are location-based, so a refactor that shifts lines silently leaves
 * them pointing at nothing. `ignoreListProblems` re-checks — at run time, only
 * for the files actually being mutated — that each entry still lines up with a
 * real surviving mutant, so a stale/redundant/duplicate entry fails the run.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { rel } from "#scripts/mutation/summary.js";
import { unique } from "#utils/fp/array.js";

/** @typedef {import("#scripts/mutation/generate.js").Mutant} Mutant */
/** @typedef {import("#scripts/mutation/summary.js").MutantResult} MutantResult */
/** @typedef {{ entries: string[], keys: Set<string> }} IgnoreList */

const IGNORE_FILE = new URL("./equivalent-mutants.txt", import.meta.url);

/**
 * Canonical key for a mutant at a project-relative path.
 * @param {string} relPath
 * @param {Mutant} mutant
 */
const keyFor = (relPath, mutant) =>
  `${relPath}:${mutant.line}:${mutant.column} ${mutant.operator}→${mutant.newOperator}`;

/**
 * Canonical key for a mutant given its absolute source path.
 * @param {string} file
 * @param {Mutant} mutant
 */
export const mutantKey = (file, mutant) => keyFor(rel(file), mutant);

/**
 * Parse one ignore-file line into `{ key, path }`, or null when blank/comment.
 * @param {string} line
 * @returns {{ key: string, path: string } | null}
 */
const parseLine = (line) => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  // Split on the `→` separator (which never appears in JS source) rather than
  // stripping at the first `#`: the mutant text (left of `→`) may legitimately
  // contain `#`, e.g. `querySelector("body #nav")`. The replacement (right of
  // `→`) is always an operator or `(removed)` and never contains `#`, so the
  // optional `# reason` comment can be stripped from that side only.
  const match = trimmed.match(/^(.+:\d+:\d+)\s+(.+?)\s*→\s*(.+?)$/);
  if (!match) return null;
  const to = match[3].replace(/\s+#.*$/, "").trim();
  return {
    key: `${match[1]} ${match[2]}→${to}`,
    path: match[1].replace(/:\d+:\d+$/, ""),
  };
};

/**
 * Load the ignore-list (empty when the file is absent). Entries that point
 * at files which no longer exist throw immediately: the per-run validation
 * only covers the files being mutated, so a deleted file's entries would
 * otherwise rot silently forever.
 * @param {string | URL} [file]
 * @returns {IgnoreList}
 */
export const loadIgnoreList = (file = IGNORE_FILE) => {
  if (!existsSync(file)) return { entries: [], keys: new Set() };
  const parsed = readFileSync(file, "utf-8")
    .split("\n")
    .map(parseLine)
    .filter((entry) => entry !== null);

  const missing = unique(parsed.map((entry) => entry.path)).filter(
    (path) => !existsSync(join(ROOT_DIR, path)),
  );
  if (missing.length > 0) {
    throw new Error(
      `equivalent-mutants.txt lists files that no longer exist - remove their entries:\n  ${missing.join("\n  ")}`,
    );
  }

  const entries = parsed.map((entry) => entry.key);
  return { entries, keys: new Set(entries) };
};

/**
 * Whether a survivor is a recorded known-equivalent mutant.
 * @param {IgnoreList} ignore
 * @param {string} file
 * @param {Mutant} mutant
 */
export const isIgnored = (ignore, file, mutant) =>
  ignore.keys.has(mutantKey(file, mutant));

/**
 * Validate the ignore entries that target the just-mutated files against the
 * run's results. Each entry must line up with a mutant that actually survived;
 * anything else is reported so it can be fixed. Pure — the runner prints these.
 *
 *   - stale     — no mutant exists at that location (the code moved)
 *   - redundant — a mutant exists there but a test kills it (not a survivor)
 *   - duplicate — the same entry appears more than once
 *
 * Scoped to `mutatedFiles`: an entry for a file you are not testing right now
 * can't be checked, and doesn't matter until you do.
 */
/**
 * Classify one ignore entry against the run, returning a problem or null.
 * @param {string} key
 * @param {Set<string>} seen
 * @param {Set<string>} generated
 * @param {Set<string>} suppressed
 */
const entryProblem = (key, seen, generated, suppressed) => {
  if (seen.has(key)) return `duplicate entry: ${key}`;
  seen.add(key);
  if (!generated.has(key)) {
    return `stale (no mutant here — did the code move?): ${key}`;
  }
  if (!suppressed.has(key)) {
    return `redundant (a test kills this mutant, not a survivor): ${key}`;
  }
  return null;
};

/**
 * @param {IgnoreList} ignore
 * @param {MutantResult[]} results
 * @param {string[]} mutatedFiles
 */
export const ignoreListProblems = (ignore, results, mutatedFiles) => {
  const relFiles = mutatedFiles.map(rel);
  /** @param {string} key */
  const targetsMutatedFile = (key) =>
    relFiles.some((file) => key.startsWith(`${file}:`));
  const generated = new Set(results.map((r) => mutantKey(r.file, r.mutant)));
  const suppressed = new Set(
    results
      .filter((r) => r.status === "ignored")
      .map((r) => mutantKey(r.file, r.mutant)),
  );

  const problems = [];
  const seen = new Set();
  for (const key of ignore.entries) {
    if (!targetsMutatedFile(key)) continue;
    const problem = entryProblem(key, seen, generated, suppressed);
    if (problem !== null) problems.push(problem);
  }
  return problems;
};
