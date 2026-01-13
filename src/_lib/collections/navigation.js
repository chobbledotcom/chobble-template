import navUtil from "@11ty/eleventy-navigation/eleventy-navigation.js";

import { filter, pipe, sort } from "#utils/array-utils.js";
import { sortNavigationItems } from "#utils/sorting.js";

const createNavigationFilter = (eleventyConfig) => (collection, activeKey) =>
  navUtil.toHtml.call(eleventyConfig, collection, {
    activeAnchorClass: "active",
    activeKey: activeKey,
  });

/**
 * Find URL for a page matching tag and slug
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} collection - Eleventy collection
 * @param {string} tag - Tag to match
 * @param {string} slug - File slug to match
 * @returns {string} Page URL or "#" if not found
 *
 * Eleventy guarantees: Collection items always have a `data` property.
 * Therefore, no optional chaining needed on `item.data`.
 * See: src/_lib/types/index.d.ts EleventyCollectionItem type definition
 */
const findPageUrl = (collection, tag, slug) => {
  const result = collection.find(
    (item) => item.fileSlug === slug && item.data.tags?.includes(tag),
  );
  return result?.url ?? "#";
};

const configureNavigation = async (eleventyConfig) => {
  const nav = await import("@11ty/eleventy-navigation");
  eleventyConfig.addPlugin(nav.default);

  eleventyConfig.addFilter(
    "toNavigation",
    createNavigationFilter(eleventyConfig),
  );
  eleventyConfig.addFilter("pageUrl", findPageUrl);

  // Add custom collection for navigation links sorted by order, then by key
  eleventyConfig.addCollection("navigationLinks", (collectionApi) =>
    pipe(
      filter((item) => item.data.eleventyNavigation),
      sort(sortNavigationItems),
    )(collectionApi.getAll()),
  );
};

export { createNavigationFilter, findPageUrl, configureNavigation };
