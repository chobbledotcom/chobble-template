export const type = "quote-checkout";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["pages"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the multi-step quote-request form: page content, quote header, step progress, the form (with cart_items / hire_days hidden inputs populated by JS), and the templates pushed to the design-system-base templates slot.",
  notes:
    "Pages-only block. No parameters. Used on the `/checkout/` page when `cart_mode` is `quote`. Submits to the configured Formspark form target.",
};
