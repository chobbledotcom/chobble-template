import prettier from "prettier";

function createPrettierTransform(options = {}) {
	return async function prettierTransform(content, outputPath) {
		if (outputPath && !outputPath.endsWith(".html")) {
			return content;
		}

		// Skip prettier for feeds - they don't need HTML formatting
		if (outputPath && outputPath.includes("/feed.")) {
			return content;
		}

		return await prettier.format(content, {
			parser: "html",
			...options,
		});
	};
}

function configurePrettier(eleventyConfig, options = {}) {
	eleventyConfig.addTransform("prettier", createPrettierTransform(options));
}

export { createPrettierTransform, configurePrettier };
