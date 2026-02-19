/** @param {*} eleventyConfig */
export const configureJsBundler = (eleventyConfig) => {
  eleventyConfig.on("eleventy.before", async () => {
    const isDevelopment = process.env.ELEVENTY_RUN_MODE === "serve";

    // Build main site bundle
    await Bun.build({
      entrypoints: ["src/_lib/public/bundle.js"],
      outdir: "_site/assets/js",
      naming: "bundle.js",
      target: "browser",
      sourcemap: "linked",
      minify: !isDevelopment,
      external: ["/pagefind/pagefind.js"],
    });

    // Build design system bundle
    await Bun.build({
      entrypoints: ["src/_lib/public/design-system.js"],
      outdir: "_site/assets/js",
      naming: "design-system.js",
      target: "browser",
      sourcemap: "linked",
      minify: !isDevelopment,
    });

    if (isDevelopment) {
      console.log(
        "✓ JavaScript built with source maps (unminified for easier debugging)",
      );
    } else {
      console.log("✓ JavaScript built and minified with source maps");
    }
  });
};
