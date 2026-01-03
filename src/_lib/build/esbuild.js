export function configureEsbuild(eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    await Bun.build({
      entrypoints: ["src/assets/js/_bundle.js"],
      outdir: "_site/assets/js",
      naming: "bundle.js",
      minify: true,
      target: "browser",
    });
  });
}
