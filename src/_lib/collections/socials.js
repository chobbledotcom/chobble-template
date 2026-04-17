/**
 * Socials collection
 *
 * Loads external social-media posts (Instagram, etc.) from JSON files under
 * `src/instagram-posts/` and exposes them as a synthetic Eleventy collection.
 * Items don't render as standalone pages — the `external_url` field links
 * straight out to the source platform when rendered via the items block.
 *
 * @module #collections/socials
 */

import fs from "node:fs";
import { join } from "node:path";
import { SRC_DIR } from "#lib/paths.js";
import { sortByDateDescending } from "#utils/sorting.js";

const SOCIALS_DIR = join(SRC_DIR, "instagram-posts");

const createSocialsCollection = () => {
  if (!fs.existsSync(SOCIALS_DIR)) return [];
  return fs
    .readdirSync(SOCIALS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((filename) => {
      const raw = JSON.parse(
        fs.readFileSync(join(SOCIALS_DIR, filename), "utf8"),
      );
      return {
        url: raw.external_url,
        date: new Date(raw.date),
        fileSlug: filename.replace(/\.json$/, ""),
        data: {
          ...raw,
          tags: ["socials"],
        },
      };
    })
    .sort(sortByDateDescending);
};

const configureSocials = (eleventyConfig) => {
  eleventyConfig.addCollection("socials", createSocialsCollection);
};

export { configureSocials, createSocialsCollection };
