module.exports = async function (eleventyConfig) {
	const { configureCategories } = require("./src/_lib/categories");
	const { configureFeed } = require("./src/_lib/feed");
	const { configureFileUtils } = require("./src/_lib/file-utils");
	const { configureImages } = require("./src/_lib/image");
	const { configureMenus } = require("./src/_lib/menus");
	const { configureNavigation } = require("./src/_lib/navigation");
	const { configureOpeningTimes } = require("./src/_lib/opening-times");
	const { configurePrettier } = require("./src/_lib/prettier");
	const { configureRecurringEvents } = require("./src/_lib/recurring-events");
	const { configureProducts } = require("./src/_lib/products");
	const { configureScss } = require("./src/_lib/scss");
	const { configureScssFiles } = require("./src/_lib/scss-files");
	const { configureTags } = require("./src/_lib/tags");
	const schemaPlugin = require("@quasibit/eleventy-plugin-schema");

	eleventyConfig.addWatchTarget("./src/**/*");

	eleventyConfig
		.addPassthroughCopy("src/assets")
		.addPassthroughCopy("src/images")
		.addPassthroughCopy("src/news/images")
		.addPassthroughCopy({ "src/assets/favicon/*": "/" });

	// Configure schema plugin
	eleventyConfig.addPlugin(schemaPlugin);

	configureCategories(eleventyConfig);
	configureFeed(eleventyConfig);
	configureFileUtils(eleventyConfig);
	configureImages(eleventyConfig);
	configureMenus(eleventyConfig);
	configureNavigation(eleventyConfig);
	configureOpeningTimes(eleventyConfig);
	configurePrettier(eleventyConfig);
	configureRecurringEvents(eleventyConfig);
	configureProducts(eleventyConfig);
	configureScss(eleventyConfig);
	configureScssFiles(eleventyConfig);
	configureTags(eleventyConfig);

	return {
		dir: {
			input: "src",
			output: "_site",
			includes: "_includes",
			layouts: "_layouts",
			data: "_data",
		},
		templateFormats: ["liquid", "md", "njk", "html"],
		htmlTemplateEngine: "liquid",
		markdownTemplateEngine: "liquid",
	};
};
