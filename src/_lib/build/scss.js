import path from "node:path";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";
import config from "#data/config.json" with { type: "json" };

// Lazy-load sass only when actually compiling SCSS
let sass = null;
const getSass = async () => {
  if (!sass) sass = await import("sass");
  return sass;
};

const createScssCompiler = (inputContent, inputPath) => {
  const dir = path.dirname(inputPath);

  return async (_data) => {
    if (inputPath.endsWith("bundle.scss")) {
      // Inject compiled themes only if theme-switcher is enabled
      if (config.enable_theme_switcher) {
        const compiledThemes = generateThemeSwitcherContent();
        inputContent = `${inputContent}\n\n${compiledThemes}`;
      }
    }

    const sassModule = await getSass();
    return sassModule.compileString(inputContent, {
      loadPaths: [dir],
    }).css;
  };
};

const compileScss = async (inputContent, inputPath) => {
  const compiler = createScssCompiler(inputContent, inputPath);
  return await compiler({});
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
