import { RenderPlugin } from "@11ty/eleventy";
import schemaPlugin from "@quasibit/eleventy-plugin-schema";

// Build tools
import { configureJsBundler } from "#build/js-bundler.js";
import { configureScss } from "#build/scss.js";

// Collections
import { configureCollectionUtils } from "#utils/collection-utils.js";
import { configureCategories } from "#collections/categories.js";
import { configureEvents } from "#collections/events.js";
import { configureGuides } from "#collections/guides.js";
import { configureLocations } from "#collections/locations.js";
import { configureNews } from "#collections/news.js";
import { configureMenus } from "#collections/menus.js";
import { configureNavigation } from "#collections/navigation.js";
import { configureProducts } from "#collections/products.js";
import { configureProperties } from "#collections/properties.js";
import { configureReviews } from "#collections/reviews.js";
import { configureTags } from "#collections/tags.js";
import { configureAreaList } from "#eleventy/area-list.js";
import { configureBreadcrumbs } from "#eleventy/breadcrumbs.js";
import { configureCollectionLookup } from "#eleventy/collection-lookup.js";
import { configureItemFilterData } from "#eleventy/item-filter-data.js";
// Validation
import { configureCollectionValidation } from "#eleventy/validate-collections.js";
// Eleventy plugins
import { configureCacheBuster } from "#eleventy/cache-buster.js";
import { configureCachedBlock } from "#eleventy/cached-block.js";
import { configureCanonicalUrl } from "#eleventy/canonical-url.js";
import { configureCapture } from "#eleventy/capture.js";
import { configureFeed } from "#eleventy/feed.js";
import { configureFileUtils } from "#eleventy/file-utils.js";
import { configureFormatPrice } from "#eleventy/format-price.js";
import { configureHtmlTransform } from "#eleventy/html-transform.js";
import { configureICal } from "#eleventy/ical.js";
import { configureJsConfig } from "#eleventy/js-config.js";
import { configureLayoutAliases } from "#eleventy/layout-aliases.js";
import { configureLinkList } from "#eleventy/link-list.js";

import { configureOpeningTimes } from "#eleventy/opening-times.js";
import { configurePdf } from "#eleventy/pdf.js";
import { configureRecurringEvents } from "#eleventy/recurring-events.js";
import { configureScreenshots } from "#eleventy/screenshots.js";
import { configureStyleBundle } from "#eleventy/style-bundle.js";
import { configureVideo } from "#eleventy/video.js";

// Filters
import { configureFilters } from "#filters/configure-filters.js";
import { prefetchSpecIcons } from "#filters/spec-filters.js";

// Media
import { configureIconify } from "#media/iconify.js";
import { configureImages, processAndWrapImage } from "#media/image.js";
import { configureInlineAsset } from "#media/inline-asset.js";
import { configureThumbnailPlaceholder } from "#media/thumbnail-placeholder.js";
import { configureUnusedImages } from "#media/unused-images.js";

export default async function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/**/*");
  eleventyConfig.setLayoutsDirectory("_layouts");
  eleventyConfig.setLiquidOptions({
    cache: true,
  });
  eleventyConfig
    .addPassthroughCopy("src/assets")
    .addPassthroughCopy("src/images")
    .addPassthroughCopy({ "src/assets/favicon/*": "/" });

  // Static analysis: validates template collection references before build
  configureCollectionValidation(eleventyConfig);

  eleventyConfig.addPlugin(schemaPlugin);
  eleventyConfig.addPlugin(RenderPlugin);

  // cachedBlock tag for memoizing expensive template fragments
  configureCachedBlock(eleventyConfig);

  // configureLayoutAliases(eleventyConfig);

  configureAreaList(eleventyConfig);
  configureBreadcrumbs(eleventyConfig);
  configureCacheBuster(eleventyConfig);
  configureCollectionLookup(eleventyConfig);
  configureCollectionUtils(eleventyConfig);
  configureCanonicalUrl(eleventyConfig);
  configureCapture(eleventyConfig);
  configureCategories(eleventyConfig);
  configureEvents(eleventyConfig);
  configureLayoutAliases(eleventyConfig);
  await configureFeed(eleventyConfig);
  configureFileUtils(eleventyConfig);
  configureFormatPrice(eleventyConfig);
  configureGuides(eleventyConfig);
  configureHtmlTransform(eleventyConfig, processAndWrapImage);
  configureICal(eleventyConfig);
  configureLinkList(eleventyConfig);
  await configureImages(eleventyConfig);
  configurePdf(eleventyConfig);
  configureJsConfig(eleventyConfig);
  configureIconify(eleventyConfig);
  configureInlineAsset(eleventyConfig);
  configureItemFilterData(eleventyConfig);
  await prefetchSpecIcons();
  configureLocations(eleventyConfig);
  configureMenus(eleventyConfig);
  await configureNavigation(eleventyConfig);
  configureNews(eleventyConfig);
  configureOpeningTimes(eleventyConfig);
  configureRecurringEvents(eleventyConfig);
  configureScreenshots(eleventyConfig);
  configureFilters(eleventyConfig);
  configureProducts(eleventyConfig);
  configureProperties(eleventyConfig);
  configureReviews(eleventyConfig);
  configureScss(eleventyConfig);
  configureStyleBundle(eleventyConfig);
  configureTags(eleventyConfig);
  configureThumbnailPlaceholder(eleventyConfig);
  configureUnusedImages(eleventyConfig);
  configureVideo(eleventyConfig);
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
