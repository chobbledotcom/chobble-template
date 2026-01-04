import { filter, flatMap, pipe, sort, uniqueBy } from "#utils/array-utils.js";
import { buildPdfFilename } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

const hasSymbolAndLabel = (key) => key.symbol && key.label;

export default {
  eleventyComputed: {
    pdfFilename: (data) => buildPdfFilename(data.site.name, data.page.fileSlug),
    eleventyNavigation: (data) => {
      return {
        key: data.title,
        parent: data.strings.menus_name,
        order: data.order || 0,
      };
    },
    allDietaryKeys: (data) => {
      const menuCategories = pipe(
        filter((cat) => cat.data.menus?.includes(data.page.fileSlug)),
        sort(sortItems),
      )(data.collections.menu_category || []);

      const menuItems = data.collections.menu_item || [];
      const itemInCategory = (category) => (item) =>
        item.data.menu_categories?.includes(category.fileSlug);

      return pipe(
        flatMap((category) => menuItems.filter(itemInCategory(category))),
        flatMap((item) => item.data.dietaryKeys || []),
        filter(hasSymbolAndLabel),
        uniqueBy((key) => key.symbol),
      )(menuCategories);
    },
  },
};
