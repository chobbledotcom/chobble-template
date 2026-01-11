export function configureJsBundler(eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    const isDevelopment = process.env.ELEVENTY_RUN_MODE === "serve";

    /** @type {import('bun').BuildConfig} */
    const buildConfig = {
      entrypoints: ["src/_lib/public/bundle.js"],
      outdir: "_site/assets/js",
      naming: "bundle.js",
      target: "browser",
      // Source maps help with error diagnostics
      sourcemap: "external",
      // Environment-aware minification: dev keeps code readable, prod minifies
      minify: !isDevelopment,
    };

    await Bun.build(buildConfig);

    if (isDevelopment) {
      console.log(
        "✓ JavaScript built with source maps (unminified for easier debugging)",
      );
    } else {
      console.log("✓ JavaScript built and minified with source maps");
    }
  });
}
