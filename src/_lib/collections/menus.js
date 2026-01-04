import { buildReverseIndex } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";

/**
 * Extract menu slugs from a category
 */
const getCategoryMenus = (category) => category.data.menus || [];

/**
 * Extract category slugs from item data, handling both array and single value
 */
const getItemCategories = (item) =>
  item.data.menu_categories ||
  (item.data.menu_category ? [item.data.menu_category] : []);

/**
 * Build memoized reverse index: menuSlug -> [categories]
 */
const buildMenuCategoryMap = memoize((categories) =>
  buildReverseIndex(categories, getCategoryMenus),
);

/**
 * Build memoized reverse index: categorySlug -> [items]
 */
const buildCategoryItemMap = memoize((items) =>
  buildReverseIndex(items, getItemCategories),
);

const getCategoriesByMenu = (categories, menuSlug) =>
  buildMenuCategoryMap(categories).get(menuSlug) || [];

const getItemsByCategory = (items, categorySlug) =>
  buildCategoryItemMap(items).get(categorySlug) || [];

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

export { configureMenus, getCategoriesByMenu, getItemsByCategory };
