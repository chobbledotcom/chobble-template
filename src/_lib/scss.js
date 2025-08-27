import sass from "sass";
import path from "path";
import { getScssFiles } from "./scss-files.js";
import { generateThemeSwitcherContent } from "./theme-compiler.js";

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
		
		// Handle theme-switcher-compiled.scss
		if (inputPath.endsWith("theme-switcher-compiled.scss")) {
			inputContent = generateThemeSwitcherContent();
		}
		
		// Handle theme-switcher.scss - inject compiled themes
		if (inputPath.endsWith("theme-switcher.scss")) {
			const compiledThemes = generateThemeSwitcherContent();
			// Replace the @use statement with the actual compiled content
			inputContent = inputContent.replace(
				"@use 'theme-switcher-compiled';",
				compiledThemes
			);
		}
		
		// Also handle when theme-switcher is imported/used in bundle.scss
		if (inputPath.endsWith("bundle.scss") && inputContent.includes('@use "theme-switcher"')) {
			// We need to append the compiled themes after processing
			const compiledThemes = generateThemeSwitcherContent();
			inputContent = inputContent + "\n\n" + compiledThemes;
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

export {
	createScssCompiler,
	compileScss,
	configureScss,
};
