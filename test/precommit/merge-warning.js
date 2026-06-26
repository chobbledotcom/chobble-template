/**
 * Advisory pre-commit check: probe whether merging the current staged tree
 * with the default remote branch would conflict, using `git merge-tree`.
 * Returns a human-facing warning string, or `undefined` when there is nothing
 * to say or git probing fails (this check never blocks precommit).
 */
import { spawnSync } from "node:child_process";

const REMOTE_REFS = ["origin/main", "origin/master", "origin/trunk"];

const captureGit = (args) => {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return {
    status: r.status,
    success: r.status === 0,
    stdout: typeof r.stdout === "string" ? r.stdout : "",
    stderr: typeof r.stderr === "string" ? r.stderr : "",
  };
};

const gitValue = (args) => {
  const r = captureGit(args);
  if (!r.success) return undefined;
  const v = r.stdout.trim();
  return v || undefined;
};

/** Parse `git merge-tree --name-only` conflicted path list (first line is the
 * resulting tree object; blank line terminates the path list). */
export const parseMergeTreeConflictedPaths = (stdout) => {
  const lines = stdout.split(/\r?\n/);
  const body = lines.slice(1);
  const end = body.indexOf("");
  const paths = end === -1 ? body : body.slice(0, end);
  return Array.from(new Set(paths));
};

export const getMergeConflictWarning = () => {
  if (!captureGit(["rev-parse", "--is-inside-work-tree"]).success) {
    return undefined;
  }

  const originUrl = gitValue(["remote", "get-url", "origin"]);
  const head = gitValue(["rev-parse", "--verify", "HEAD"]);
  const baseRef = REMOTE_REFS.find(
    (ref) => captureGit(["rev-parse", "--verify", ref]).success,
  );
  const mergeBase = baseRef
    ? gitValue(["merge-base", head ?? "HEAD", baseRef])
    : undefined;
  const candidateTree = gitValue(["write-tree"]);
  if (!originUrl || !head || !baseRef || !mergeBase || !candidateTree) {
    return undefined;
  }

  const result = captureGit([
    "merge-tree",
    "--write-tree",
    "--name-only",
    "--merge-base",
    mergeBase,
    candidateTree,
    baseRef,
  ]);
  // exit 0 = clean merge, 1 = conflicts, anything else = error
  if (result.status !== 1) return undefined;

  const conflicts = parseMergeTreeConflictedPaths(result.stdout);
  if (conflicts.length === 0) return undefined;

  const label = conflicts.length === 1 ? "conflict" : "conflicts";
  return `Heads up - this branch has ${conflicts.length} merge ${label} against ${baseRef} (${originUrl})`;
};
