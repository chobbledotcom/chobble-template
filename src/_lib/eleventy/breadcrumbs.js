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
import { canonicalUrl } from "#utils/canonical-url.js";
import { translationForUrl } from "#utils/i18n.js";

/** Mapping from navigation parent names to their index URLs */
const PARENT_URL_MAP = {
  [strings.product_name]: `/${strings.product_permalink_dir}/`,
  [strings.event_name]: `/${strings.event_permalink_dir}/`,
  [strings.property_name]: `/${strings.property_permalink_dir}/`,
  [strings.menus_name]: `/${strings.menus_permalink_dir}/`,
  [strings.guide_name]: `/${strings.guide_permalink_dir}/`,
};

/** Create a crumb object for an item */
const makeCrumb = (item, isCurrentPage) => ({
  label: item.data.name,
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
  const baseIndex = PARENT_URL_MAP[navigationParent];
  if (baseIndex) {
    const group = translationForUrl(baseIndex, translations);
    const translated = group ? group[pageLanguage.code] : undefined;
    return translated === undefined ? baseIndex : translated;
  }
  const withinLanguage = pageUrl.slice(pageLanguage.home_url.length);
  const [segment] = withinLanguage.split("/").filter(Boolean);
  return `${pageLanguage.home_url}${segment}/`;
};

/** Build crumbs with a parent item (category or location) */
const buildParentCrumbs = (page, baseCrumbs, title, parent) => {
  const isAtParent = page.url === parent.url;
  const crumb = makeCrumb(parent, isAtParent);
  return isAtParent
    ? [...baseCrumbs, crumb]
    : withTitleCrumb([...baseCrumbs, crumb], title);
};

/** Find parent from categories by slug */
const findParent = (parentCategory, categories) => {
  if (parentCategory && categories)
    return getBySlug(categories, parentCategory);
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
 * @param {string} title - Page title
 * @param {string} propertySlug - Property slug the page belongs to
 * @param {Record<string, any>} collections - Eleventy collections object
 * @param {string|undefined} parentGuideCategory - Guide category slug
 * @param {{label: string, url: string}} home - The page's language home crumb
 */
const buildPropertyCrumbs = (
  title,
  propertySlug,
  collections,
  parentGuideCategory,
  home,
) => {
  const property = getBySlug(collections.properties, propertySlug);
  const baseCrumbs = [home, makeCrumb(property, false)];

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
 * @typedef {object} StandardCrumbContext
 * @property {{url: string}} page - Current page
 * @property {string} title - Page title
 * @property {string|undefined} navigationParent - Navigation parent name
 * @property {string|undefined} parentCategory - Explicit parent category slug
 * @property {string[]|undefined} itemCategories - Item's category slugs
 * @property {Record<string, any>} collections - Eleventy collections object
 * @property {{label: string, url: string}} home - The page's language home crumb
 * @property {import("#lib/types").Language} pageLanguage - The page's language
 * @property {Array<Record<string, string>>} translations - Pages that say the
 *   same thing, keyed by language code
 */

/**
 * Build standard breadcrumbs (no property override).
 * Extracted to keep cognitive complexity of main filter low.
 * @param {StandardCrumbContext} context - Everything the trail is built from
 */
const buildStandardCrumbs = (context) => {
  const indexUrl = getIndexUrl(
    context.navigationParent,
    context.page.url,
    context.pageLanguage,
    context.translations,
  );

  if (context.page.url === indexUrl) {
    return [
      context.home,
      { label: context.navigationParent || context.title, url: null },
    ];
  }

  const baseCrumbs = context.navigationParent
    ? [context.home, { label: context.navigationParent, url: indexUrl }]
    : [context.home];

  if (context.itemCategories?.[0] && context.collections.categories) {
    return buildCategoryCrumbs(
      context.page,
      baseCrumbs,
      context.title,
      context.itemCategories[0],
      context.collections.categories,
    );
  }

  const parent = findParent(
    context.parentCategory,
    context.collections.categories,
  );

  if (parent)
    return buildParentCrumbs(context.page, baseCrumbs, context.title, parent);

  return withTitleCrumb(baseCrumbs, context.title);
};

/**
 * Build breadcrumbs data array
 * Returns array of { label, url } objects (url is null for current page)
 * @param {Object} page - Current page object with url property
 * @param {string} title - Page title
 * @param {string} navigationParent - Navigation parent name
 * @param {string|undefined} parentCategory - Explicit parent category slug
 * @param {string[]|undefined} itemCategories - Item's categories array (slugs)
 * @param {Object} collections - Eleventy collections object
 * @param {string|undefined} parentProperty - Property slug (guide categories)
 * @param {string|undefined} parentGuideCategory - Guide category slug (guide pages)
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
  parentCategory,
  itemCategories,
  collections,
  parentProperty,
  parentGuideCategory,
  pageLanguage,
  translations,
) => {
  const home = { label: pageLanguage.home_label, url: pageLanguage.home_url };
  if (page.url === home.url) return [];

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
      home,
    );
  }

  return buildStandardCrumbs({
    page,
    title,
    navigationParent,
    parentCategory,
    itemCategories,
    collections,
    home,
    pageLanguage,
    translations,
  });
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
  ).map((crumb, index) => ({
    name: crumb.label,
    url: canonicalUrl(crumb.url ? crumb.url : page.url),
    position: index + 1,
  }));
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
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
const configureBreadcrumbs = (eleventyConfig) => {
  eleventyConfig.addFilter("breadcrumbsFilter", breadcrumbsFilter);
  eleventyConfig.addFilter("withSchemaBreadcrumbs", withSchemaBreadcrumbs);
  eleventyConfig.addFilter("withSchemaLanguage", withSchemaLanguage);
};

export {
  breadcrumbsFilter,
  buildCategoryCrumbs,
  buildParentCrumbs,
  buildPropertyCrumbs,
  buildStandardCrumbs,
  configureBreadcrumbs,
  findParent,
  getIndexUrl,
  resolvePropertySlug,
  withSchemaBreadcrumbs,
  withSchemaLanguage,
};
