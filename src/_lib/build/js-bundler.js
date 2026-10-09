import { build } from "esbuild";

/**
 * @param {string} name
 * @param {boolean} isDevelopment
 * @param {import("esbuild").BuildOptions} [options]
 */
const buildBundle = (name, isDevelopment, options = {}) =>
  build({
    entryPoints: [`src/_lib/public/${name}.js`],
    outfile: `_site/assets/js/${name}.js`,
    bundle: true,
    format: "esm",
    platform: "browser",
    sourcemap: "linked",
    minify: !isDevelopment,
    ...options,
  });

/** @param {*} eleventyConfig */
export const configureJsBundler = (eleventyConfig) => {
  eleventyConfig.on("eleventy.before", async () => {
    const isDevelopment = process.env.ELEVENTY_RUN_MODE === "serve";

    await Promise.all([
      buildBundle("bundle", isDevelopment, {
        external: ["/pagefind/pagefind.js"],
      }),
      buildBundle("design-system", isDevelopment),
      buildBundle("masonry", isDevelopment),
    ]);

    if (isDevelopment) {
      console.log(
        "✓ JavaScript built with source maps (unminified for easier debugging)",
      );
    } else {
      console.log("✓ JavaScript built and minified with source maps");
    }
  });
};
