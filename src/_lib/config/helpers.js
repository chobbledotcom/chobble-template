import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PAGES_DIR } from "#lib/paths.js";
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

const VALID_CART_MODES = ["paypal", "stripe", "quote"];
const VALID_PRODUCT_MODES = ["buy", "hire"];

const DEFAULT_PRODUCT_DATA = {
  item_widths: "240,480,640",
  gallery_thumb_widths: "240,480",
  gallery_image_widths: "900,1300,1800",
  header_image_widths: "640,900,1300",
  item_list_aspect_ratio: null,
  max_images: null,
};

const cartModeError = (cartMode, filename, issue) =>
  `cart_mode is "${cartMode}" but src/pages/${filename} ${issue}`;

const checkFrontmatterField = (frontmatter, field, value, cartMode, filename) =>
  frontmatter[field] !== value &&
  (() => {
    throw new Error(
      cartModeError(cartMode, filename, `does not have ${field}: ${value}`),
    );
  })();

const validatePageFrontmatter = (filename, layout, permalink, cartMode) => {
  const pagePath = path.isAbsolute(filename)
    ? filename
    : path.join(PAGES_DIR, filename);
  if (!fs.existsSync(pagePath)) {
    throw new Error(cartModeError(cartMode, filename, "does not exist"));
  }
  const { data } = matter.read(pagePath);
  if (Object.keys(data).length === 0) {
    throw new Error(cartModeError(cartMode, filename, "has no frontmatter"));
  }
  checkFrontmatterField(data, "layout", layout, cartMode, filename);
  checkFrontmatterField(data, "permalink", permalink, cartMode, filename);
};

const validateStripeMode = (checkoutApiUrl) => {
  if (!checkoutApiUrl) {
    throw new Error(
      'cart_mode is "stripe" but checkout_api_url is not set in config.json',
    );
  }
  validatePageFrontmatter(
    "stripe-checkout.md",
    "stripe-checkout.html",
    "/stripe-checkout/",
    "stripe",
  );
  validatePageFrontmatter(
    "order-complete.md",
    "checkout-complete.html",
    "/order-complete/",
    "stripe",
  );
};

const validatePaypalMode = (checkoutApiUrl) => {
  if (!checkoutApiUrl) {
    throw new Error(
      'cart_mode is "paypal" but checkout_api_url is not set in config.json',
    );
  }
};

const validateQuoteMode = (formTarget) => {
  if (!formTarget) {
    throw new Error(
      'cart_mode is "quote" but neither formspark_id nor contact_form_target is set in config.json',
    );
  }
  validatePageFrontmatter(
    "checkout.md",
    "quote-checkout.html",
    "/checkout/",
    "quote",
  );
};

const CART_MODE_VALIDATORS = {
  stripe: validateStripeMode,
  paypal: validatePaypalMode,
  quote: validateQuoteMode,
};

function validateCartConfig(config) {
  const { cart_mode, checkout_api_url, form_target, product_mode } = config;

  if (product_mode && !VALID_PRODUCT_MODES.includes(product_mode)) {
    throw new Error(
      `Invalid product_mode: "${product_mode}". Must be one of: ${VALID_PRODUCT_MODES.join(", ")}, or null/omitted for default (buy).`,
    );
  }

  if (!cart_mode) return;

  if (!VALID_CART_MODES.includes(cart_mode)) {
    throw new Error(
      `Invalid cart_mode: "${cart_mode}". Must be one of: ${VALID_CART_MODES.join(", ")}, or null/omitted for no cart.`,
    );
  }

  const validatorArg = cart_mode === "quote" ? form_target : checkout_api_url;
  CART_MODE_VALIDATORS[cart_mode](validatorArg);
}

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

export {
  DEFAULTS,
  DEFAULT_PRODUCT_DATA,
  getProducts,
  getFormTarget,
  validateCartConfig,
  validatePageFrontmatter,
};
