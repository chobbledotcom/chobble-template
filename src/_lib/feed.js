import { feedPlugin } from "@11ty/eleventy-plugin-rss";

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

const configureFeed = async (eleventyConfig) => {
	const siteData = await import("../_data/site.json", { with: { type: "json" } });
	const feedConfig = createFeedConfiguration(siteData.default);
	eleventyConfig.addPlugin(feedPlugin, feedConfig);
	return feedConfig;
};

export {
	createFeedConfiguration,
	configureFeed,
};
