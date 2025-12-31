import { memoize } from "#utils/memoize.js";

// Build memoized reverse index: menuSlug -> [categories]
const buildMenuCategoryMap = memoize((categories) => {
  const menuCategories = new Map();

  for (const category of categories) {
    const menus = category.data.menus;
    if (menus) {
      for (const menuSlug of menus) {
        if (!menuCategories.has(menuSlug)) {
          menuCategories.set(menuSlug, []);
        }
        menuCategories.get(menuSlug).push(category);
      }
    }
  }

  return menuCategories;
});

// Build memoized reverse index: categorySlug -> [items]
const buildCategoryItemMap = memoize((items) => {
  const categoryItems = new Map();

  for (const item of items) {
    // Get categories from either menu_categories array or single menu_category
    const categories =
      item.data.menu_categories ||
      (item.data.menu_category ? [item.data.menu_category] : []);

    for (const categorySlug of categories) {
      if (!categoryItems.has(categorySlug)) {
        categoryItems.set(categorySlug, []);
      }
      categoryItems.get(categorySlug).push(item);
    }
  }

  return categoryItems;
});

const getCategoriesByMenu = (categories, menuSlug) => {
  if (!categories) return [];
  const map = buildMenuCategoryMap(categories);
  return map.get(menuSlug) || [];
};

const getItemsByCategory = (items, categorySlug) => {
  if (!items) return [];
  const map = buildCategoryItemMap(items);
  return map.get(categorySlug) || [];
};

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

export { configureMenus, getCategoriesByMenu, getItemsByCategory };
