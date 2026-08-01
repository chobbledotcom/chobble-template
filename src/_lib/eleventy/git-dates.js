import { log } from "#utils/console.js";
import {
  createGitDateLookup,
  formatHuman,
  formatIso,
} from "#utils/git-dates.js";

/** @param {*} eleventyConfig */
export const configureGitDates = (eleventyConfig) => {
  let lookup = null;
  const getLookup = () => (lookup ||= createGitDateLookup());

  eleventyConfig.on("eleventy.before", () => {
    lookup = createGitDateLookup();
    const { durationMs, paths, repositories } = lookup.stats;
    log(
      `Git date index: ${(durationMs / 1000).toFixed(2)}s wall, ` +
        `${paths.toLocaleString("en-GB")} paths across ${repositories} ` +
        `${repositories === 1 ? "repository" : "repositories"}`,
    );
  });
  eleventyConfig.addFilter(
    "gitDates",
    /** @param {string | null | undefined} inputPath */ (inputPath) =>
      getLookup().datesFor(inputPath),
  );
  eleventyConfig.addFilter(
    "gitUpdated",
    /** @param {string | null | undefined} inputPath */ (inputPath) =>
      getLookup().updatedFor(inputPath),
  );
  eleventyConfig.addFilter("humanDate", formatHuman);
  eleventyConfig.addFilter("isoDate", formatIso);
};
