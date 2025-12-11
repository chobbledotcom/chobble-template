import schemaPlugin from "@quasibit/eleventy-plugin-schema";

import { configureCacheBuster } from "./src/_lib/cache-buster.js";
import { configureCategories } from "./src/_lib/categories.js";
import { configureEsbuild } from "./src/_lib/esbuild.js";
import { configureEvents } from "./src/_lib/events.js";
import { configureExternalLinks } from "./src/_lib/external-links.js";
import { configureFeed } from "./src/_lib/feed.js";
import { configureFileUtils } from "./src/_lib/file-utils.js";
import { configureICal } from "./src/_lib/ical.js";
import { configureImages } from "./src/_lib/image.js";
import { configureInlineAsset } from "./src/_lib/inline-asset.js";
import { configureLayoutAliases } from "./src/_lib/layout-aliases.js";
import { configureLimitCollections } from "./src/_lib/limit-collections.js";
import { configureMenus } from "./src/_lib/menus.js";
import { configureNavigation } from "./src/_lib/navigation.js";
import { configureOpeningTimes } from "./src/_lib/opening-times.js";
import { configureProducts } from "./src/_lib/products.js";
import { configureRecurringEvents } from "./src/_lib/recurring-events.js";
import { configureScss } from "./src/_lib/scss.js";
import { configureScssFiles } from "./src/_lib/scss-files.js";
import { configureSearch } from "./src/_lib/search.js";
import { configureTags } from "./src/_lib/tags.js";
import { configureUnusedImages } from "./src/_lib/unused-images.js";

export default async function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/**/*");
  eleventyConfig.setLayoutsDirectory("_layouts");
  eleventyConfig
    .addPassthroughCopy("src/assets")
    .addPassthroughCopy("src/images")
    .addPassthroughCopy("src/news/images")
    .addPassthroughCopy({ "src/assets/favicon/*": "/" });

  eleventyConfig.addPlugin(schemaPlugin);

  configureLimitCollections(eleventyConfig);

  // configureLayoutAliases(eleventyConfig);

  configureCacheBuster(eleventyConfig);
  configureCategories(eleventyConfig);
  configureLayoutAliases(eleventyConfig);
  await configureExternalLinks(eleventyConfig);
  await configureFeed(eleventyConfig);
  configureFileUtils(eleventyConfig);
  configureICal(eleventyConfig);
  configureImages(eleventyConfig);
  configureInlineAsset(eleventyConfig);
  configureMenus(eleventyConfig);
  await configureNavigation(eleventyConfig);
  configureOpeningTimes(eleventyConfig);
  configureRecurringEvents(eleventyConfig);
  configureProducts(eleventyConfig);
  configureScss(eleventyConfig);
  configureScssFiles(eleventyConfig);
  configureSearch(eleventyConfig);
  configureTags(eleventyConfig);
  configureUnusedImages(eleventyConfig);
  configureEvents(eleventyConfig);
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
