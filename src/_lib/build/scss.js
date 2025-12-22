import path from "path";
import sass from "sass";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";
import config from "#data/config.json" with { type: "json" };

const createScssCompiler = (inputContent, inputPath) => {
  const dir = path.dirname(inputPath);

  return (data) => {
    if (inputPath.endsWith("bundle.scss")) {
      // Inject compiled themes only if theme-switcher is enabled
      if (config.enable_theme_switcher) {
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
      // Only compile bundle.scss, skip all other scss files
      if (!inputPath.endsWith("bundle.scss")) {
        return () => undefined;
      }
      return createScssCompiler(inputContent, inputPath);
    },
  });
};

export { createScssCompiler, compileScss, configureScss };
