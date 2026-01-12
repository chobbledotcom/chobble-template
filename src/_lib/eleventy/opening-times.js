import {
  createTemplateLoader,
  createTemplateRenderer,
} from "#utils/liquid-render.js";
import { memoize } from "#utils/memoize.js";

const getTemplate = createTemplateLoader("opening-times.html");

/**
 * Render opening times as HTML list
 * @param {import("#lib/types").OpeningTime[]} openingTimes
 * @returns {Promise<string>} HTML list or empty string
 */
const renderOpeningTimes = createTemplateRenderer(getTemplate, "opening_times");

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
