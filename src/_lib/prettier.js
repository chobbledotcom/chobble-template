const prettier = require("prettier");
const path = require("path");

const createPrettierTransform = (options = {}) => {
	return function prettierTransform(content, outputPath) {
		const extname = outputPath ? path.extname(outputPath) : ".html";
		if (extname !== ".html") return content;

		const parser = extname.replace(/^\./, "");
		try {
			const result = prettier.format(content, { parser, ...options });
			// If prettier returns a Promise (v3+), return original content
			// since Eleventy transforms must be synchronous
			if (result && typeof result.then === "function") {
				return content;
			}
			return result;
		} catch {
			console.log(`Failed to format ${outputPath}`);
			return content;
		}
	};
};

const configurePrettier = (eleventyConfig, options = {}) => {
	eleventyConfig.addTransform("prettier", createPrettierTransform(options));
};

module.exports = {
	createPrettierTransform,
	configurePrettier,
};
