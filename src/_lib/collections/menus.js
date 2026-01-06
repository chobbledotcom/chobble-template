import { buildReverseIndex } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";

const getCategoriesByMenu = (categories, menuSlug) => {
  if (categories === undefined) return [];
  const buildMenuCategoryMap = memoize((categories) =>
    buildReverseIndex(categories, (category) => category.data.menus || []),
  );
  return buildMenuCategoryMap(categories).get(menuSlug) || [];
};

const getItemsByCategory = (items, categorySlug) => {
  if (items === undefined) return [];
  const buildCategoryItemMap = memoize((items) =>
    buildReverseIndex(
      items,
      (item) =>
        item.data.menu_categories ||
        (item.data.menu_category ? [item.data.menu_category] : []),
    ),
  );
  return buildCategoryItemMap(items).get(categorySlug) || [];
};

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

export { configureMenus, getCategoriesByMenu, getItemsByCategory };
