export const type = "quote-checkout";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["pages"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the multi-step quote-request form: page content, quote header, step progress, the form (with cart_items hidden input populated by JS, and hire_days when quote_type is hire), and the templates pushed to the base layout templates slot.",
  notes:
    "Pages-only block. No parameters. Used on the `/checkout/` page when `cart_mode` is `quote`. Submits to the configured Formspark form target. When `quote_type` is `hire`, date-range inputs and hire-day pricing are shown.",
};
