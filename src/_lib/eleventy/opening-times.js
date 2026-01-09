import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Liquid } from "liquidjs";
import { SRC_DIR } from "#lib/paths.js";
import { memoize } from "#utils/memoize.js";

const liquid = new Liquid();

const templatePath = join(SRC_DIR, "_includes", "opening-times.html");

const getTemplate = memoize(async () => readFile(templatePath, "utf-8"));

/**
 * Render opening times as HTML list
 * @param {import("#lib/types").OpeningTime[]} openingTimes
 * @returns {Promise<string>} HTML list or empty string
 */
const renderOpeningTimes = async (openingTimes) => {
  if (!openingTimes || openingTimes.length === 0) {
    return "";
  }

  const template = await getTemplate();
  return liquid.parseAndRender(template, { opening_times: openingTimes });
};

const getOpeningTimesHtml = memoize(async () => {
  const siteData = await import("#data/site.json", {
    with: { type: "json" },
  });
  const openingTimes = siteData.default.opening_times ?? [];
  return renderOpeningTimes(openingTimes);
});

const configureOpeningTimes = (eleventyConfig) => {
  eleventyConfig.addShortcode("opening_times", getOpeningTimesHtml);
};

export { configureOpeningTimes, getOpeningTimesHtml, renderOpeningTimes };
