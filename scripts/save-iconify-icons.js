#!/usr/bin/env node

/**
 * Save every Iconify icon a site references into its icon cache.
 *
 * The build fetches a missing icon from the Iconify API the first time a
 * page renders it. Saving the icons ahead of time and committing them means
 * a build never depends on that API being reachable.
 *
 * Usage:
 *   node scripts/save-iconify-icons.js                 Scan src/ for `icon:` values
 *   node scripts/save-iconify-icons.js <dir> ...       Scan other directories instead
 *   node scripts/save-iconify-icons.js mdi:home ...    Also save the named icons
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "tinyglobby";
import getSite from "#data/site.js";
import socialIcons from "#data/social-icons.json" with { type: "json" };
import { ROOT_DIR } from "#lib/paths.js";
import { getIcon, iconFilePath } from "#media/iconify.js";
import { runIfMain } from "#scripts/lib/is-main-module.js";

const ICON_REFERENCE = /\bicon:\s*["']([^"']+)["']/g;
const SKIPPED_DIRS = ["node_modules", "_site", "coverage"];

/** @type {Record<string, string>} Copied so lookups take arbitrary string keys */
const socialIconMap = { ...socialIcons };

/**
 * An Iconify identifier is "prefix:name". Other icon values are image
 * paths or literal text such as an emoji, which need no saving.
 * @param {string} value
 */
const isIconifyId = (value) => value.includes(":") && !value.includes("/");

/**
 * Every content and data file under a directory. Dot-directories are
 * skipped by the glob itself; build output and dependencies by name.
 * @param {string} dir
 * @returns {string[]}
 */
const textFiles = (dir) =>
  globSync("**/*.{md,json,yml,yaml,html,liquid}", {
    cwd: dir,
    absolute: true,
    ignore: SKIPPED_DIRS.map((name) => `**/${name}/**`),
  });

/**
 * The `icon:` values written in a directory's content and data files.
 * @param {string} dir
 * @returns {string[]}
 */
const iconReferences = (dir) =>
  textFiles(dir).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(ICON_REFERENCE)].map((match) =>
      match[1].trim(),
    ),
  );

/**
 * Icons for the social platforms the site links to, if it links to any.
 * @param {Record<string, string>} [socials] - Platform names mapped to URLs
 * @returns {string[]}
 */
const socialIconIds = (socials = {}) =>
  Object.keys(socials)
    .map((platform) => socialIconMap[platform.toLowerCase()])
    .filter(Boolean);

/**
 * Save one icon, reporting whether it was already in the cache.
 * @param {string} baseDir - Site root holding the icon cache
 * @returns {(iconId: string) => Promise<{ iconId: string, cached: boolean }>}
 */
const saveIcon = (baseDir) => async (iconId) => {
  const cached = existsSync(iconFilePath(iconId, baseDir));
  await getIcon(iconId, baseDir);
  return { iconId, cached };
};

/**
 * Save the icons named or referenced by the arguments into baseDir's cache.
 * Arguments containing a colon are icon identifiers; the rest are
 * directories to scan, defaulting to baseDir's src/.
 * @param {string[]} args
 * @param {string} baseDir - Site root holding the icon cache
 * @returns {Promise<{ saved: string[], cached: string[] }>}
 */
export const saveIcons = async (args, baseDir) => {
  const dirs = args.filter((arg) => !isIconifyId(arg));
  const scanDirs = dirs.length > 0 ? dirs : [path.join(baseDir, "src")];
  const iconIds = [
    ...args,
    ...scanDirs.flatMap(iconReferences),
    ...socialIconIds(getSite().socials),
  ].filter(isIconifyId);
  const results = await Promise.all(
    [...new Set(iconIds)].map(saveIcon(baseDir)),
  );
  return {
    saved: results.filter((r) => !r.cached).map((r) => r.iconId),
    cached: results.filter((r) => r.cached).map((r) => r.iconId),
  };
};

/**
 * Command-line entry: save the icons and print what the run did.
 * @param {string[]} [args]
 * @param {string} [baseDir] - Site root holding the icon cache
 */
export const main = async (
  args = process.argv.slice(2),
  baseDir = ROOT_DIR,
) => {
  const result = await saveIcons(args, baseDir);
  const lines = [
    `Already cached: ${result.cached.length} icons`,
    `Saved: ${result.saved.length} icons`,
    ...result.saved.map((iconId) => `  ${iconId}`),
  ];
  console.log(lines.join("\n"));
};

await runIfMain(import.meta.url, main);
