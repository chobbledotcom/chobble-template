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
  [strings.menus_name]: `/${strings.menus_permalink_dir}/`,
  [strings.guide_name]: `/${strings.guide_permalink_dir}/`,
};

/** Create a crumb object for an item */
const makeCrumb = (item, isCurrentPage) => ({
  label: item.data.title,
  url: isCurrentPage ? null : item.url,
});

/**
 * Append a non-linked title crumb to a crumbs array
 * @param {Array<{label: string, url: string | null}>} crumbs
 * @param {string} title
 */
const withTitleCrumb = (crumbs, title) => [
  ...crumbs,
  { label: title, url: null },
];

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
    : withTitleCrumb([...baseCrumbs, crumb], title);
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
 * Resolve property slug from direct property field or via guide category lookup.
 * Guide categories have a direct `property` field; guide pages inherit it
 * by looking up their parent guide category's property.
 */
const resolvePropertySlug = (
  parentProperty,
  parentGuideCategory,
  collections,
) => {
  if (parentProperty && collections.properties) return parentProperty;
  if (
    parentGuideCategory &&
    collections["guide-categories"] &&
    collections.properties
  ) {
    const cat = getBySlug(collections["guide-categories"], parentGuideCategory);
    return cat.data.property;
  }
  return undefined;
};

/**
 * Build property-based breadcrumbs for guide categories/pages.
 * Replaces the collection index crumb with the linked property.
 */
const buildPropertyCrumbs = (
  title,
  propertySlug,
  collections,
  parentGuideCategory,
) => {
  const property = getBySlug(collections.properties, propertySlug);
  const baseCrumbs = [{ label: "Home", url: "/" }, makeCrumb(property, false)];

  if (parentGuideCategory && collections["guide-categories"]) {
    const guideCat = getBySlug(
      collections["guide-categories"],
      parentGuideCategory,
    );
    return withTitleCrumb([...baseCrumbs, makeCrumb(guideCat, false)], title);
  }

  return withTitleCrumb(baseCrumbs, title);
};

/**
 * Build standard breadcrumbs (no property override).
 * Extracted to keep cognitive complexity of main filter low.
 */
const buildStandardCrumbs = (
  page,
  title,
  navigationParent,
  parentLocation,
  parentCategory,
  itemCategories,
  collections,
) => {
  const indexUrl = getIndexUrl(navigationParent, page.url);
  const isAtIndex = page.url === indexUrl;
  const baseCrumbs = [
    { label: "Home", url: "/" },
    { label: navigationParent || title, url: isAtIndex ? null : indexUrl },
  ];

  if (isAtIndex) return baseCrumbs;

  if (itemCategories?.[0] && collections.categories) {
    return buildCategoryCrumbs(
      page,
      baseCrumbs,
      title,
      itemCategories[0],
      collections.categories,
    );
  }

  const parent = findParent(
    parentCategory,
    collections.categories,
    parentLocation,
    collections.locations,
  );

  if (parent) return buildParentCrumbs(page, baseCrumbs, title, parent);

  return withTitleCrumb(baseCrumbs, title);
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
 * @param {Object} collections - Eleventy collections object
 * @param {string|undefined} parentProperty - Property slug (guide categories)
 * @param {string|undefined} parentGuideCategory - Guide category slug (guide pages)
 */
const breadcrumbsFilter = (
  page,
  title,
  navigationParent,
  parentLocation,
  parentCategory,
  itemCategories,
  collections,
  parentProperty,
  parentGuideCategory,
) => {
  if (page.url === "/") return [];

  // Property-linked guide categories/pages: replace index crumb with property
  const propertySlug = resolvePropertySlug(
    parentProperty,
    parentGuideCategory,
    collections,
  );
  if (propertySlug) {
    return buildPropertyCrumbs(
      title,
      propertySlug,
      collections,
      parentGuideCategory,
    );
  }

  return buildStandardCrumbs(
    page,
    title,
    navigationParent,
    parentLocation,
    parentCategory,
    itemCategories,
    collections,
  );
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
  buildPropertyCrumbs,
  buildStandardCrumbs,
  findParent,
  getIndexUrl,
  resolvePropertySlug,
};
