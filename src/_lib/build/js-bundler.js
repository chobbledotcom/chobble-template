const buildBundle = (name, isDevelopment, options = {}) =>
  Bun.build({
    entrypoints: [`src/_lib/public/${name}.js`],
    outdir: "_site/assets/js",
    naming: `${name}.js`,
    target: "browser",
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
      buildBundle("bunny-video", isDevelopment),
      buildBundle("youtube-video", isDevelopment),
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
