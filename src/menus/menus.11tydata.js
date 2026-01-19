import { filter, flatMap, pipe, sort, uniqueBy } from "#toolkit/fp/array.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import { buildPdfFilename } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

export default {
  eleventyComputed: {
    pdfFilename: (data) => buildPdfFilename(data.site.name, data.page.fileSlug),
    eleventyNavigation: (data) =>
      withNavigationAnchor(data, {
        key: data.title,
        parent: data.strings.menus_name,
        order: data.order || 0,
      }),
    allDietaryKeys: (data) => {
      const menuCategories = pipe(
        filter((cat) => cat.data.menus?.includes(data.page.fileSlug)),
        sort(sortItems),
      )(data.collections["menu-categories"] || []);

      const menuItems = data.collections["menu-items"] || [];
      const itemInCategory = (category) => (item) =>
        item.data.menu_categories?.includes(category.fileSlug);

      return pipe(
        flatMap((category) => menuItems.filter(itemInCategory(category))),
        flatMap((item) => item.data.dietaryKeys),
        filter((key) => key.symbol && key.label),
        uniqueBy((key) => key.symbol),
      )(menuCategories);
    },
  },
};
