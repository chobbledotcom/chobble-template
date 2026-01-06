import navUtil from "@11ty/eleventy-navigation/eleventy-navigation.js";

import { filter, pipe, sort } from "#utils/array-utils.js";

const createNavigationFilter = (eleventyConfig) => (collection, activeKey) =>
  navUtil.toHtml.call(eleventyConfig, collection, {
    activeAnchorClass: "active",
    activeKey: activeKey,
  });

const findPageUrl = (collection, tag, slug) => {
  if (!collection) {
    return "#";
  }
  const result = collection.find(
    (item) => item.fileSlug === slug && item.data?.tags?.includes(tag),
  );
  if (!result) {
    return "#";
  }
  return result.url;
};

const compareByNavOrder = (a, b) => {
  const orderA = a.data.eleventyNavigation.order ?? 999;
  const orderB = b.data.eleventyNavigation.order ?? 999;
  if (orderA !== orderB) return orderA - orderB;

  const titleA = a.data.eleventyNavigation.key || a.data.title || "";
  const titleB = b.data.eleventyNavigation.key || b.data.title || "";
  return titleA.localeCompare(titleB);
};

const configureNavigation = async (eleventyConfig) => {
  const nav = await import("@11ty/eleventy-navigation");
  eleventyConfig.addPlugin(nav.default);

  eleventyConfig.addFilter(
    "toNavigation",
    createNavigationFilter(eleventyConfig),
  );
  eleventyConfig.addFilter("pageUrl", findPageUrl);

  // Add custom collection for navigation links sorted by order, then by title
  eleventyConfig.addCollection("navigationLinks", (collectionApi) =>
    pipe(
      filter((item) => item.data.eleventyNavigation),
      sort(compareByNavOrder),
    )(collectionApi.getAll()),
  );
};

export { createNavigationFilter, findPageUrl, configureNavigation };
