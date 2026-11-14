import path from "node:path";
import { validateCssVariables } from "#build/css-variable-validator.js";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";
import getConfig from "#data/config.js";

// Lazy-loaded sass module
/** @type {typeof import("sass") | null} */
let sass = null;

// Files that should be compiled (not just imported as partials)
const COMPILED_BUNDLES = ["design-system-bundle.scss"];

/** @param {string} inputPath */
const shouldCompileScss = (inputPath) =>
  COMPILED_BUNDLES.some((bundle) => inputPath.endsWith(bundle));

const SCSS_EXTENSION = {
  outputFileExtension: "css",
  useLayouts: false,
  /**
   * @param {string} inputContent
   * @param {string} inputPath
   * @returns {(data: unknown) => Promise<string> | undefined}
   */
  compile: (inputContent, inputPath) => {
    // Only compile specified bundles, skip all other scss files
    if (!shouldCompileScss(inputPath)) {
      return () => undefined;
    }
    const dir = path.dirname(inputPath);
    return async (_data) => {
      const content = getConfig().enable_theme_switcher
        ? `${inputContent}\n\n${generateThemeSwitcherContent()}`
        : inputContent;

      if (!sass) {
        sass = await import("sass");
      }
      const css = sass.compileString(content, {
        loadPaths: [dir],
      }).css;

      validateCssVariables(css, inputPath);
      return css;
    };
  },
};

/** @param {import("#lib/types").UserConfig} eleventyConfig */
const configureScss = (eleventyConfig) => {
  // Explicitly watch CSS directory to trigger rebuilds when partials change
  eleventyConfig.addWatchTarget("./src/css/");

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", SCSS_EXTENSION);
};

export { configureScss, shouldCompileScss };
