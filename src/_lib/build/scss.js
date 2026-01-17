import path from "node:path";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";
import getConfig from "#data/config.js";

// Lazy-loaded sass module
let sass = null;

// Files that should be compiled (not just imported as partials)
const COMPILED_BUNDLES = ["bundle.scss", "design-system-bundle.scss"];

const createScssCompiler = (inputContent, inputPath) => {
  const dir = path.dirname(inputPath);

  return async (_data) => {
    if (inputPath.endsWith("bundle.scss")) {
      // Inject compiled themes only if theme-switcher is enabled
      if (getConfig().enable_theme_switcher) {
        const compiledThemes = generateThemeSwitcherContent();
        inputContent = `${inputContent}\n\n${compiledThemes}`;
      }
    }

    sass ??= await import("sass");
    return sass.compileString(inputContent, {
      loadPaths: [dir],
    }).css;
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
