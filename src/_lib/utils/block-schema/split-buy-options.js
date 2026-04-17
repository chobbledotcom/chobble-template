/* jscpd:ignore-start */
import { img, num } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
  str,
} from "#utils/block-schema/split-shared.js";
/* jscpd:ignore-end */

export const type = "split-buy-options";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_image: {
    ...img("Product Image"),
    required: true,
    description:
      "Product image path. Processed by `{% image %}` shortcode for responsive srcset + LQIP.",
  },
  figure_title: {
    ...str("Product Title"),
    required: true,
    description: "Product name. Schema.org `name`.",
  },
  figure_subtitle: {
    ...str("Product Subtitle"),
    description: "Optional subtitle, e.g. `Print edition`. Rendered italic.",
  },
  figure_price: {
    ...str("Product Price (display, e.g. £15)"),
    description:
      "Display price. Currency symbols are stripped for schema.org `price`.",
  },
  figure_currency: {
    ...str("Product Currency (ISO code, e.g. GBP)"),
    default: '"GBP"',
    description: "ISO currency code for schema.org `priceCurrency`.",
  },
  figure_link: {
    ...str("Buy Link"),
    required: true,
    description: "Buy URL.",
  },
  figure_button_text: {
    ...str("Buy Button Text"),
    default: '"Buy now"',
    description: "Button label.",
  },
  figure_heading_level: {
    ...num("Product Heading Level"),
    default: "3",
    description: "Heading level for the product title.",
  },
  figure_image_aspect_ratio: {
    ...str("Product Image Aspect Ratio"),
    description: 'Aspect ratio, e.g. `"16/9"`, `"1/1"`, `"4/3"`.',
  },
};

export const docs = {
  summary:
    "Two-column layout with text content and a single buyable product card. Emits schema.org Product microdata.",
  ...SPLIT_BASE_DOCS,
  notes:
    'Figure renders as `<figure itemscope itemtype="https://schema.org/Product">` with the same card markup as each item in the `buy-options` block (shared partial `src/_includes/design-system/buy-option-card.html`). Use this when you have a single buy action to promote alongside text; use `buy-options` for a grid of products.',
};
