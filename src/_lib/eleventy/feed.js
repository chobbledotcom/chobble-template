import {
  absoluteUrl,
  dateToRfc822,
  dateToRfc3339,
  getNewestCollectionItemDate,
} from "@11ty/eleventy-plugin-rss";

/** @param {*} eleventyConfig */
const configureFeed = async (eleventyConfig) => {
  // Load the HTML Base plugin for URL transformations in feeds
  // This provides htmlBaseUrl and transformWithHtmlBase filters
  const pluginHtmlBase = eleventyConfig.resolvePlugin(
    "@11ty/eleventy/html-base-plugin",
  );
  eleventyConfig.addPlugin(pluginHtmlBase);

  // Add RSS date filters as universal filters (works with Liquid)
  eleventyConfig.addFilter("dateToRfc3339", dateToRfc3339);
  eleventyConfig.addFilter("dateToRfc822", dateToRfc822);
  eleventyConfig.addFilter(
    "getNewestCollectionItemDate",
    getNewestCollectionItemDate,
  );
  eleventyConfig.addFilter("absoluteUrl", absoluteUrl);
};

export { configureFeed };
