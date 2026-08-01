import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** @typedef {{ countFiles: (directory: string) => number, linkTree: (source: string, destination: string) => boolean, resetDestination: (destination: string) => void }} CacheOutputHelpers */
/** @typedef {{ source?: string, destination?: string, useHardLinks?: boolean, linkTree?: (source: string, destination: string) => boolean }} ImageCacheOutputOptions */
/** @typedef {{ copied: number, durationMs: number, linked: number, total: number }} ImageCacheOutputResult */

/** @type {CacheOutputHelpers} */
const cacheOutput = Object.freeze({
  countFiles(directory) {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .reduce((total, entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return total + cacheOutput.countFiles(entryPath);
        }
        return entry.isFile() ? total + 1 : total;
      }, 0);
  },

  linkTree(source, destination) {
    const sourceContents = `${source}${path.sep}.`;
    return (
      spawnSync("cp", ["-al", sourceContents, destination], {
        stdio: "ignore",
      }).status === 0
    );
  },

  resetDestination(destination) {
    fs.rmSync(destination, { recursive: true, force: true });
  },
});

/**
 * @param {ImageCacheOutputOptions} [options]
 * @returns {ImageCacheOutputResult}
 */
export const materializeImageCache = ({
  source = ".image-cache",
  destination = "_site/img",
  useHardLinks = process.env.GITHUB_ACTIONS === "true",
  linkTree = cacheOutput.linkTree,
} = {}) => {
  const startedAt = performance.now();
  const total = cacheOutput.countFiles(source);
  cacheOutput.resetDestination(destination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  const linked = Boolean(useHardLinks && linkTree(source, destination));
  if (!linked) {
    cacheOutput.resetDestination(destination);
    fs.cpSync(source, destination, { recursive: true });
  }

  return {
    copied: linked ? 0 : total,
    durationMs: performance.now() - startedAt,
    linked: linked ? total : 0,
    total,
  };
};
