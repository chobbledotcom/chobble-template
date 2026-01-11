import { buildReverseIndex } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";

// Memoized at module level so the cache persists across calls
const buildMenuCategoryMap = memoize((categories) =>
  buildReverseIndex(categories, (category) => category.data.menus || []),
);

const buildCategoryItemMap = memoize((items) =>
  buildReverseIndex(
    items,
    (item) =>
      item.data.menu_categories ||
      (item.data.menu_category ? [item.data.menu_category] : []),
  ),
);

const getCategoriesByMenu = (categories, menuSlug) => {
  if (categories === undefined) return [];
  return buildMenuCategoryMap(categories).get(menuSlug) || [];
};

const getItemsByCategory = (items, categorySlug) => {
  if (items === undefined) return [];
  return buildCategoryItemMap(items).get(categorySlug) || [];
};

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

export { configureMenus, getCategoriesByMenu, getItemsByCategory };
