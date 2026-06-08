import { datesFor, formatHuman, formatIso } from "#utils/git-dates.js";

/** @param {*} eleventyConfig */
export const configureGitDates = (eleventyConfig) => {
  eleventyConfig.addFilter("gitDates", datesFor);
  eleventyConfig.addFilter("humanDate", formatHuman);
  eleventyConfig.addFilter("isoDate", formatIso);
};
