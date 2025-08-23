import { configureCategories } from "./src/_lib/categories.js";
import { configureFeed } from "./src/_lib/feed.js";
import { configureFileUtils } from "./src/_lib/file-utils.js";
import { configureImages } from "./src/_lib/image.js";
import { configureLayoutAliases } from "./src/_lib/layout-aliases.mjs";
import { configureMenus } from "./src/_lib/menus.js";
import { configureNavigation } from "./src/_lib/navigation.js";
import { configureOpeningTimes } from "./src/_lib/opening-times.js";
import { configurePrettier } from "./src/_lib/prettier.js";
import { configureRecurringEvents } from "./src/_lib/recurring-events.js";
import { configureProducts } from "./src/_lib/products.js";
import { configureScss } from "./src/_lib/scss.js";
import { configureScssFiles } from "./src/_lib/scss-files.js";
import { configureTags } from "./src/_lib/tags.js";
import schemaPlugin from "@quasibit/eleventy-plugin-schema";

export default async function (eleventyConfig) {
	eleventyConfig.addWatchTarget("./src/**/*");

	eleventyConfig
		.addPassthroughCopy("src/assets")
		.addPassthroughCopy("src/images")
		.addPassthroughCopy("src/news/images")
		.addPassthroughCopy({ "src/assets/favicon/*": "/" });

	// Configure schema plugin
	eleventyConfig.addPlugin(schemaPlugin);

	// Configure layout aliases for easier layout references
	configureLayoutAliases(eleventyConfig);

	configureCategories(eleventyConfig);
	await configureFeed(eleventyConfig);
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
}