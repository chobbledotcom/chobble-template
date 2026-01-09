import { memoize } from "#utils/memoize.js";
import { createElement, getSharedDocument } from "#utils/dom-builder.js";

/**
 * Render opening times as HTML list
 * @param {import("#lib/types").OpeningTime[]} openingTimes
 * @returns {Promise<string>} HTML list or empty string
 */
const renderOpeningTimes = async (openingTimes) => {
  if (!openingTimes || openingTimes.length === 0) {
    return "";
  }

  const doc = await getSharedDocument();
  const ul = await createElement("ul", { class: "opening-times" });

  for (const item of openingTimes) {
    const li = doc.createElement("li");
    const strong = doc.createElement("strong");
    strong.textContent = `${item.day}:`;
    li.appendChild(strong);
    li.appendChild(doc.createTextNode(` ${item.hours}`));
    ul.appendChild(li);
  }

  return ul.outerHTML;
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
