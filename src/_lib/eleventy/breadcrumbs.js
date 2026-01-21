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
import { slugToTitle } from "#utils/slug-utils.js";

/** Mapping from navigation parent names to their index URLs */
const PARENT_URL_MAP = {
  [strings.product_name]: `/${strings.product_permalink_dir}/`,
  [strings.event_name]: `/${strings.event_permalink_dir}/`,
  [strings.location_name]: `/${strings.location_permalink_dir}/`,
  [strings.property_name]: `/${strings.property_permalink_dir}/`,
  [strings.menus_name]: `/${strings.menu_permalink_dir}/`,
  [strings.guide_name]: `/${strings.guide_permalink_dir}/`,
};

/** Get URL for crumb - null if we're at that URL, otherwise the URL */
const crumbUrl = (pageUrl, url) => (pageUrl === url ? null : url);

/** Create crumbs array with parent between index and current page */
const withParent = (baseCrumbs, parentCrumb, title, isAtParent) =>
  isAtParent
    ? [...baseCrumbs, parentCrumb]
    : [...baseCrumbs, parentCrumb, { label: title, url: null }];

/** Build crumbs for category parent pages */
const buildCategoryCrumbs = (page, baseCrumbs, title, category) => {
  const label = category.data.title || slugToTitle(category.fileSlug);
  const crumb = { label, url: crumbUrl(page.url, category.url) };
  return withParent(baseCrumbs, crumb, title, page.url === category.url);
};

/** Build crumbs for location parent pages */
const buildLocationCrumbs = (page, baseCrumbs, title, parentLocation) => {
  const parentUrl = `/${strings.location_permalink_dir}/${parentLocation}/`;
  const crumb = {
    label: slugToTitle(parentLocation),
    url: crumbUrl(page.url, parentUrl),
  };
  return withParent(baseCrumbs, crumb, title, page.url === parentUrl);
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
) => {
  if (page.url === "/") return [];

  const indexUrl =
    PARENT_URL_MAP[navigationParent] ||
    `/${page.url.split("/").filter(Boolean)[0]}/`;
  const baseCrumbs = [
    { label: "Home", url: "/" },
    { label: navigationParent || title, url: crumbUrl(page.url, indexUrl) },
  ];

  if (page.url === indexUrl) return baseCrumbs;

  const categoryParent =
    parentCategory && categories?.find((c) => c.fileSlug === parentCategory);

  if (categoryParent)
    return buildCategoryCrumbs(page, baseCrumbs, title, categoryParent);

  if (parentLocation)
    return buildLocationCrumbs(page, baseCrumbs, title, parentLocation);

  return [...baseCrumbs, { label: title, url: null }];
};

/**
 * Configure breadcrumbs in Eleventy
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
const configureBreadcrumbs = (eleventyConfig) => {
  eleventyConfig.addFilter("breadcrumbsFilter", breadcrumbsFilter);
};

export { configureBreadcrumbs, buildCategoryCrumbs, buildLocationCrumbs };
