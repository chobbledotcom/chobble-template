const getCategoriesByMenu = (categories, menuSlug) =>
  categories.filter((category) => category.data.menus?.includes(menuSlug));

const getItemsByCategory = (items, categorySlug) => {
  // Handle both single category (legacy) and multiple categories
  return items.filter((item) => {
    if (item.data.menu_categories) {
      return item.data.menu_categories.includes(categorySlug);
    }
    // Fallback for items still using single category
    return item.data.menu_category === categorySlug;
  });
};

const configureMenus = (eleventyConfig) => {
  eleventyConfig.addFilter("getCategoriesByMenu", getCategoriesByMenu);
  eleventyConfig.addFilter("getItemsByCategory", getItemsByCategory);
};

module.exports = { configureMenus };