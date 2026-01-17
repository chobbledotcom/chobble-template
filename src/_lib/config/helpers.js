import { pickTruthy } from "#utils/object-entries.js";

const DEFAULTS = {
  sticky_mobile_nav: true,
  horizontal_nav: true,
  homepage_news: true,
  homepage_products: true,
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
  reviews_truncate_limit: 10,
  list_item_fields: ["link", "subtitle", "thumbnail"],
  navigation_content_anchor: false,
  category_order: null,
  screenshots: null,
  design_system_layouts: ["design-system-base.html"],
};

const DEFAULT_PRODUCT_DATA = {
  item_widths: "240,480,640",
  gallery_thumb_widths: "240,480",
  gallery_image_widths: "900,1300,1800",
  header_image_widths: "640,900,1300",
  item_list_aspect_ratio: null,
  max_images: null,
};

/**
 * Extract non-null product settings from config
 */
const getProducts = (configData) => pickTruthy(configData.products || {});

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
