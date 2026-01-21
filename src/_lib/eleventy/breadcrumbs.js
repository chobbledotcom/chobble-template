/**
 * Breadcrumbs module - pure JS implementation for building and rendering breadcrumbs
 *
 * Breadcrumb structure:
 * 1. Home (always first, always a link)
 * 2. Collection index (link unless we're at it, then span)
 * 3. Item or subfolder (link if subfolder and not current, otherwise span)
 * 4. Sub-item (span, only if in subfolder)
 */

import strings from "#data/strings.js";
import { createHtml } from "#utils/dom-builder.js";
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

/** Home crumb is always first */
const HOME_CRUMB = { label: "Home", url: "/" };

/** Render crumbs array to HTML */
const renderCrumbs = async (crumbs) => {
  const renderCrumb = async (crumb) => {
    const separator = await createHtml(
      "span",
      { class: "separator", "aria-hidden": "true" },
      "/",
    );
    const content = crumb.url
      ? await createHtml("a", { href: crumb.url }, crumb.label)
      : await createHtml("span", { "aria-current": "page" }, crumb.label);
    return createHtml("li", {}, (crumb.url === "/" ? "" : separator) + content);
  };

  const items = await Promise.all(crumbs.map(renderCrumb));
  const ol = await createHtml("ol", {}, items.join(""));
  const nav = await createHtml(
    "nav",
    { "aria-label": "Breadcrumb", class: "breadcrumbs" },
    ol,
  );
  return createHtml("div", { class: "design-system" }, nav);
};

/**
 * Build and render breadcrumbs - async filter for use in templates
 * Usage: {{ page | breadcrumbsHtmlFilter: title, navigationParent, parentLocation }}
 */
const breadcrumbsHtmlFilter = async (
  page,
  title,
  navigationParent,
  parentLocation,
) => {
  if (page.url === "/") return "";

  const indexUrl =
    PARENT_URL_MAP[navigationParent] ||
    `/${page.url.split("/").filter(Boolean)[0]}/`;
  const indexCrumb = {
    label: navigationParent,
    url: page.url === indexUrl ? null : indexUrl,
  };

  if (page.url === indexUrl) return renderCrumbs([HOME_CRUMB, indexCrumb]);

  if (parentLocation) {
    const parentUrl = `/${strings.location_permalink_dir}/${parentLocation}/`;
    const parentCrumb = { label: slugToTitle(parentLocation), url: parentUrl };

    if (page.url === parentUrl) {
      return renderCrumbs([
        HOME_CRUMB,
        indexCrumb,
        { ...parentCrumb, url: null },
      ]);
    }

    return renderCrumbs([
      HOME_CRUMB,
      indexCrumb,
      parentCrumb,
      { label: title, url: null },
    ]);
  }

  return renderCrumbs([HOME_CRUMB, indexCrumb, { label: title, url: null }]);
};

/**
 * Configure breadcrumbs in Eleventy
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
const configureBreadcrumbs = (eleventyConfig) => {
  eleventyConfig.addAsyncFilter("breadcrumbsHtmlFilter", breadcrumbsHtmlFilter);
};

export { configureBreadcrumbs };
