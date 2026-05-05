import { bool } from "#utils/block-schema/shared.js";

export const type = "product-specs";

export const collections = ["products"];

export const fields = {
  highlights: {
    ...bool("Highlights Only"),
    default: "false",
    description:
      "If true, renders only highlighted specs; otherwise renders the full specs list.",
  },
};

export const docs = {
  summary:
    "Renders the product's `specs` array as a feature grid, delegating to the `features` block (icon + name + value per card).",
  notes:
    "Product-only block. Renders nothing when the page has no `specs` (or no highlighted specs when `highlights` is true).",
};
