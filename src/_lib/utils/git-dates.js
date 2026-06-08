import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const cache = new Map();

const pathCandidates = (inputPath) => {
  const rel = inputPath.replace(/^\.\//, "");
  return rel.startsWith("src/") ? [rel, rel.slice(4)] : [rel];
};

const runGit = (repo, args) => {
  try {
    return execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
};

const gitRoot = (repo) => runGit(repo, ["rev-parse", "--show-toplevel"]);

const candidateRepos = () => {
  const repos = [
    process.env.GIT_DATES_REPO,
    process.cwd(),
    resolve(process.cwd(), "..", "source"),
  ].filter(Boolean);

  return [
    ...new Set(
      repos
        .map((repo) => gitRoot(resolve(repo)))
        .filter(Boolean),
    ),
  ];
};

const datesForPath = (repo, rel) => {
  const created = runGit(repo, [
    "log",
    "--follow",
    "--diff-filter=A",
    "--format=%aI",
    "--",
    rel,
  ])
    .split("\n")
    .filter(Boolean)
    .pop();

  const modified = runGit(repo, ["log", "-1", "--format=%aI", "--", rel]);

  if (!created && !modified) return null;

  return {
    published: created ?? modified ?? null,
    updated: modified ?? created ?? null,
  };
};

export const datesFor = (inputPath) => {
  if (!inputPath) return null;

  const cacheKey = inputPath.replace(/^\.\//, "");
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  for (const repo of candidateRepos()) {
    for (const rel of pathCandidates(inputPath)) {
      const result = datesForPath(repo, rel);
      if (result) {
        cache.set(cacheKey, result);
        return result;
      }
    }
  }

  cache.set(cacheKey, null);
  return null;
};

export const formatHuman = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatIso = (iso) => {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
};
