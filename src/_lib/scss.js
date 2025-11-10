import sass from "sass";
import path from "path";
import { getScssFiles } from "./scss-files.js";
import { generateThemeSwitcherContent } from "./theme-compiler.js";

const createScssCompiler = (inputContent, inputPath) => {
	const dir = path.dirname(inputPath);

	return (data) => {
		if (inputPath.endsWith("bundle.scss")) {
			// Add dynamic imports for SCSS files
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

			// Inject compiled themes only if theme-switcher is enabled
			if (scssFiles.includes("theme-switcher")) {
				const compiledThemes = generateThemeSwitcherContent();
				inputContent = inputContent + "\n\n" + compiledThemes;
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
		compile: (inputContent, inputPath) => {
			return createScssCompiler(inputContent, inputPath);
		},
	});
};

export { createScssCompiler, compileScss, configureScss };
