/**
 * Breadcrumbs module - pure JS implementation for building breadcrumb data
 *
 * Breadcrumb structure:
 * 1. Home (always first, always a link)
 * 2. Collection index (link unless we're at it, then span)
 * 3. Parent category/location (if has parent)
 * 4. Item (span, current page)
 */

import strings from "#data/strings.js";
import { indexBy } from "#toolkit/fp/memoize.js";

/** Mapping from navigation parent names to their index URLs */
const PARENT_URL_MAP = {
  [strings.product_name]: `/${strings.product_permalink_dir}/`,
  [strings.event_name]: `/${strings.event_permalink_dir}/`,
  [strings.location_name]: `/${strings.location_permalink_dir}/`,
  [strings.property_name]: `/${strings.property_permalink_dir}/`,
  [strings.menus_name]: `/${strings.menu_permalink_dir}/`,
  [strings.guide_name]: `/${strings.guide_permalink_dir}/`,
};

/** Index collections by fileSlug for O(1) lookups */
const indexBySlug = indexBy((item) => item.fileSlug);

/** Build crumbs with a parent item (category or location) */
const buildParentCrumbs = (page, baseCrumbs, title, parent) => {
  const isAtParent = page.url === parent.url;
  const crumb = {
    label: parent.data.title,
    url: isAtParent ? null : parent.url,
  };
  return isAtParent
    ? [...baseCrumbs, crumb]
    : [...baseCrumbs, crumb, { label: title, url: null }];
};

/** Find parent from categories or locations by slug */
const findParent = (parentCategory, categories, parentLocation, locations) => {
  if (parentCategory && categories)
    return indexBySlug(categories)[parentCategory];
  if (parentLocation && locations)
    return indexBySlug(locations)[parentLocation];
  return undefined;
};

/**
 * Build breadcrumbs data array
 * Returns array of { label, url } objects (url is null for current page)
 */
const breadcrumbsFilter = (
  page,
  title,
  navigationParent,
  parentLocation,
  parentCategory,
  categories,
  locations,
) => {
  if (page.url === "/") return [];

  const indexUrl =
    PARENT_URL_MAP[navigationParent] ||
    `/${page.url.split("/").filter(Boolean)[0]}/`;
  const isAtIndex = page.url === indexUrl;
  const baseCrumbs = [
    { label: "Home", url: "/" },
    { label: navigationParent || title, url: isAtIndex ? null : indexUrl },
  ];

  if (isAtIndex) return baseCrumbs;

  const parent = findParent(
    parentCategory,
    categories,
    parentLocation,
    locations,
  );

  if (parent) return buildParentCrumbs(page, baseCrumbs, title, parent);

  return [...baseCrumbs, { label: title, url: null }];
};

/**
 * Configure breadcrumbs in Eleventy
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
const configureBreadcrumbs = (eleventyConfig) => {
  eleventyConfig.addFilter("breadcrumbsFilter", breadcrumbsFilter);
};

export { configureBreadcrumbs, buildParentCrumbs, findParent };
