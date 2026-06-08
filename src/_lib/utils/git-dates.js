import { execFileSync } from "node:child_process";

const cache = new Map();

const runGit = (args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

export const datesFor = (inputPath) => {
  if (!inputPath) return null;
  const rel = inputPath.replace(/^\.\//, "");
  if (cache.has(rel)) return cache.get(rel);

  const created = runGit([
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

  const modified = runGit(["log", "-1", "--format=%aI", "--", rel]);

  if (!created && !modified) {
    cache.set(rel, null);
    return null;
  }

  const result = {
    published: created || modified || null,
    updated: modified || created || null,
  };
  cache.set(rel, result);
  return result;
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

export const clearCache = () => {
  cache.clear();
};
