import path from "node:path";
import { validateCssVariables } from "#build/css-variable-validator.js";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";
import getConfig from "#data/config.js";

// Lazy-loaded sass module
let sass = null;

// Files that should be compiled (not just imported as partials)
const COMPILED_BUNDLES = ["bundle.scss", "design-system-bundle.scss"];

const createScssCompiler = (inputContent, inputPath) => {
  const dir = path.dirname(inputPath);
  const isBundle = shouldCompileScss(inputPath);

  return async (_data) => {
    if (isBundle && getConfig().enable_theme_switcher) {
      const compiledThemes = generateThemeSwitcherContent();
      inputContent = `${inputContent}\n\n${compiledThemes}`;
    }

    sass ??= await import("sass");
    const css = sass.compileString(inputContent, {
      loadPaths: [dir],
    }).css;

    if (isBundle) {
      validateCssVariables(css, inputPath);
    }

    return css;
  };
};

const shouldCompileScss = (inputPath) =>
  COMPILED_BUNDLES.some((bundle) => inputPath.endsWith(bundle));

const configureScss = (eleventyConfig) => {
  // Explicitly watch CSS directory to trigger rebuilds when partials change
  eleventyConfig.addWatchTarget("./src/css/");

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    useLayouts: false,
    compile: (inputContent, inputPath) => {
      // Only compile specified bundles, skip all other scss files
      if (!shouldCompileScss(inputPath)) {
        return () => undefined;
      }
      return createScssCompiler(inputContent, inputPath);
    },
  });
};

export { createScssCompiler, configureScss, shouldCompileScss };
