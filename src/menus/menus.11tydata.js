import { filter, flatMap, pipe, sort } from "#toolkit/fp/array.js";
import { uniqueDietaryKeys } from "#utils/dietary-utils.js";
import { linkableContent } from "#utils/linkable-content.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import { buildPdfFilename } from "#utils/slug-utils.js";
import { sortItems } from "#utils/sorting.js";

export default linkableContent("menus", {
  /** @param {*} data */
  subtitle: (data) => data.subtitle || "",
  /** @param {*} data */
  pdfFilename: (data) => buildPdfFilename(data.site.name, data.page.fileSlug),
  /** @param {*} data */
  eleventyNavigation: (data) =>
    withNavigationAnchor(data, {
      key: data.title,
      parent: data.strings.menus_name,
      order: data.order || 0,
    }),
  /** @param {*} data */
  allDietaryKeys: (data) => {
    const menuCategories = pipe(
      filter((cat) => cat.data.menus?.includes(data.page.fileSlug)),
      sort(sortItems),
    )(data.collections["menu-categories"] || []);

    const menuItems = data.collections["menu-items"] || [];
    /**
     * @param {*} category
     * @returns {(item: *) => boolean}
     */
    const itemInCategory =
      (category) =>
      /** @param {*} item */
      (item) =>
        item.data.menu_categories?.includes(category.fileSlug);

    return pipe(
      flatMap((category) => menuItems.filter(itemInCategory(category))),
      flatMap((item) => item.data.dietaryKeys),
      uniqueDietaryKeys,
    )(menuCategories);
  },
});
