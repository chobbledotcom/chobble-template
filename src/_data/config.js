import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
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

const cartModeError = (cartMode, filename, issue) =>
  `cart_mode is "${cartMode}" but src/pages/${filename} ${issue}`;

const getPagePath = (filename) => path.join(__dirname, "..", "pages", filename);

const extractFrontmatter = (pagePath, filename, cartMode) => {
  if (!fs.existsSync(pagePath)) {
    throw new Error(cartModeError(cartMode, filename, "does not exist"));
  }
  const content = fs.readFileSync(pagePath, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error(cartModeError(cartMode, filename, "has no frontmatter"));
  }
  return match[1];
};

function validatePageFrontmatter(filename, requiredLayout, requiredPermalink, cartMode) {
  const frontmatter = extractFrontmatter(getPagePath(filename), filename, cartMode);

  if (!frontmatter.includes(`layout: ${requiredLayout}`)) {
    throw new Error(cartModeError(cartMode, filename, `does not use layout: ${requiredLayout}`));
  }
  if (!frontmatter.includes(`permalink: ${requiredPermalink}`)) {
    throw new Error(cartModeError(cartMode, filename, `does not have permalink: ${requiredPermalink}`));
  }
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

const DEFAULT_PRODUCT_DATA = {
  item_widths: "240,480,640",
  gallery_thumb_widths: "240,480",
  gallery_image_widths: "900,1300,1800",
  header_image_widths: "640,900,1300",
};

function getProducts(configData) {
  const nonNulls = {};
  const products = configData["products"] || {};
  Object.keys(products).forEach((key) => {
    if (products[key]) {
      nonNulls[key] = products[key];
    }
  });
  return nonNulls;
}

function getFormTarget(configData) {
  if (configData.contact_form_target) {
    return configData.contact_form_target;
  }
  if (configData.formspark_id) {
    return `https://submit-form.com/${configData.formspark_id}`;
  }
  return null;
}

// Cache the config so it's only computed once
let cachedConfig = null;

export default function () {
  if (cachedConfig) return cachedConfig;

  const configData = require("./config.json");
  const products = Object.assign(DEFAULT_PRODUCT_DATA, getProducts(configData));
  const merged = Object.assign(DEFAULTS, configData, {
    products: products,
  });
  merged.form_target = getFormTarget(merged);

  validateCartConfig(merged);

  cachedConfig = merged;
  return merged;
}
