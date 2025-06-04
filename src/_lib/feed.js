const { feedPlugin } = require("@11ty/eleventy-plugin-rss");

const createFeedConfiguration = (siteData) => ({
	type: "atom",
	outputPath: "/feed.xml",
	stylesheet: "/assets/pretty-atom-feed.xsl",
	templateData: {},
	collection: {
		name: "news",
		limit: 20,
	},
	metadata: {
		language: "en",
		title: siteData.name,
		subtitle: "",
		base: siteData.url,
		author: {
			name: siteData.name,
		},
	},
});

const configureFeed = (eleventyConfig) => {
	const siteData = require("../_data/site.json");
	const feedConfig = createFeedConfiguration(siteData);
	eleventyConfig.addPlugin(feedPlugin, feedConfig);
	return feedConfig;
};

module.exports = {
	createFeedConfiguration,
	configureFeed,
};
