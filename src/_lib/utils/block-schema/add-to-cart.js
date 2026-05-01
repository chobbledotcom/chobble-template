export const type = "add-to-cart";

export const containerWidth = "narrow";

export const collections = ["products"];

export const fields = {};

export const docs = {
  summary:
    "Renders the current product's add-to-cart button, reusing the same controls shown in the product options area.",
  template: "src/_includes/design-system/add-to-cart-block.html",
  notes:
    "Product-only block. Reads `cart_attributes`, `options`, `product_mode`, `has_single_cart_option`, and `show_cart_quantity_selector` from the product's computed data and delegates rendering to `product-options.html`. Renders nothing when `config.cart_mode` is disabled or the page has no cart attributes.",
};
