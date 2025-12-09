import schemaPlugin from "@quasibit/eleventy-plugin-schema";
import fg from "fast-glob";

import { configureCacheBuster } from "./src/_lib/cache-buster.js";
import { configureCategories } from "./src/_lib/categories.js";
import { configureExternalLinks } from "./src/_lib/external-links.js";
import { configureFeed } from "./src/_lib/feed.js";
import { configureFileUtils } from "./src/_lib/file-utils.js";
import { configureICal } from "./src/_lib/ical.mjs";
import { configureImages } from "./src/_lib/image.js";
import { configureLayoutAliases } from "./src/_lib/layout-aliases.mjs";
import { configureMenus } from "./src/_lib/menus.js";
import { configureNavigation } from "./src/_lib/navigation.js";
import { configureOpeningTimes } from "./src/_lib/opening-times.js";
import { configureProducts } from "./src/_lib/products.js";
import { configureRecurringEvents } from "./src/_lib/recurring-events.js";
import { configureScss } from "./src/_lib/scss.js";
import { configureScssFiles } from "./src/_lib/scss-files.js";
import { configureTags } from "./src/_lib/tags.js";
import { configureUnusedImages } from "./src/_lib/unused-images.js";
import { configureEsbuild } from "./src/_lib/esbuild.js";

export default async function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/**/*");
  eleventyConfig.setLayoutsDirectory("_layouts");
  eleventyConfig
    .addPassthroughCopy("src/assets")
    .addPassthroughCopy("src/images")
    .addPassthroughCopy("src/news/images")
    .addPassthroughCopy({ "src/assets/favicon/*": "/" });

  eleventyConfig.addPlugin(schemaPlugin);

  // Limit news posts to 10 when running serve (development mode)
  const isServeMode = process.argv.includes("--serve");

  if (isServeMode) {
    const ignoredPosts = fg
      .sync("./src/news/**/*.md", { stats: true })
      // Sort by descending date (newest first).
      .sort((a, b) => b.stats.birthtimeMs - a.stats.birthtimeMs)
      .splice(10);

    if (ignoredPosts.length > 0) {
      console.log(
        `🗑️  Trimming ${ignoredPosts.length} news posts in serve mode (keeping latest 10)`,
      );
      ignoredPosts.forEach((p) => eleventyConfig.ignores.add(p.path));
    } else {
      console.log("📰 Not trimming news posts - 10 or fewer posts found");
    }
  } else {
    console.log("🏗️  Build mode - including all news posts");
  }

  // configureLayoutAliases(eleventyConfig);

  configureCacheBuster(eleventyConfig);
  configureCategories(eleventyConfig);
  configureLayoutAliases(eleventyConfig);
  await configureExternalLinks(eleventyConfig);
  await configureFeed(eleventyConfig);
  configureFileUtils(eleventyConfig);
  configureICal(eleventyConfig);
  configureImages(eleventyConfig);
  configureMenus(eleventyConfig);
  await configureNavigation(eleventyConfig);
  configureOpeningTimes(eleventyConfig);
  configureRecurringEvents(eleventyConfig);
  configureProducts(eleventyConfig);
  configureScss(eleventyConfig);
  configureScssFiles(eleventyConfig);
  configureTags(eleventyConfig);
  configureUnusedImages(eleventyConfig);
  configureEsbuild(eleventyConfig);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["liquid", "md", "html"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
  };
}
