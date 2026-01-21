/**
 * Breadcrumbs module - pure JS implementation for building breadcrumb data
 *
 * Breadcrumb structure:
 * 1. Home (always first, always a link)
 * 2. Collection index (link unless we're at it, then span)
 * 3. Item or subfolder (link if subfolder and not current, otherwise span)
 * 4. Sub-item (span, only if in subfolder)
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

/**
 * Build breadcrumbs data array
 * Returns array of { label, url } objects (url is null for current page)
 */
const breadcrumbsFilter = (page, title, navigationParent, parentLocation) => {
  if (page.url === "/") return [];

  const indexUrl =
    PARENT_URL_MAP[navigationParent] ||
    `/${page.url.split("/").filter(Boolean)[0]}/`;
  const crumbs = [
    { label: "Home", url: "/" },
    { label: navigationParent, url: crumbUrl(page.url, indexUrl) },
  ];

  if (page.url === indexUrl) return crumbs;

  if (!parentLocation) return [...crumbs, { label: title, url: null }];

  const parentUrl = `/${strings.location_permalink_dir}/${parentLocation}/`;
  const parentCrumb = {
    label: slugToTitle(parentLocation),
    url: crumbUrl(page.url, parentUrl),
  };

  if (page.url === parentUrl) return [...crumbs, parentCrumb];

  return [...crumbs, parentCrumb, { label: title, url: null }];
};

/**
 * Configure breadcrumbs in Eleventy
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
const configureBreadcrumbs = (eleventyConfig) => {
  eleventyConfig.addFilter("breadcrumbsFilter", breadcrumbsFilter);
};

export { configureBreadcrumbs };
