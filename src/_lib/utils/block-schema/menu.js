import { bool } from "#utils/block-schema/shared.js";

export const type = "menu";

export const collections = ["menus"];

export const fields = {
  cards: {
    ...bool("Cards"),
    description:
      "If true, render each category's items as a product-style card grid instead of compact name/price rows. Cards never link to a menu-item page. Default `false`; omitted values are falsy in the template, so no string default is required for runtime behavior.",
  },
};

export const docs = {
  summary:
    "Renders the current menu page's categories, items, dietary key legend and PDF download link. Designed for files in the `menus` collection.",
  scss: "src/css/design-system/_menu.scss",
  notes:
    "No block-level parameters beyond `cards`. Resolves the current menu via `page.fileSlug` against `collections.menu-categories` and `collections.menu-items`. Reads `allDietaryKeys` and `pdfFilename` from page data (computed by `src/menus/menus.11tydata.js`). With `cards: false` (the default), items render as compact name/price rows inside `ul.menu-items`. With `cards: true`, each category's items render as a no-link product-style card grid inside `ul.items.menu-card-items`, inheriting the shared card layout from `_items.scss` with menu-only spacing adjustments. Card thumbnails use the global `products.item_list_aspect_ratio`; menu items are single-option buy items, so cart controls (quote and Stripe) render inline with a quantity selector whenever the menu item is cart-enabled.",
};
