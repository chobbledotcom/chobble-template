import slugify from "@sindresorhus/slugify";
import { sortByOrderThenTitle } from "#utils/sorting.js";

export default {
  eleventyComputed: {
    pdfFilename: (data) => {
      const businessSlug = slugify(data.site.name);
      return `${businessSlug}-${data.page.fileSlug}.pdf`;
    },
    eleventyNavigation: (data) => {
      return {
        key: data.title,
        parent: data.strings.menus_name,
        order: data.order || 0,
      };
    },
    allDietaryKeys: (data) => {
      const menuCategories = (data.collections.menu_category || [])
        .filter((cat) => cat.data.menus?.includes(data.page.fileSlug))
        .sort(sortByOrderThenTitle);

      const allItems = menuCategories.flatMap((category) =>
        (data.collections.menu_item || []).filter((item) =>
          item.data.menu_categories?.includes(category.fileSlug),
        ),
      );

      const dietaryKeys = allItems
        .flatMap((item) => item.data.dietaryKeys || [])
        .filter((key) => key.symbol && key.label);

      return [...new Map(dietaryKeys.map((key) => [key.symbol, key])).values()];
    },
  },
};
