import * as esbuild from "esbuild";

export function configureEsbuild(eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    await esbuild.build({
      entryPoints: ["src/_js/bundle.js"],
      bundle: true,
      minify: true,
      format: "esm",
      outfile: "_site/assets/js/lib/bundle.js",
      target: ["es2017"],
    });
  });
}
