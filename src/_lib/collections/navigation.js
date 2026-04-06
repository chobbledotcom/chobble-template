import fs from "node:fs";
import { join } from "node:path";
import config from "#data/config.js";
import { getBySlug } from "#eleventy/collection-lookup.js";
import { PAGES_DIR } from "#lib/paths.js";
import { getIcon } from "#media/iconify.js";
import { imageShortcode } from "#media/image.js";
import { filter, mapAsync, pipe, sort } from "#toolkit/fp/array.js";
import { createHtml } from "#utils/dom-builder.js";
import { sortNavigationItems } from "#utils/sorting.js";

const NAV_THUMBNAIL_WIDTHS = ["64", "128", "480", "600"];
const NAV_THUMBNAIL_ASPECT = "1/1";
const SEARCH_PAGE_PATH = join(PAGES_DIR, "search.md");
const SEARCH_ICON_ID = "hugeicons:search-02";

/** Renders a single navigation entry with optional thumbnail (not at root level) */
const renderNavEntry = async (
  entry,
  activeKey,
  renderChildren,
  isRootLevel,
  showThumbnails,
) => {
  const [thumbnailHtml, childrenHtml] = await Promise.all([
    !showThumbnails || isRootLevel || !entry.data.thumbnail
      ? Promise.resolve("")
      : imageShortcode(
          entry.data.thumbnail,
          "",
          NAV_THUMBNAIL_WIDTHS,
          "",
          null,
          NAV_THUMBNAIL_ASPECT,
          "lazy",
        ),
    entry.children?.length
      ? renderChildren(entry.children)
      : Promise.resolve(""),
  ]);
  const anchorAttrs = {
    class: activeKey === entry.key ? "active" : null,
    href: entry.url,
  };
  const titleHtml = await createHtml("span", {}, entry.title);
  const anchor = await createHtml("a", anchorAttrs, thumbnailHtml + titleHtml);
  return createHtml("li", {}, anchor + childrenHtml);
};

/** Renders the search box list item for the navigation */
const renderSearchItem = async () => {
  const iconSvg = await getIcon(SEARCH_ICON_ID);
  const searchButton = await createHtml("button", { type: "submit" }, iconSvg);
  const searchInput = await createHtml("input", {
    type: "search",
    name: "q",
    placeholder: "Search...",
    autocomplete: "off",
  });
  const searchForm = await createHtml(
    "form",
    { action: "/search/", method: "get", class: "search-box" },
    searchInput + searchButton,
  );
  return createHtml("li", { class: "nav-search" }, searchForm);
};

/** Filter: renders navigation HTML. Usage: {{ navItems | toNavigation: activeKey }} */
const toNavigation = async (pages, activeKey = "") => {
  if (!pages?.length) return "";
  if (pages[0]?.pluginType !== "eleventy-navigation") {
    throw new Error("toNavigation requires eleventyNavigation filter first");
  }
  const showThumbnails = config().nav_thumbnails;
  const renderChildren = async (children) => {
    const items = await mapAsync((child) =>
      renderNavEntry(child, activeKey, renderChildren, false, showThumbnails),
    )(children);
    return createHtml("ul", {}, items.join("\n"));
  };
  const navItems = await mapAsync((entry) =>
    renderNavEntry(entry, activeKey, renderChildren, true, showThumbnails),
  )(pages);
  const searchItem = fs.existsSync(SEARCH_PAGE_PATH)
    ? [await renderSearchItem()]
    : [];
  const items = [...navItems, ...searchItem];
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

export { configureNavigation, findPageUrl, toNavigation };
