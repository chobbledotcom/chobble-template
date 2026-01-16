import { RenderPlugin } from "@11ty/eleventy";
import schemaPlugin from "@quasibit/eleventy-plugin-schema";

// Build tools
import { configureJsBundler } from "#build/js-bundler.js";
import { configureScss } from "#build/scss.js";

// Collections
import { configureCategories } from "#collections/categories.js";
import { configureEvents } from "#collections/events.js";
import { configureGuides } from "#collections/guides.js";
import { configureLandingPages } from "#collections/landing-pages.js";
import { configureLocations } from "#collections/locations.js";
import { configureNews } from "#collections/news.js";
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
import { configureCapture } from "#eleventy/capture.js";
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
import { configureScreenshots } from "#eleventy/screenshots.js";
import { configureStyleBundle } from "#eleventy/style-bundle.js";

// Filters
import { configureFilters } from "#filters/configure-filters.js";

// Media
import { configureIconify } from "#media/iconify.js";
import { configureImages } from "#media/image.js";
import { configureInlineAsset } from "#media/inline-asset.js";
import { configureThumbnailPlaceholder } from "#media/thumbnail-placeholder.js";
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
  configureCapture(eleventyConfig);
  configureCategories(eleventyConfig);
  configureLayoutAliases(eleventyConfig);
  await configureExternalLinks(eleventyConfig);
  await configureFeed(eleventyConfig);
  configureFileUtils(eleventyConfig);
  configureGuides(eleventyConfig);
  configureICal(eleventyConfig);
  configureLandingPages(eleventyConfig);
  await configureImages(eleventyConfig);
  configurePdf(eleventyConfig);
  configureJsConfig(eleventyConfig);
  configureIconify(eleventyConfig);
  configureInlineAsset(eleventyConfig);
  configureLocations(eleventyConfig);
  configureMenus(eleventyConfig);
  await configureNavigation(eleventyConfig);
  configureNews(eleventyConfig);
  configureOpeningTimes(eleventyConfig);
  configureRecurringEvents(eleventyConfig);
  configureResponsiveTables(eleventyConfig);
  configureScreenshots(eleventyConfig);
  configureFilters(eleventyConfig);
  configureProducts(eleventyConfig);
  configureProperties(eleventyConfig);
  configureReviews(eleventyConfig);
  configureScss(eleventyConfig);
  configureSearch(eleventyConfig);
  configureStyleBundle(eleventyConfig);
  configureTags(eleventyConfig);
  configureThumbnailPlaceholder(eleventyConfig);
  configureUnusedImages(eleventyConfig);
  configureEvents(eleventyConfig);
  configureJsBundler(eleventyConfig);

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
