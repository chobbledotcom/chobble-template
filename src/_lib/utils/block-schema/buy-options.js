/* jscpd:ignore-start */
import {
  ITEMS_GRID_META,
  imageCardGridFields,
  img,
  objectList,
  str,
} from "#utils/block-schema/shared.js";
/* jscpd:ignore-end */

export const type = "buy-options";

/* jscpd:ignore-start */
export const fields = imageCardGridFields({
  ...objectList("Products", {
    image: img("Image", { required: true }),
    title: str("Title", { required: true }),
    subtitle: str("Subtitle"),
    price: str("Price (display, e.g. £15)"),
    currency: str("Currency (ISO code, e.g. GBP)"),
    link: str("Buy Link", { required: true }),
    button_text: str("Button Text"),
  }),
  required: true,
  description:
    "Product objects. Each: `{image, title, subtitle, price, currency, link, button_text}`. Images processed by `{% image %}` shortcode for responsive srcset + LQIP.",
});
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Grid of buyable products — image, title, optional subtitle, price, and a buy button. Emits schema.org Product microdata.",
  template: "src/_includes/design-system/buy-options.html",
  ...ITEMS_GRID_META,
  notes:
    'Each item renders as a `<li>` with `itemscope itemtype="https://schema.org/Product"`. The price is emitted as a nested `Offer` with `priceCurrency` (defaults to `GBP`). Use this block when the buy action is external (Stripe, itch.io, Gumroad); for sitewide shop listings, use the `items` block with a `products` collection.',
};
