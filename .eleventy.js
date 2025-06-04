module.exports = async function (eleventyConfig) {
	const { configureCategories } = require("./src/_lib/categories");
	const { configureFeed } = require("./src/_lib/feed");
	const { configureFileUtils } = require("./src/_lib/file-utils");
	const { configureImages } = require("./src/_lib/image");
	const { configureNavigation } = require("./src/_lib/navigation");
	const { configurePrettier } = require("./src/_lib/prettier");
	const { configureProducts } = require("./src/_lib/products");
	const { configureScss } = require("./src/_lib/scss");
	const { configureTags } = require("./src/_lib/tags");

	eleventyConfig.addWatchTarget("./src/**/*");

	eleventyConfig
		.addPassthroughCopy("src/assets")
		.addPassthroughCopy("src/images")
		.addPassthroughCopy("src/news/images")
		.addPassthroughCopy({ "src/assets/favicon/*": "/" });

	configureCategories(eleventyConfig);
	configureFeed(eleventyConfig);
	configureFileUtils(eleventyConfig);
	configureImages(eleventyConfig);
	configureNavigation(eleventyConfig);
	configurePrettier(eleventyConfig);
	configureProducts(eleventyConfig);
	configureScss(eleventyConfig);
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
