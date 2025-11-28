import navUtil from "@11ty/eleventy-navigation/eleventy-navigation.js";

const createNavigationFilter = (eleventyConfig) => (collection, activeKey) =>
	navUtil.toHtml.call(eleventyConfig, collection, {
		activeAnchorClass: "active",
		activeKey: activeKey,
	});

const findPageUrl = (collection, tag, slug) => {
	if (!collection) {
		console.warn(`findPageUrl: No collection provided for ${tag}/${slug}`);
		return "#";
	}
	const result = collection.find(
		(item) => item.data?.tags?.includes(tag) && item.fileSlug === slug,
	);
	if (!result) {
		console.warn(`Couldn't find URL for ${tag}/${slug}`);
		return "#";
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

	// Add custom collection for navigation links sorted by order, then by title
	eleventyConfig.addCollection("navigationLinks", (collectionApi) => {
		return collectionApi
			.getAll()
			.filter((item) => item.data.eleventyNavigation)
			.sort((a, b) => {
				const orderA = a.data.eleventyNavigation.order || 999;
				const orderB = b.data.eleventyNavigation.order || 999;

				// First sort by order
				if (orderA !== orderB) {
					return orderA - orderB;
				}

				// Then sort by title (key)
				const titleA = a.data.eleventyNavigation.key || a.data.title || "";
				const titleB = b.data.eleventyNavigation.key || b.data.title || "";
				return titleA.localeCompare(titleB);
			});
	});
};

export { createNavigationFilter, findPageUrl, configureNavigation };
