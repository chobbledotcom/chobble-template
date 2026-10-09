import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { compact } from "#utils/fp/array.js";

/**
 * @param {string} repo
 * @param {string[]} args
 * @returns {string | undefined}
 */
const runGit = (repo, args) => {
  const result = execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5000,
  });
  const trimmed = result.trim();
  return trimmed === "" ? undefined : trimmed;
};

/** @param {string | null | undefined} inputPath */
export const datesFor = (inputPath) => {
  if (!inputPath) return null;

  /** @param {string} path */
  const pathCandidates = (path) => {
    const rel = path.replace(/^\.\//, "");
    return rel.startsWith("src/") ? [rel, rel.slice(4)] : [rel];
  };

  const candidateRepos = () => {
    const repos = compact([
      process.env.GIT_DATES_REPO,
      process.cwd(),
      resolve(process.cwd(), "..", "source"),
    ]).filter((repo) => existsSync(resolve(repo)));

    const roots = compact(
      repos
        .filter((repo) => existsSync(resolve(repo, ".git")))
        .map((repo) => runGit(resolve(repo), ["rev-parse", "--show-toplevel"])),
    );

    return [...new Set(roots)];
  };

  /**
   * @param {string} repo
   * @param {string} rel
   */
  const datesForPath = (repo, rel) => {
    const created = runGit(repo, [
      "log",
      "--follow",
      "--diff-filter=A",
      "--format=%aI",
      "--",
      rel,
    ])
      ?.split("\n")
      .filter(Boolean)
      .pop();

    const modified = runGit(repo, ["log", "-1", "--format=%aI", "--", rel]);

    if (!created && !modified) return null;

    const published = created || modified;
    const updated = modified || created;

    return { published, updated };
  };

  const pairs = candidateRepos().flatMap((repo) =>
    pathCandidates(inputPath).map((rel) => [repo, rel]),
  );

  for (const [repo, rel] of pairs) {
    const result = datesForPath(repo, rel);
    if (result) return result;
  }

  return null;
};

/** @param {string | null | undefined} iso */
export const formatIso = (iso) => {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
};
