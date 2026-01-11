export function configureEsbuild(eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    const isDevelopment = process.env.ELEVENTY_RUN_MODE === "serve";

    // Build main site bundle
    await Bun.build({
      entrypoints: ["src/_lib/public/bundle.js"],
      outdir: "_site/assets/js",
      naming: "bundle.js",
      target: "browser",
      sourcemap: "external",
      minify: !isDevelopment,
    });

    // Build landing page bundle
    await Bun.build({
      entrypoints: ["src/_lib/public/landing-bundle.js"],
      outdir: "_site/assets/js",
      naming: "landing-bundle.js",
      target: "browser",
      sourcemap: "external",
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
}
