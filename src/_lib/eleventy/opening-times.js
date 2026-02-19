import { memoize } from "#toolkit/fp/memoize.js";
import {
  createTemplateLoader,
  createTemplateRenderer,
} from "#utils/liquid-render.js";

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
  return renderOpeningTimes(siteData.default.opening_times);
});

/** @param {*} eleventyConfig */
const configureOpeningTimes = (eleventyConfig) => {
  eleventyConfig.addAsyncShortcode("opening_times", getOpeningTimesHtml);
};

export { configureOpeningTimes, getOpeningTimesHtml, renderOpeningTimes };
