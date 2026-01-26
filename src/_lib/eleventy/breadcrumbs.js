/**
 * Breadcrumbs module - pure JS implementation for building breadcrumb data
 *
 * Breadcrumb structure:
 * 1. Home (always first, always a link)
 * 2. Collection index (link unless we're at it, then span)
 * 3. Parent category/location (if has parent)
 * 4. Child category (if item has categories and that category has a parent)
 * 5. Item (span, current page)
 */

import strings from "#data/strings.js";
import { getBySlug } from "#eleventy/collection-lookup.js";

/** Mapping from navigation parent names to their index URLs */
const PARENT_URL_MAP = {
  [strings.product_name]: `/${strings.product_permalink_dir}/`,
  [strings.event_name]: `/${strings.event_permalink_dir}/`,
  [strings.location_name]: `/${strings.location_permalink_dir}/`,
  [strings.property_name]: `/${strings.property_permalink_dir}/`,
  [strings.menus_name]: `/${strings.menu_permalink_dir}/`,
  [strings.guide_name]: `/${strings.guide_permalink_dir}/`,
};

/** Create a crumb object for an item */
const makeCrumb = (item, isCurrentPage) => ({
  label: item.data.title,
  url: isCurrentPage ? null : item.url,
});

/** Get index URL for a navigation parent, falling back to first path segment */
const getIndexUrl = (navigationParent, pageUrl) =>
  PARENT_URL_MAP[navigationParent] ||
  `/${pageUrl.split("/").filter(Boolean)[0]}/`;

/** Build crumbs with a parent item (category or location) */
const buildParentCrumbs = (page, baseCrumbs, title, parent) => {
  const isAtParent = page.url === parent.url;
  const crumb = makeCrumb(parent, isAtParent);
  return isAtParent
    ? [...baseCrumbs, crumb]
    : [...baseCrumbs, crumb, { label: title, url: null }];
};

/** Find parent from categories or locations by slug */
const findParent = (parentCategory, categories, parentLocation, locations) => {
  if (parentCategory && categories)
    return getBySlug(categories, parentCategory);
  if (parentLocation && locations) return getBySlug(locations, parentLocation);
  return undefined;
};

/**
 * Build category ancestor chain recursively and return crumbs.
 * Kept as separate function to manage cognitive complexity of main filter.
 */
const buildCategoryCrumbs = (
  page,
  baseCrumbs,
  title,
  categorySlug,
  categories,
) => {
  const getCategoryChain = (cat) =>
    cat.data.parent
      ? [...getCategoryChain(getBySlug(categories, cat.data.parent)), cat]
      : [cat];
  const category = getBySlug(categories, categorySlug);
  const isAtCategory = page.url === category.url;
  const categoryCrumbs = getCategoryChain(category).map((cat) =>
    makeCrumb(cat, isAtCategory && cat === category),
  );
  const itemCrumb = isAtCategory ? [] : [{ label: title, url: null }];
  return [...baseCrumbs, ...categoryCrumbs, ...itemCrumb];
};

/**
 * Build breadcrumbs data array
 * Returns array of { label, url } objects (url is null for current page)
 * @param {Object} page - Current page object with url property
 * @param {string} title - Page title
 * @param {string} navigationParent - Navigation parent name
 * @param {string|undefined} parentLocation - Explicit parent location slug
 * @param {string|undefined} parentCategory - Explicit parent category slug
 * @param {string[]|undefined} itemCategories - Item's categories array (slugs)
 * @param {Array} categories - Categories collection for lookup
 * @param {Array} locations - Locations collection for lookup
 */
const breadcrumbsFilter = (
  page,
  title,
  navigationParent,
  parentLocation,
  parentCategory,
  itemCategories,
  categories,
  locations,
) => {
  if (page.url === "/") return [];

  const indexUrl = getIndexUrl(navigationParent, page.url);
  const isAtIndex = page.url === indexUrl;
  const baseCrumbs = [
    { label: "Home", url: "/" },
    { label: navigationParent || title, url: isAtIndex ? null : indexUrl },
  ];

  if (isAtIndex) return baseCrumbs;

  // If item has categories, build hierarchy with category ancestors
  if (itemCategories?.[0] && categories) {
    return buildCategoryCrumbs(
      page,
      baseCrumbs,
      title,
      itemCategories[0],
      categories,
    );
  }

  // Legacy: explicit parent category or location
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

export {
  configureBreadcrumbs,
  buildParentCrumbs,
  buildCategoryCrumbs,
  findParent,
  getIndexUrl,
};
