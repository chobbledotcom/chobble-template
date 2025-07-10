const sass = require("sass");
const path = require("path");
const { getScssFiles } = require("./scss-files");

const createScssCompiler = (inputContent, inputPath) => {
	const dir = path.dirname(inputPath);

	return function (data) {
		if (inputPath.endsWith("bundle.scss")) {
			const scssFiles = getScssFiles();
			const dynamicImports = scssFiles
				.filter((file) => !inputContent.includes(`@use "${file}";`))
				.map((file) => `@use "${file}";`)
				.join("\n");
			if (dynamicImports) {
				inputContent = inputContent.replace(
					'@use "theme";',
					`${dynamicImports}\n@use "theme";`,
				);
			}
		}

		return sass.compileString(inputContent, {
			loadPaths: [dir],
		}).css;
	};
};

const compileScss = (inputContent, inputPath) => {
	const compiler = createScssCompiler(inputContent, inputPath);
	return compiler({});
};

const configureScss = (eleventyConfig) => {
	eleventyConfig.addTemplateFormats("scss");
	eleventyConfig.addExtension("scss", {
		outputFileExtension: "css",
		useLayouts: false,
		compile: function (inputContent, inputPath) {
			return createScssCompiler(inputContent, inputPath);
		},
	});
};

module.exports = {
	createScssCompiler,
	compileScss,
	configureScss,
};
