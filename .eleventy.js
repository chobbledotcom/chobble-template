import { RenderPlugin } from "@11ty/eleventy";
import schemaPlugin from "@quasibit/eleventy-plugin-schema";

// Build tools
import { configureEsbuild } from "#build/esbuild.js";
import { configureScss } from "#build/scss.js";

// Collections
import { configureCategories } from "#collections/categories.js";
import { configureEvents } from "#collections/events.js";
import { configureGuides } from "#collections/guides.js";
import { configureLocations } from "#collections/locations.js";
import { configureMenus } from "#collections/menus.js";
import { configureNavigation } from "#collections/navigation.js";
import { configureProducts } from "#collections/products.js";
import { configureProperties } from "#collections/properties.js";
import { configureReviews } from "#collections/reviews.js";
import { configureSearch } from "#collections/search.js";
import { configureTags } from "#collections/tags.js";
import { configureAreaList } from "#eleventy/area-list.js";
// Eleventy plugins
import { configureCacheBuster } from "#eleventy/cache-buster.js";
import { configureCanonicalUrl } from "#eleventy/canonical-url.js";
import { configureExternalLinks } from "#eleventy/external-links.js";
import { configureFeed } from "#eleventy/feed.js";
import { configureFileUtils } from "#eleventy/file-utils.js";
import { configureICal } from "#eleventy/ical.js";
import { configureJsConfig } from "#eleventy/js-config.js";
import { configureLayoutAliases } from "#eleventy/layout-aliases.js";

import { configureOpeningTimes } from "#eleventy/opening-times.js";
import { configurePdf } from "#eleventy/pdf.js";
import { configureRecurringEvents } from "#eleventy/recurring-events.js";
import { configureResponsiveTables } from "#eleventy/responsive-tables.js";

// Filters
import { configureProductFilters } from "#filters/product-filters.js";
import { configurePropertyFilters } from "#filters/property-filters.js";

// Media
import { configureImages } from "#media/image.js";
import { configureInlineAsset } from "#media/inline-asset.js";
import { configureUnusedImages } from "#media/unused-images.js";

export default async function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/**/*");
  eleventyConfig.setLayoutsDirectory("_layouts");
  eleventyConfig
    .addPassthroughCopy("src/assets")
    .addPassthroughCopy("src/images")
    .addPassthroughCopy("src/news/images")
    .addPassthroughCopy({ "src/assets/favicon/*": "/" });

  eleventyConfig.addPlugin(schemaPlugin);
  eleventyConfig.addPlugin(RenderPlugin);

  // configureLayoutAliases(eleventyConfig);

  configureAreaList(eleventyConfig);
  configureCacheBuster(eleventyConfig);
  configureCanonicalUrl(eleventyConfig);
  configureCategories(eleventyConfig);
  configureLayoutAliases(eleventyConfig);
  await configureExternalLinks(eleventyConfig);
  await configureFeed(eleventyConfig);
  configureFileUtils(eleventyConfig);
  configureGuides(eleventyConfig);
  configureICal(eleventyConfig);
  configureImages(eleventyConfig);
  configurePdf(eleventyConfig);
  configureJsConfig(eleventyConfig);
  configureInlineAsset(eleventyConfig);
  configureLocations(eleventyConfig);
  configureMenus(eleventyConfig);
  await configureNavigation(eleventyConfig);
  configureOpeningTimes(eleventyConfig);
  configureRecurringEvents(eleventyConfig);
  configureResponsiveTables(eleventyConfig);
  configureProductFilters(eleventyConfig);
  configureProducts(eleventyConfig);
  configureProperties(eleventyConfig);
  configureReviews(eleventyConfig);
  configurePropertyFilters(eleventyConfig);
  configureScss(eleventyConfig);
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
