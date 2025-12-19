import * as esbuild from "esbuild";

export function configureEsbuild(eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    await esbuild.build({
      entryPoints: ["src/assets/js/_bundle.js"],
      bundle: true,
      minify: true,
      format: "esm",
      outfile: "_site/assets/js/bundle.js",
      target: ["es2017"],
    });
  });
}
