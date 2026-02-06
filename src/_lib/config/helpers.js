import { frozenObject, pickTruthy } from "#toolkit/fp/object.js";

const DEFAULTS = frozenObject({
  sticky_mobile_nav: true,
  horizontal_nav: true,
  collapse_mobile_menu: false,
  navigation_is_clicky: false,
  homepage_news: true,
  homepage_products: true,
  show_breadcrumbs: false,
  externalLinksTargetBlank: false,
  contact_form_target: null,
  formspark_id: null,
  botpoison_public_key: null,
  template_repo_url: "https://github.com/chobbledotcom/chobble-template",
  chobble_link: null,
  map_embed_src: null,
  cart_mode: null,
  checkout_api_url: null,
  product_mode: null,
  has_products_filter: false,
  has_properties_filter: false,
  placeholder_images: true,
  enable_theme_switcher: false,
  timezone: "Europe/London",
  show_product_review_counts: false,
  reviews_truncate_limit: 10,
  rating_stars_uses_svg: false,
  list_item_fields: ["link", "subtitle", "thumbnail"],
  navigation_content_anchor: false,
  category_order: null,
  property_order: null,
  screenshots: {},
  design_system_layouts: ["design-system-base.html"],
  phoneNumberLength: 11,
  use_visual_editor: false,
  default_image_widths: [240, 480, 900, 1300],
  currency: "GBP",
  default_max_quantity: 1,
  search_collections: [
    "products",
    "categories",
    "events",
    "properties",
    "news",
  ],
});

const DEFAULT_PRODUCT_DATA = frozenObject({
  item_list_aspect_ratio: null,
  max_images: null,
});

/**
 * Extract non-null product settings from config
 */
const getProducts = ({ products }) => pickTruthy(products);

/**
 * Get form target URL from config, preferring explicit target over formspark
 */
const getFormTarget = (configData) => {
  if (configData.contact_form_target) {
    return configData.contact_form_target;
  }
  if (configData.formspark_id) {
    return `https://submit-form.com/${configData.formspark_id}`;
  }
  return null;
};

export { DEFAULTS, DEFAULT_PRODUCT_DATA, getProducts, getFormTarget };
