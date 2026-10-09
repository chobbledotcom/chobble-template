/**
 * Breadcrumbs module - pure JS implementation for building breadcrumb data
 *
 * Breadcrumb structure:
 * 1. Home (always first, always a link)
 * 2. Collection index (link unless we're at it, then span)
 * 3. Item (span, current page)
 */

import strings from "#data/strings.js";
import { registerFilters } from "#eleventy/register.js";
import { canonicalUrl } from "#utils/canonical-url.js";
import { translationForUrl } from "#utils/i18n.js";

/** Mapping from navigation parent names to their index URLs */
const PARENT_URL_MAP = {
  [strings.news_name]: `/${strings.news_permalink_dir}/`,
  [strings.guide_name]: `/${strings.guide_permalink_dir}/`,
};

/**
 * The URL of the collection index a page sits under, in the page's own
 * language. A named parent has a base-language index whose counterpart, if the
 * site has paired one, comes from the translation groups; anything else is the
 * page's own first path segment under its language prefix. For the base
 * language, whose prefix is "/", both read exactly as they did before any of
 * this existed.
 * @param {string|undefined} navigationParent - Navigation parent name
 * @param {string} pageUrl - The current page's URL
 * @param {import("#lib/types").Language} pageLanguage - The page's language
 * @param {Array<Record<string, string>>} translations - Pages that say the same
 *   thing, keyed by language code
 * @returns {string}
 */
const getIndexUrl = (navigationParent, pageUrl, pageLanguage, translations) => {
  const baseIndex =
    navigationParent === undefined
      ? undefined
      : PARENT_URL_MAP[navigationParent];
  if (baseIndex) {
    const group = translationForUrl(baseIndex, translations);
    const translated = group ? group[pageLanguage.code] : undefined;
    return translated === undefined ? baseIndex : translated;
  }
  const withinLanguage = pageUrl.slice(pageLanguage.home_url.length);
  const [segment] = withinLanguage.split("/").filter(Boolean);
  return `${pageLanguage.home_url}${segment}/`;
};

/**
 * Build breadcrumbs data array
 * Returns array of { label, url } objects (url is null for current page)
 * @param {{ url: string }} page - Current page object with url property
 * @param {string} title - Page title
 * @param {string|undefined} navigationParent - Navigation parent name
 * @param {import("#lib/types").Language} pageLanguage - The language this page
 *   is written in. Its home page is the first crumb, so a trail never sends a
 *   reader from one language to another.
 * @param {Array<Record<string, string>>} translations - Pages that say the same
 *   thing, keyed by language code, so a collection index crumb points at the
 *   index in the page's own language where the site publishes one.
 */
const breadcrumbsFilter = (
  page,
  title,
  navigationParent,
  pageLanguage,
  translations,
) => {
  const home = { label: pageLanguage.home_label, url: pageLanguage.home_url };
  if (page.url === home.url) return [];

  const indexUrl = getIndexUrl(
    navigationParent,
    page.url,
    pageLanguage,
    translations,
  );

  if (page.url === indexUrl) {
    return [home, { label: navigationParent || title, url: null }];
  }

  const baseCrumbs = navigationParent
    ? [home, { label: navigationParent, url: indexUrl }]
    : [home];

  return [...baseCrumbs, { label: title, url: null }];
};

/**
 * @param {Record<string, unknown>} meta
 * @param {boolean} showBreadcrumbs
 * @param {...any} breadcrumbArgs - Arguments forwarded to breadcrumbsFilter
 * @returns {Record<string, unknown>}
 */
const withSchemaBreadcrumbs = (meta, showBreadcrumbs, ...breadcrumbArgs) => {
  if (!showBreadcrumbs) return meta;
  const page = breadcrumbArgs[0];
  const breadcrumbs = Reflect.apply(
    breadcrumbsFilter,
    null,
    breadcrumbArgs,
  ).map(
    /**
     * @param {{ label: string, url: string | null }} crumb
     * @param {number} index
     */
    (crumb, index) => ({
      name: crumb.label,
      url: canonicalUrl(crumb.url ? crumb.url : page.url),
      position: index + 1,
    }),
  );
  return breadcrumbs.length > 0 ? { ...meta, breadcrumbs } : meta;
};

/**
 * The schema metadata with the page's own language on it. `meta.language` is
 * one site-wide value from `_data/meta.json`, so without this a German page
 * published `inLanguage: "en-GB"` in its JSON-LD while its html element and its
 * og:locale said German.
 * @param {Record<string, unknown>} meta
 * @param {import("#lib/types").Language} pageLanguage - The page's language
 * @returns {Record<string, unknown>}
 */
const withSchemaLanguage = (meta, pageLanguage) => ({
  ...meta,
  language: pageLanguage.hreflang,
});

/**
 * Configure breadcrumbs in Eleventy
 * @param {import("#lib/types").UserConfig} eleventyConfig
 */
const configureBreadcrumbs = (eleventyConfig) => {
  /* jscpd:ignore-start -- declaration data: registered filter map */
  registerFilters(eleventyConfig)({
    breadcrumbsFilter,
    withSchemaBreadcrumbs,
    withSchemaLanguage,
  });
  /* jscpd:ignore-end */
};

export {
  breadcrumbsFilter,
  configureBreadcrumbs,
  getIndexUrl,
  withSchemaBreadcrumbs,
  withSchemaLanguage,
};
