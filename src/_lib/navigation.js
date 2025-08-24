import navUtil from "@11ty/eleventy-navigation/eleventy-navigation.js";

const createNavigationFilter = (eleventyConfig) => (collection, activeKey) =>
	navUtil.toHtml.call(eleventyConfig, collection, {
		activeAnchorClass: "active",
		activeKey: activeKey,
	});

const findPageUrl = (collection, tag, slug) => {
	if (!collection) {
		console.warn(`findPageUrl: No collection provided for ${tag}/${slug}`);
		return '#';
	}
	const result = collection.find(
		(item) => item.data?.tags?.includes(tag) && item.fileSlug === slug,
	);
	if (!result) {
		console.warn(`Couldn't find URL for ${tag}/${slug}`);
		return '#';
	}
	return result.url;
};

const configureNavigation = async (eleventyConfig) => {
	const nav = await import("@11ty/eleventy-navigation");
	eleventyConfig.addPlugin(nav.default);

	eleventyConfig.addFilter(
		"toNavigation",
		createNavigationFilter(eleventyConfig),
	);
	eleventyConfig.addFilter("pageUrl", findPageUrl);
};

export {
	createNavigationFilter,
	findPageUrl,
	configureNavigation,
};
