/**
 * Socials loader
 *
 * Loads external social-media posts from JSON files in a directory under `src/`.
 * Items don't render as standalone pages — the `url` field links straight out
 * to the source platform when rendered via the socials block.
 *
 * The directory is supplied per-block by the `socials` block template, so one
 * site can render posts from multiple sources (instagram, mastodon, etc.).
 *
 * @module #collections/socials
 */

import fs from "node:fs";
import { isAbsolute, join } from "node:path";
import { SRC_DIR } from "#lib/paths.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { sortByDateDescending } from "#utils/sorting.js";

const loadSocialsFromDirectory = memoize((directory) => {
  const dir = isAbsolute(directory) ? directory : join(SRC_DIR, directory);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((filename) => {
      const raw = JSON.parse(fs.readFileSync(join(dir, filename), "utf8"));
      return {
        url: raw.url,
        date: new Date(raw.date),
        fileSlug: filename.replace(/\.json$/, ""),
        data: { ...raw, tags: ["socials"] },
      };
    })
    .sort(sortByDateDescending);
});

const configureSocials = (eleventyConfig) => {
  eleventyConfig.addFilter("loadSocials", loadSocialsFromDirectory);
};

export { configureSocials, loadSocialsFromDirectory };
