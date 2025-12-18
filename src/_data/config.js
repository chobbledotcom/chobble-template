import { createRequire } from "module";

const require = createRequire(import.meta.url);

const DEFAULTS = {
  sticky_mobile_nav: true,
  horizontal_nav: true,
  homepage_news: true,
  homepage_products: true,
  externalLinksTargetBlank: false,
  contact_form_target: null,
  formspark_id: null,
  botpoison_public_key: null,
  stripe_publishable_key: null,
  template_repo_url: "https://github.com/chobbledotcom/chobble-template",
  chobble_link: null,
  map_embed_src: null,
  has_cart_enquiry_form: false,
  has_products_filter: false,
};

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

  cachedConfig = merged;
  return merged;
}
