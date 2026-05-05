export const type = "quote-cart";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["pages"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the client-side quote cart UI: page content, quote header, step progress, the cart shell (populated by JS), and the templates pushed to the design-system-base templates slot.",
  notes:
    "Pages-only block. No parameters. Used on the `/quote/` page when `cart_mode` is `quote`. Renders nothing visible until the cart JS hydrates.",
};
