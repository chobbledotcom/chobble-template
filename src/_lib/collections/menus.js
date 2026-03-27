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
import { normaliseSlug } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").MenuCategoryCollectionItem} MenuCategoryCollectionItem */
/** @typedef {import("#lib/types").MenuItemCollectionItem} MenuItemCollectionItem */

/** Memoized index of menu slugs → categories, cached per array ref via WeakMap. */
const buildMenuCategoryMap = memoizeByRef(
  /** @param {MenuCategoryCollectionItem[]} categories */
  (categories) =>
    buildReverseIndex(categories, (category) =>
      category.data.menus.map(normaliseSlug),
    ),
);

/** Memoized index of category slugs → menu items, cached per array ref via WeakMap. */
const buildCategoryItemMap = memoizeByRef(
  /** @param {MenuItemCollectionItem[]} items */
  (items) =>
    buildReverseIndex(items, (item) =>
      item.data.menu_categories.map(normaliseSlug),
    ),
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

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addCollection("menus", (collectionApi) =>
    collectionApi.getFilteredByTag("menus").sort(sortItems),
  );
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

export { configureMenus, getCategoriesByMenu, getItemsByCategory };
