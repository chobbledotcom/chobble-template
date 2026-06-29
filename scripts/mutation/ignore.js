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

import { readFileSync } from "node:fs";
import { rel } from "./summary.js";

const IGNORE_FILE = new URL("./equivalent-mutants.txt", import.meta.url);

/** Canonical key for a mutant at a project-relative path. */
const keyFor = (relPath, mutant) =>
  `${relPath}:${mutant.line}:${mutant.column} ${mutant.operator}→${mutant.newOperator}`;

/** Canonical key for a mutant given its absolute source path. */
export const mutantKey = (file, mutant) => keyFor(rel(file), mutant);

/** Parse one ignore-file line into a canonical key, or null when blank/comment. */
const parseLine = (line) => {
  // Strip only a trailing, whitespace-preceded `# reason` comment — a `#` glued
  // inside the mutant text (e.g. `querySelector("#nav")`) must be preserved.
  const body = line.replace(/\s+#.*$/, "").trim();
  if (body === "") return null;
  const match = body.match(/^(.+:\d+:\d+)\s+(.+?)\s*→\s*(.+?)$/);
  return match ? `${match[1]} ${match[2]}→${match[3]}` : null;
};

/** Load the ignore-list (empty when the file is absent). */
export const loadIgnoreList = (file = IGNORE_FILE) => {
  let text;
  try {
    text = readFileSync(file, "utf-8");
  } catch {
    return { entries: [], keys: new Set() };
  }
  const entries = text
    .split("\n")
    .map(parseLine)
    .filter((key) => key !== null);
  return { entries, keys: new Set(entries) };
};

/** Whether a survivor is a recorded known-equivalent mutant. */
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
/** Classify one ignore entry against the run, returning a problem or null. */
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

export const ignoreListProblems = (ignore, results, mutatedFiles) => {
  const relFiles = mutatedFiles.map(rel);
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
