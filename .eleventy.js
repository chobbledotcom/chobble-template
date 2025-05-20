module.exports = async function (eleventyConfig) {
	const fastglob = require("fast-glob");
	const fg = fastglob;
	const fs = require("fs");
	const images = fg.sync(["src/images/*.jpg"]);
	const markdownIt = require("markdown-it");
	const md = new markdownIt({ html: true });
	const nav = require("@11ty/eleventy-navigation");
	const navUtil = require("@11ty/eleventy-navigation/eleventy-navigation");
	const sass = require("sass");
	const path = require("path");
	const prettier = require("prettier");
	const { feedPlugin } = require("@11ty/eleventy-plugin-rss");
	const { transformImages, imageShortcode } = require("./src/_lib/image");

	eleventyConfig.addWatchTarget("./src/**/*");
	eleventyConfig
		.addPassthroughCopy("src/assets")
		.addPassthroughCopy("src/images")
		.addPassthroughCopy({
			"src/assets/favicon/*": "/",
			"src/news/assets/*": "/assets/",
		});

	eleventyConfig.addPlugin(nav);

	const site = require("./src/_data/site.json");
	eleventyConfig.addPlugin(feedPlugin, {
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
			title: site.name,
			subtitle: "",
			base: site.url,
			author: {
				name: site.name,
			},
		},
	});

	eleventyConfig.addAsyncShortcode("image", imageShortcode);

	eleventyConfig.addTransform("processImages", async (content, outputPath) => {
		if (!outputPath || !outputPath.endsWith(".html")) return content;
		return await transformImages(content);
	});

	eleventyConfig.on("eleventy.after", () => {
		if (fs.existsSync(".image-cache/")) {
			fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
		}
	});

	eleventyConfig.addCollection("images", (_) => {
		return images.map((i) => i.split("/")[2]).reverse();
	});

	eleventyConfig.addCollection("categories", (collectionApi) => {
		const categories = collectionApi.getFilteredByTag("category");

		if (!categories || categories.length == 0) return [];

		const categoryImages = {};
		categories.forEach((category) => {
			categoryImages[category.fileSlug] = [category.data.header_image, -1];
		});
		const products = collectionApi.getFilteredByTag("product");

		products.forEach((product) => {
			const order = product.data.order || 0;
			const productCategories = product.data.categories || [];
			const image = product.data.header_image;
			productCategories.forEach((category) => {
				if (
					image &&
					(!categoryImages[category] || categoryImages[category][1] < order)
				)
					categoryImages[category] = [image, order];
			});
		});

		return categories.map((category) => {
			category.data.header_image = categoryImages[category.fileSlug]?.[0];
			return category;
		});
	});

	const addGallery = (item) => {
		const gallery = item.data.gallery;
		if (gallery) {
			item.data.gallery = Object.entries(item.data.gallery).map((image) => {
				let alt = image[0];
				// if the alt is just an integer (ie galleries is an array of
				// filenames and it's the index) then set it to an empty string
				if (parseInt(alt).toString() === alt) alt = "";
				return {
					alt: alt,
					filename: image[1],
				};
			});
		}
		return item;
	};

	eleventyConfig.addCollection("products", (collectionApi) => {
		let products = collectionApi.getFilteredByTag("product");
		return products.map((product) => {
			return addGallery(product);
		});
	});

	eleventyConfig.addFilter("toNavigation", function (collection, activeKey) {
		return navUtil.toHtml.call(eleventyConfig, collection, {
			activeAnchorClass: "active",
			activeKey: activeKey,
		});
	});

	eleventyConfig.addFilter(
		"getProductsByCategory",
		function (products, categorySlug) {
			return products.filter((product) => {
				if (!product.data.categories) return false;
				return product.data.categories.includes(categorySlug);
			});
		},
	);

	eleventyConfig.addFilter(
		"getFeaturedCategories",
		(categories) => categories?.filter((c) => c.data.featured) || [],
	);

	eleventyConfig.addFilter("pageUrl", (collection, tag, slug) => {
		const result = collection.find(
			(item) => item.data.tags?.includes(tag) && item.fileSlug === slug,
		);
		if (!result) throw new Error(`Couldn't find URL for ${tag} / ${slug}`);
		return result.url;
	});

	eleventyConfig.addFilter("tags", (collection) => {
		const allTags = collection
			.filter((page) => page.url && !page.data.no_index)
			.flatMap((page) => page.data.tags || [])
			.filter((tag) => tag && tag.trim() !== "");
		return [...new Set(allTags)].sort();
	});

	eleventyConfig.addFilter("file_exists", (name) => {
		const snippetPath = path.join(process.cwd(), name);
		return fs.existsSync(snippetPath);
	});

	eleventyConfig.addFilter("file_missing", (name) => {
		const snippetPath = path.join(process.cwd(), name);
		return !fs.existsSync(snippetPath);
	});

	eleventyConfig.addShortcode("render_snippet", (name, defaultString = "") => {
		const snippetPath = path.join(process.cwd(), "src/snippets", `${name}.md`);
		if (!fs.existsSync(snippetPath)) return defaultString;
		const content = fs.readFileSync(snippetPath, "utf8");
		return md.render(content);
	});

	eleventyConfig.addTemplateFormats("scss");
	eleventyConfig.addExtension("scss", {
		outputFileExtension: "css",
		compile: function (inputContent, inputPath) {
			// Get the directory of the input file for relative imports
			const dir = path.dirname(inputPath);

			return function (data) {
				return sass.compileString(inputContent, {
					loadPaths: [dir],
				}).css;
			};
		},
	});

	eleventyConfig.addTransform("prettier", function (content, outputPath) {
		const extname = outputPath ? path.extname(outputPath) : ".html";
		if (extname !== ".html") return content;
		const parser = extname.replace(/^./, "");
		try {
			return prettier.format(content, { parser });
		} catch {
			console.log(`Failed to format ${outputPath}`);
			return content;
		}
	});

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
