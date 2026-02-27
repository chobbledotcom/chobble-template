import config from "#data/config.js";
import { getBySlug } from "#eleventy/collection-lookup.js";
import { imageShortcode } from "#media/image.js";
import { filter, mapAsync, pipe, sort } from "#toolkit/fp/array.js";
import { createHtml } from "#utils/dom-builder.js";
import { sortNavigationItems } from "#utils/sorting.js";

const NAV_THUMBNAIL_WIDTHS = ["64", "128", "480", "600"];
const NAV_THUMBNAIL_ASPECT = "1/1";

/** Renders a caret toggle button for root-level parent items */
const renderCaretButton = (title) =>
  createHtml(
    "button",
    { class: "nav-caret", "aria-label": `Toggle ${title} submenu` },
    "",
  );

/** Resolve thumbnail HTML for a navigation entry */
const resolveThumbnail = (entry, isRootLevel) =>
  isRootLevel || !entry.data?.thumbnail
    ? Promise.resolve("")
    : imageShortcode(
        entry.data.thumbnail,
        "",
        NAV_THUMBNAIL_WIDTHS,
        "",
        null,
        NAV_THUMBNAIL_ASPECT,
        "lazy",
      );

/** Renders a single navigation entry with optional thumbnail (not at root level) */
const renderNavEntry = async (
  entry,
  activeKey,
  renderChildren,
  isRootLevel,
) => {
  const [thumbnailHtml, childrenHtml] = await Promise.all([
    resolveThumbnail(entry, isRootLevel),
    entry.children?.length
      ? renderChildren(entry.children)
      : Promise.resolve(""),
  ]);
  const isActive = activeKey === entry.key;
  const anchorAttrs = {
    ...(isActive && { class: "active" }),
    ...(entry.url && { href: entry.url }),
  };
  const titleHtml = thumbnailHtml
    ? await createHtml("span", {}, entry.title)
    : entry.title;
  const anchor = await createHtml("a", anchorAttrs, thumbnailHtml + titleHtml);
  const showCaret =
    isRootLevel && childrenHtml && config().navigation_is_clicky;
  const caretHtml = showCaret ? await renderCaretButton(entry.title) : "";
  return createHtml("li", {}, anchor + caretHtml + childrenHtml);
};

/** Filter: renders navigation HTML. Usage: {{ navItems | toNavigation: activeKey }} */
const toNavigation = async (pages, activeKey = "") => {
  if (!pages?.length) return "";
  if (pages[0]?.pluginType !== "eleventy-navigation") {
    throw new Error("toNavigation requires eleventyNavigation filter first");
  }
  const renderChildren = async (children) => {
    const items = await mapAsync((child) =>
      renderNavEntry(child, activeKey, renderChildren, false),
    )(children);
    return createHtml("ul", {}, items.join("\n"));
  };
  const items = await mapAsync((entry) =>
    renderNavEntry(entry, activeKey, renderChildren, true),
  )(pages);
  return createHtml("ul", { class: "nav-thumbnails" }, items.join("\n"));
};

/** Find URL for a page matching tag and slug. Uses O(1) slug lookup. */
const findPageUrl = (collection, tag, slug) => {
  const item = getBySlug(collection, slug);
  if (!item.data.tags?.includes(tag)) {
    throw new Error(`Page "${slug}" does not have tag "${tag}".`);
  }
  return item.url;
};

const configureNavigation = async (eleventyConfig) => {
  const nav = await import("@11ty/eleventy-navigation");
  eleventyConfig.addPlugin(nav.default);
  eleventyConfig.addAsyncFilter("toNavigation", toNavigation);
  eleventyConfig.addFilter("pageUrl", findPageUrl);
  eleventyConfig.addCollection("navigationLinks", (collectionApi) =>
    pipe(
      filter((item) => item.data.eleventyNavigation),
      sort(sortNavigationItems),
    )(collectionApi.getAll()),
  );
};

export { findPageUrl, configureNavigation, toNavigation };
