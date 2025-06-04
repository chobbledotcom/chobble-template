const navUtil = require("@11ty/eleventy-navigation/eleventy-navigation");

const createNavigationFilter = (eleventyConfig) => (collection, activeKey) =>
	navUtil.toHtml.call(eleventyConfig, collection, {
		activeAnchorClass: "active",
		activeKey: activeKey,
	});

const findPageUrl = (collection, tag, slug) => {
	const result = collection.find(
		(item) => item.data?.tags?.includes(tag) && item.fileSlug === slug,
	);
	if (!result) throw new Error(`Couldn't find URL for ${tag} / ${slug}`);
	return result.url;
};

const configureNavigation = (eleventyConfig) => {
	const nav = require("@11ty/eleventy-navigation");
	eleventyConfig.addPlugin(nav);

	eleventyConfig.addFilter(
		"toNavigation",
		createNavigationFilter(eleventyConfig),
	);
	eleventyConfig.addFilter("pageUrl", findPageUrl);
};

module.exports = {
	createNavigationFilter,
	findPageUrl,
	configureNavigation,
};
