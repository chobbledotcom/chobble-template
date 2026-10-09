import fs from "node:fs";
import { join } from "node:path";
import config from "#data/config.js";
import { PAGES_DIR } from "#lib/paths.js";
import { getIcon } from "#media/iconify.js";
import { imageShortcode } from "#media/image.js";
import { createHtml } from "#utils/dom-builder.js";
import { filter, mapAsync, pipe, sort } from "#utils/fp/array.js";
import { orderThenString } from "#utils/fp/sorting.js";

/** @typedef {import("../types/navigation.d.ts").NavigationEntry} NavigationEntry */
/** @typedef {(children: NavigationEntry[]) => Promise<string>} RenderChildren */
/** @typedef {{ data: { eleventyNavigation: { order?: number, key?: string }, name: string } }} NavigationItem */

const NAV_THUMBNAIL_WIDTHS = ["64", "128", "480", "600"];
const NAV_THUMBNAIL_ASPECT = "1/1";
const SEARCH_PAGE_PATH = join(PAGES_DIR, "search.md");
const SEARCH_ICON_ID = "hugeicons:search-02";

/**
 * Collection comparator for navigation pages: by eleventyNavigation order
 * (defaulting to 999), then by key with page name as the fallback for a falsy key.
 * The default order lives with the collection, where content defaults belong.
 * @type {(a: NavigationItem, b: NavigationItem) => number}
 */
const sortNavigationItems = orderThenString(
  (item) => item.data.eleventyNavigation.order ?? 999,
  (item) => item.data.eleventyNavigation.key || item.data.name,
);

/**
 * @param {NavigationEntry} entry
 * @param {string} activeKey
 * @param {string} currentUrl
 * @param {RenderChildren} renderChildren
 * @param {boolean} isRootLevel
 * @param {boolean} showThumbnails
 * @returns {Promise<string>}
 */
const renderNavEntry = async (
  entry,
  activeKey,
  currentUrl,
  renderChildren,
  isRootLevel,
  showThumbnails,
) => {
  /**
   * How an entry relates to the page being rendered, as its aria-current value:
   * "page" for the page itself, "true" for the section it sits in (the entry
   * named by activeKey, such as News for a news post), otherwise null.
   * @param {NavigationEntry} entry
   * @param {string} activeKey
   * @param {string} currentUrl
   * @returns {"page" | "true" | null}
   */
  const currentState = (entry, activeKey, currentUrl) => {
    if (entry.url && entry.url === currentUrl) return "page";
    return activeKey === entry.key ? "true" : null;
  };
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
  const current = currentState(entry, activeKey, currentUrl);
  const anchorAttrs = {
    class: current ? "active" : null,
    href: entry.url ?? null,
    "aria-current": current,
  };
  const titleHtml = await createHtml("span", {}, entry.title);
  const anchor = await createHtml("a", anchorAttrs, thumbnailHtml + titleHtml);
  return createHtml("li", {}, anchor + childrenHtml);
};

/**
 * Filter: renders navigation HTML.
 * Usage: {{ navItems | toNavigation: activeKey, pageLanguage.search_label, page.url }}
 * @param {NavigationEntry[]} pages
 * @param {string} [activeKey]
 * @param {string} [searchLabel] - The page language's `search_label`, needed
 *   only by sites that publish a search page
 * @param {string} [currentUrl] - The rendered page's URL, marked aria-current
 * @returns {Promise<string>}
 */
const toNavigation = async (
  pages,
  activeKey = "",
  searchLabel = "",
  currentUrl = "",
) => {
  if (!pages?.length) return "";
  if (pages[0]?.pluginType !== "eleventy-navigation") {
    throw new Error("toNavigation requires eleventyNavigation filter first");
  }
  const showThumbnails = config().nav_thumbnails;
  /**
   * The search field in the navigation. Its button is an icon, and its field has
   * only a placeholder, so both are named from the page language's label -
   * without it neither says what it does to a screen reader.
   * @param {string} searchLabel - The page language's `search_label`
   * @returns {Promise<string>}
   */
  const renderSearchItem = async (searchLabel) => {
    if (!searchLabel) {
      throw new Error(
        "toNavigation needs the page language's search_label to name the " +
          "search field: {{ navItems | toNavigation: activeKey, " +
          "pageLanguage.search_label }}.",
      );
    }
    const iconSvg = await getIcon(SEARCH_ICON_ID);
    const searchButton = await createHtml(
      "button",
      { type: "submit", "aria-label": searchLabel },
      iconSvg,
    );
    const searchInput = await createHtml("input", {
      type: "search",
      name: "q",
      placeholder: searchLabel,
      "aria-label": searchLabel,
      autocomplete: "off",
    });
    const searchForm = await createHtml(
      "form",
      { action: "/search/", method: "get", class: "search-box" },
      searchInput + searchButton,
    );
    return createHtml("li", { class: "nav-search" }, searchForm);
  };
  /** @param {NavigationEntry[]} children */
  const renderChildren = async (children) => {
    const items = await mapAsync((child) =>
      renderNavEntry(
        child,
        activeKey,
        currentUrl,
        renderChildren,
        false,
        showThumbnails,
      ),
    )(children);
    return createHtml("ul", {}, items.join("\n"));
  };
  const navItems = await mapAsync((entry) =>
    renderNavEntry(
      entry,
      activeKey,
      currentUrl,
      renderChildren,
      true,
      showThumbnails,
    ),
  )(pages);
  const searchItem = fs.existsSync(SEARCH_PAGE_PATH)
    ? [await renderSearchItem(searchLabel)]
    : [];
  const items = [...navItems, ...searchItem];
  return createHtml("ul", { class: "nav-thumbnails" }, items.join("\n"));
};

/**
 * Filter: the navigation pages written in one language, so each language
 * gets its own menu from the same navigationLinks collection.
 * Usage: {{ collections.navigationLinks | inLanguage: pageLanguage | eleventyNavigation }}
 * @param {Array<{ data: { pageLanguage?: { code: string } } }>} items
 * @param {{ code: string }} language
 */
const inLanguage = (items, language) =>
  items.filter((item) => item.data.pageLanguage?.code === language.code);

/**
 * @param {import("#lib/types").UserConfig} eleventyConfig
 * @returns {Promise<void>}
 */
const configureNavigation = async (eleventyConfig) => {
  const nav = await import("@11ty/eleventy-navigation");
  eleventyConfig.addPlugin(nav.default);
  eleventyConfig.addAsyncFilter("toNavigation", toNavigation);
  eleventyConfig.addFilter("inLanguage", inLanguage);
  eleventyConfig.addCollection(
    "navigationLinks",
    /** @param {import("#lib/types").EleventyCollectionApi} collectionApi */
    (collectionApi) =>
      pipe(
        filter((item) => item.data.eleventyNavigation),
        sort(sortNavigationItems),
      )(collectionApi.getAll()),
  );
};

export { configureNavigation, toNavigation };
