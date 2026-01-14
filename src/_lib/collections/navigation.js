import navUtil from "@11ty/eleventy-navigation/eleventy-navigation.js";

import { imageShortcode } from "#media/image.js";
import { filter, pipe, sort } from "#utils/array-utils.js";
import { createHtml } from "#utils/dom-builder.js";
import { sortNavigationItems } from "#utils/sorting.js";

const createNavigationFilter = (eleventyConfig) => (collection, activeKey) =>
  navUtil.toHtml.call(eleventyConfig, collection, {
    activeAnchorClass: "active",
    activeKey: activeKey,
  });

const NAV_THUMBNAIL_WIDTHS = ["64", "128"];
const NAV_THUMBNAIL_ASPECT = "1/1";

/** Get thumbnail HTML if available */
const getThumbnailHtml = async (entry) => {
  const thumbnail = entry.data?.thumbnail;
  if (!thumbnail) return "";
  return imageShortcode(
    thumbnail,
    "",
    NAV_THUMBNAIL_WIDTHS,
    "",
    null,
    NAV_THUMBNAIL_ASPECT,
    "lazy",
  );
};

/** Renders a single navigation entry with optional thumbnail */
const renderNavEntry = async (entry, activeKey, renderChildren) => {
  const [thumbnailHtml, childrenHtml] = await Promise.all([
    getThumbnailHtml(entry),
    entry.children?.length
      ? renderChildren(entry.children)
      : Promise.resolve(""),
  ]);
  const isActive = activeKey === entry.key;
  const textSpan = await createHtml("span", {}, entry.title);
  const anchorAttrs = {
    ...(isActive && { class: "active" }),
    ...(entry.url && { href: entry.url }),
  };
  const anchor = await createHtml("a", anchorAttrs, thumbnailHtml + textSpan);
  return createHtml("li", {}, anchor + childrenHtml);
};

/** Filter: renders navigation with thumbnails. Usage: {{ navItems | toNavigationThumbnails: activeKey }} */
const toNavigationThumbnails = async (pages, activeKey = "") => {
  if (!pages?.length) return "";
  if (pages[0]?.pluginType !== "eleventy-navigation") {
    throw new Error(
      "toNavigationThumbnails requires eleventyNavigation filter first",
    );
  }
  const renderChildren = async (children) => {
    const items = await Promise.all(
      children.map((child) => renderNavEntry(child, activeKey, renderChildren)),
    );
    return createHtml("ul", {}, items.join("\n"));
  };
  const items = await Promise.all(
    pages.map((entry) => renderNavEntry(entry, activeKey, renderChildren)),
  );
  return createHtml("ul", { class: "nav-thumbnails" }, items.join("\n"));
};

/**
 * Find URL for a page matching tag and slug
 */
const findPageUrl = (collection, tag, slug) => {
  const result = collection.find(
    (item) => item.fileSlug === slug && item.data.tags?.includes(tag),
  );
  return result?.url ?? "#";
};

/** Collection of navigation links sorted by order, then by key */
const createNavigationLinksCollection = (collectionApi) =>
  pipe(
    filter((item) => item.data.eleventyNavigation),
    sort(sortNavigationItems),
  )(collectionApi.getAll());

const configureNavigation = async (eleventyConfig) => {
  const nav = await import("@11ty/eleventy-navigation");
  eleventyConfig.addPlugin(nav.default);
  eleventyConfig.addFilter(
    "toNavigation",
    createNavigationFilter(eleventyConfig),
  );
  eleventyConfig.addFilter("pageUrl", findPageUrl);
  eleventyConfig.addAsyncFilter(
    "toNavigationThumbnails",
    toNavigationThumbnails,
  );
  eleventyConfig.addCollection(
    "navigationLinks",
    createNavigationLinksCollection,
  );
};

export {
  createNavigationFilter,
  findPageUrl,
  configureNavigation,
  toNavigationThumbnails,
};
