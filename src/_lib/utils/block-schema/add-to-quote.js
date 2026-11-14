/* jscpd:ignore-start -- block schema declaration data */
export const type = "add-to-quote";

export const collections = ["products"];

export const fields = {};

export const docs = {
  summary: "An add-to-quote button for the product the page describes.",
  scss: "src/css/design-system/_quote.scss",
  notes:
    "Product-only block. No parameters. A product with more than one option gets a choice of option beside the button; a hire product is added once and priced by the days the visitor asks for. Renders nothing on a page without `options`.",
};

export const example = {
  type: "add-to-quote",
};
/* jscpd:ignore-end */
