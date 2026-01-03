import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  has_products_filter: false,
};

const VALID_CART_MODES = ["paypal", "stripe", "quote"];

const DEFAULT_PRODUCT_DATA = {
  item_widths: "240,480,640",
  gallery_thumb_widths: "240,480",
  gallery_image_widths: "900,1300,1800",
  header_image_widths: "640,900,1300",
};

const cartModeError = (cartMode, filename, issue) =>
  `cart_mode is "${cartMode}" but src/pages/${filename} ${issue}`;

const getPagePath = (filename) =>
  path.join(__dirname, "..", "..", "pages", filename);

const extractFrontmatter = (pagePath, filename, cartMode) => {
  if (!fs.existsSync(pagePath)) {
    throw new Error(cartModeError(cartMode, filename, "does not exist"));
  }
  const { data } = matter.read(pagePath);
  if (Object.keys(data).length === 0) {
    throw new Error(cartModeError(cartMode, filename, "has no frontmatter"));
  }
  return data;
};

const checkFrontmatterField = (
  frontmatter,
  field,
  value,
  cartMode,
  filename,
) => {
  if (frontmatter[field] !== value) {
    throw new Error(
      cartModeError(cartMode, filename, `does not have ${field}: ${value}`),
    );
  }
};

function validatePageFrontmatter(filename, layout, permalink, cartMode) {
  const frontmatter = extractFrontmatter(
    getPagePath(filename),
    filename,
    cartMode,
  );
  checkFrontmatterField(frontmatter, "layout", layout, cartMode, filename);
  checkFrontmatterField(
    frontmatter,
    "permalink",
    permalink,
    cartMode,
    filename,
  );
}

function validateStripePages() {
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
}

function validateQuotePages() {
  validatePageFrontmatter(
    "checkout.md",
    "quote-checkout.html",
    "/checkout/",
    "quote",
  );
}

function validateCartConfig(config) {
  const { cart_mode, checkout_api_url, form_target } = config;

  if (!cart_mode) return;

  if (!VALID_CART_MODES.includes(cart_mode)) {
    throw new Error(
      `Invalid cart_mode: "${cart_mode}". Must be one of: ${VALID_CART_MODES.join(", ")}, or null/omitted for no cart.`,
    );
  }

  if (cart_mode === "paypal" || cart_mode === "stripe") {
    if (!checkout_api_url) {
      throw new Error(
        `cart_mode is "${cart_mode}" but checkout_api_url is not set in config.json`,
      );
    }
  }

  if (cart_mode === "stripe") {
    validateStripePages();
  }

  if (cart_mode === "quote") {
    if (!form_target) {
      throw new Error(
        'cart_mode is "quote" but neither formspark_id nor contact_form_target is set in config.json',
      );
    }
    validateQuotePages();
  }
}

/**
 * Extract non-null product settings from config
 */
const getProducts = (configData) => {
  const products = configData.products || {};
  return Object.fromEntries(
    Object.entries(products).filter(([, value]) => value),
  );
};

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
  VALID_CART_MODES,
  DEFAULT_PRODUCT_DATA,
  getProducts,
  getFormTarget,
  extractFrontmatter,
  checkFrontmatterField,
  validatePageFrontmatter,
  validateStripePages,
  validateQuotePages,
  validateCartConfig,
  getPagePath,
  cartModeError,
};
