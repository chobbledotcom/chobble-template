import { memoize } from "#utils/memoize.js";

/**
 * Build memoized reverse index: menuSlug -> [categories]
 * Uses flatMap to create pairs, then reduce to group by menu slug
 */
const buildMenuCategoryMap = memoize((categories) => {
  const pairs = categories.flatMap((category) =>
    (category.data.menus || []).map((menuSlug) => ({ menuSlug, category })),
  );

  return pairs.reduce((map, { menuSlug, category }) => {
    const existing = map.get(menuSlug) || [];
    return new Map(map).set(menuSlug, [...existing, category]);
  }, new Map());
});

/**
 * Extract category slugs from item data, handling both array and single value
 */
const getItemCategories = (item) =>
  item.data.menu_categories ||
  (item.data.menu_category ? [item.data.menu_category] : []);

/**
 * Build memoized reverse index: categorySlug -> [items]
 * Uses flatMap to create pairs, then reduce to group by category slug
 */
const buildCategoryItemMap = memoize((items) => {
  const pairs = items.flatMap((item) =>
    getItemCategories(item).map((categorySlug) => ({ categorySlug, item })),
  );

  return pairs.reduce((map, { categorySlug, item }) => {
    const existing = map.get(categorySlug) || [];
    return new Map(map).set(categorySlug, [...existing, item]);
  }, new Map());
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
