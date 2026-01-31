/**
 * Centralized configuration validation.
 *
 * All validation runs at module load time - errors indicate misconfiguration.
 * This file is excluded from coverage because validation branches only execute
 * when config files are invalid, which can't happen during normal test runs.
 *
 * Exports validated values for use by other modules.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import configData from "#data/config.json" with { type: "json" };
import site from "#data/site.json" with { type: "json" };
import { PAGES_DIR } from "#lib/paths.js";

if (!site.url) {
  throw new Error("site.json is missing the 'url' field");
}

if (site.url.endsWith("/")) {
  throw new Error(`site.json 'url' must not end with a slash: ${site.url}`);
}

const parsedUrl = new URL(site.url);
if (!["http:", "https:"].includes(parsedUrl.protocol)) {
  throw new Error(
    `site.json 'url' must use http or https protocol, got: ${site.url}`,
  );
}

export const siteUrl = site.url;

if (
  configData.currency &&
  !Intl.supportedValuesOf("currency").includes(configData.currency)
) {
  throw new Error(
    `Invalid currency: "${configData.currency}". Must be a valid ISO 4217 currency code (e.g. "GBP", "USD", "EUR").`,
  );
}

const VALID_CART_MODES = ["paypal", "stripe", "quote"];
const VALID_PRODUCT_MODES = ["buy", "hire"];

if (
  configData.product_mode &&
  !VALID_PRODUCT_MODES.includes(configData.product_mode)
) {
  throw new Error(
    `Invalid product_mode: "${configData.product_mode}". Must be one of: ${VALID_PRODUCT_MODES.join(", ")}, or null/omitted for default (buy).`,
  );
}

if (configData.cart_mode && !VALID_CART_MODES.includes(configData.cart_mode)) {
  throw new Error(
    `Invalid cart_mode: "${configData.cart_mode}". Must be one of: ${VALID_CART_MODES.join(", ")}, or null/omitted for no cart.`,
  );
}

const cartModeError = (cartMode, filename, issue) =>
  `cart_mode is "${cartMode}" but src/pages/${filename} ${issue}`;

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

  if (data.layout !== layout) {
    throw new Error(
      cartModeError(cartMode, filename, `does not have layout: ${layout}`),
    );
  }

  if (data.permalink !== permalink) {
    throw new Error(
      cartModeError(
        cartMode,
        filename,
        `does not have permalink: ${permalink}`,
      ),
    );
  }
};

if (configData.cart_mode === "stripe") {
  if (!configData.checkout_api_url) {
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
}

if (configData.cart_mode === "paypal") {
  if (!configData.checkout_api_url) {
    throw new Error(
      'cart_mode is "paypal" but checkout_api_url is not set in config.json',
    );
  }
}

if (configData.cart_mode === "quote") {
  const formTarget =
    configData.contact_form_target ||
    (configData.formspark_id &&
      `https://submit-form.com/${configData.formspark_id}`);

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
}
