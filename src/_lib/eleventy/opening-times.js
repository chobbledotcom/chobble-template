import { memoize } from "#utils/memoize.js";

/**
 * Render opening times as HTML list
 * @param {import("#lib/types").OpeningTime[]} openingTimes
 * @returns {string} HTML list or empty string
 */
const renderOpeningTimes = (openingTimes) => {
  if (!openingTimes || openingTimes.length === 0) {
    return "";
  }

  const items = openingTimes
    .map((item) => `  <li><strong>${item.day}:</strong> ${item.hours}</li>`)
    .join("\n");

  return `<ul class="opening-times">\n${items}\n</ul>`;
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

  eleventyConfig.addFilter("format_opening_times", renderOpeningTimes);
};

export { configureOpeningTimes, getOpeningTimesHtml, renderOpeningTimes };
