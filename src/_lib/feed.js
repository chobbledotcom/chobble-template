import {
	dateToRfc3339,
	dateToRfc822,
	getNewestCollectionItemDate,
	absoluteUrl,
} from "@11ty/eleventy-plugin-rss";

const configureFeed = async (eleventyConfig) => {
	// Add RSS date filters as universal filters (works with Liquid)
	eleventyConfig.addFilter("dateToRfc3339", dateToRfc3339);
	eleventyConfig.addFilter("dateToRfc822", dateToRfc822);
	eleventyConfig.addFilter("getNewestCollectionItemDate", getNewestCollectionItemDate);
	eleventyConfig.addFilter("absoluteUrl", absoluteUrl);
};

export {
	configureFeed,
};
