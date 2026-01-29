/**
 * Menu collections and filters
 *
 * Provides filters for navigating menu structures:
 * - getCategoriesByMenu: Get categories belonging to a menu
 * - getItemsByCategory: Get menu items belonging to a category
 *
 * @module #collections/menus
 */

import { buildReverseIndex } from "#toolkit/fp/grouping.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";
import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").MenuCategoryCollectionItem} MenuCategoryCollectionItem */
/** @typedef {import("#lib/types").MenuItemCollectionItem} MenuItemCollectionItem */

/**
 * Build a map of menu slugs to their categories.
 * Memoized at module level so the cache persists across calls.
 */
const buildMenuCategoryMap =
  /** @type {(categories: MenuCategoryCollectionItem[]) => Map<string, MenuCategoryCollectionItem[]>} */ (
    memoizeByRef((categories) =>
      buildReverseIndex(categories, (category) => category.data.menus),
    )
  );

/**
 * Build a map of category slugs to their menu items.
 * Memoized at module level so the cache persists across calls.
 */
const buildCategoryItemMap =
  /** @type {(items: MenuItemCollectionItem[]) => Map<string, MenuItemCollectionItem[]>} */ (
    memoizeByRef((items) =>
      buildReverseIndex(items, (item) => item.data.menu_categories),
    )
  );

/**
 * Get categories belonging to a specific menu.
 * Note: Handles undefined input from Liquid templates gracefully.
 *
 * @param {MenuCategoryCollectionItem[] | undefined} categories - All menu categories
 * @param {string} menuSlug - The menu slug to filter by
 * @returns {MenuCategoryCollectionItem[]} Categories belonging to this menu
 */
const getCategoriesByMenu = (categories, menuSlug) => {
  if (!categories) return [];
  return (buildMenuCategoryMap(categories).get(menuSlug) ?? []).sort(sortItems);
};

/**
 * Get menu items belonging to a specific category.
 * Note: Handles undefined input from Liquid templates gracefully.
 *
 * @param {MenuItemCollectionItem[] | undefined} items - All menu items
 * @param {string} categorySlug - The category slug to filter by
 * @returns {MenuItemCollectionItem[]} Items belonging to this category
 */
const getItemsByCategory = (items, categorySlug) => {
  if (!items) return [];
  return buildCategoryItemMap(items).get(categorySlug) ?? [];
};

/** Pre-sorted menus collection. */
const createMenusCollection = (collectionApi) =>
  collectionApi.getFilteredByTag("menus").sort(sortItems);

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addCollection("menus", createMenusCollection);
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

export { configureMenus, getCategoriesByMenu, getItemsByCategory };
