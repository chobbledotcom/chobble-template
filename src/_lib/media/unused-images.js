import fs from "node:fs";
import path from "node:path";
import { globSync } from "tinyglobby";
import { log } from "#utils/console.js";
import { filter, map, notMemberOf, pipe, pluralize } from "#utils/fp/array.js";

const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

/**
 * Matches an image reference in raw source text: a path under images/, or a
 * bare filename with an image extension. Stops at whitespace, closing
 * parentheses, and quotes so Markdown links and quoted HTML attributes yield
 * the filename they name. References live in YAML frontmatter (block fields,
 * thumbnails), Markdown bodies, and template attributes alike.
 */
const IMAGE_REF_PATTERN =
  /\/?images\/[^\s)'"]+|[^\s/'"(]+\.(?:jpg|jpeg|png|gif|webp|svg)/gi;

/**
 * Source files that author image references: content files, templates and
 * includes, and the site data carrying the logo. Other data files
 * (alt-tags.json) describe images without using them and stay out of scope.
 */
const SOURCE_FILE_PATTERN = "**/*.{md,html,liquid}";
const SITE_DATA_FILE = "_data/site.json";

// Extract used images from a source file's raw text (exported for testing)
/**
 * @param {string} inputDir
 * @param {string[]} imageFiles
 * @param {string} file
 */
export const extractUsedImages = (inputDir, imageFiles, file) => {
  const raw = fs.readFileSync(path.join(inputDir, file), "utf8");

  const referencedImages = Array.from(
    raw.matchAll(IMAGE_REF_PATTERN),
    (match) => match[0],
  );

  return pipe(
    map((reference) => reference.split("/").pop()),
    filter((name) => imageFiles.includes(name)),
  )(referencedImages);
};

// Report unused images to console (exported for reuse)
/** @param {string[]} unusedImages */
export const reportUnusedImages = (unusedImages) => {
  if (unusedImages.length === 0) {
    log("\n✅ All images in /src/images/ are being used!");
    return;
  }

  log("\n📸 Unused Images Report:");
  log("========================");
  for (const image of unusedImages) {
    log(`❌ ${image}`);
  }
  const formatUnused = pluralize("unused image");
  log(`\nFound ${formatUnused(unusedImages.length)} in /src/images/`);
};

/** @param {import("#lib/types").UserConfig} eleventyConfig */
export const configureUnusedImages = (eleventyConfig) => {
  eleventyConfig.on(
    "eleventy.after",
    /** @param {{ dir: { input: string } }} event */
    async ({ dir }) => {
      const imagesDir = path.join(dir.input, "images");

      if (!fs.existsSync(imagesDir)) {
        log("No images directory found.");
        return;
      }

      const imageFiles = fs
        .readdirSync(imagesDir)
        .filter((file) => IMAGE_PATTERN.test(file));

      if (imageFiles.length === 0) {
        log("No images found in /src/images/");
        return;
      }

      const hasSiteData = fs.existsSync(path.join(dir.input, SITE_DATA_FILE));
      const sourceFiles = [
        ...globSync(SOURCE_FILE_PATTERN, { cwd: dir.input }),
        ...(hasSiteData ? [SITE_DATA_FILE] : []),
      ];
      const usedImages = sourceFiles.flatMap((file) =>
        extractUsedImages(dir.input, imageFiles, file),
      );

      reportUnusedImages(imageFiles.filter(notMemberOf(usedImages)));
    },
  );
};
