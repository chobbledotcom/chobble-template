export const type = "menu";

export const fields = {};

export const docs = {
  summary:
    "Renders the current menu page's categories, items, dietary key legend and PDF download link. Designed for files in the `menus` collection.",
  template: "src/_includes/design-system/menu-block.html",
  scss: "src/css/design-system/_menu.scss",
  notes:
    "No block-level parameters. Resolves the current menu via `page.fileSlug` against `collections.menu-categories` and `collections.menu-items`. Reads `allDietaryKeys` and `pdfFilename` from page data (computed by `src/menus/menus.11tydata.js`).",
};
