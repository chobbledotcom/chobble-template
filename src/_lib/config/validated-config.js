/**
 * Centralized configuration validation.
 *
 * All validation runs at module load time. Errors are collected from every
 * validator before throwing so users see every problem at once rather than
 * discovering them one build failure at a time.
 *
 * Exports validated values for use by other modules.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import configData from "#data/config.json" with { type: "json" };
import site from "#data/site.json" with { type: "json" };
import { PAGES_DIR } from "#lib/paths.js";

const VALID_CART_MODES = ["stripe", "quote"];
const VALID_PRODUCT_MODES = ["buy", "hire"];

/**
 * @param {string | null | undefined} value
 * @param {readonly string[]} validValues
 * @param {string} field
 * @param {string} defaultNote
 * @returns {string[]}
 */
const validateEnum = (value, validValues, field, defaultNote) => {
  if (!value || validValues.includes(value)) return [];
  return [
    `Invalid ${field}: "${value}". Must be one of: ${validValues.join(", ")}, or ${defaultNote}.`,
  ];
};

const cartModeError = (cartMode, filename, issue) =>
  `cart_mode is "${cartMode}" but src/pages/${filename} ${issue}`;

const validatePageFrontmatter = (filename, layout, permalink, cartMode) => {
  const pagePath = path.isAbsolute(filename)
    ? filename
    : path.join(PAGES_DIR, filename);

  if (!fs.existsSync(pagePath)) {
    return [cartModeError(cartMode, filename, "does not exist")];
  }

  const { data } = matter.read(pagePath);
  if (Object.keys(data).length === 0) {
    return [cartModeError(cartMode, filename, "has no frontmatter")];
  }

  const layoutErrors =
    data.layout !== layout
      ? [cartModeError(cartMode, filename, `does not have layout: ${layout}`)]
      : [];
  const permalinkErrors =
    data.permalink !== permalink
      ? [
          cartModeError(
            cartMode,
            filename,
            `does not have permalink: ${permalink}`,
          ),
        ]
      : [];
  return [...layoutErrors, ...permalinkErrors];
};

const siteUrlProtocolErrors = !site.url
  ? []
  : !URL.canParse(site.url)
    ? [`site.json 'url' is not a valid URL: ${site.url}`]
    : ["http:", "https:"].includes(new URL(site.url).protocol)
      ? []
      : [`site.json 'url' must use http or https protocol, got: ${site.url}`];

const siteUrlErrors = !site.url
  ? ["site.json is missing the 'url' field"]
  : [
      ...(site.url.endsWith("/")
        ? [`site.json 'url' must not end with a slash: ${site.url}`]
        : []),
      ...siteUrlProtocolErrors,
    ];

const currencyErrors =
  !configData.currency ||
  Intl.supportedValuesOf("currency").includes(configData.currency)
    ? []
    : [
        `Invalid currency: "${configData.currency}". Must be a valid ISO 4217 currency code (e.g. "GBP", "USD", "EUR").`,
      ];

const stripeCartErrors =
  configData.cart_mode !== "stripe"
    ? []
    : [
        ...(configData.ecommerce_api_host
          ? []
          : [
              'cart_mode is "stripe" but ecommerce_api_host is not set in config.json',
            ]),
        ...validatePageFrontmatter(
          "stripe-checkout.md",
          "stripe-checkout.html",
          "/stripe-checkout/",
          "stripe",
        ),
        ...validatePageFrontmatter(
          "order-complete.md",
          "checkout-complete.html",
          "/order-complete/",
          "stripe",
        ),
      ];

const quoteFormTarget =
  configData.contact_form_target ||
  (configData.formspark_id &&
    `https://submit-form.com/${configData.formspark_id}`);

const quoteCartErrors =
  configData.cart_mode !== "quote"
    ? []
    : [
        ...(quoteFormTarget
          ? []
          : [
              'cart_mode is "quote" but neither formspark_id nor contact_form_target is set in config.json',
            ]),
        ...validatePageFrontmatter(
          "checkout.md",
          "quote-checkout.html",
          "/checkout/",
          "quote",
        ),
      ];

const errors = [
  ...siteUrlErrors,
  ...currencyErrors,
  ...validateEnum(
    configData.product_mode,
    VALID_PRODUCT_MODES,
    "product_mode",
    "null/omitted for default (buy)",
  ),
  ...validateEnum(
    configData.cart_mode,
    VALID_CART_MODES,
    "cart_mode",
    "null/omitted for no cart",
  ),
  ...stripeCartErrors,
  ...quoteCartErrors,
];

if (errors.length > 0) {
  const heading =
    errors.length === 1
      ? "Configuration error:"
      : `Configuration errors (${errors.length}):`;
  const body = errors.map((msg, i) => `  ${i + 1}. ${msg}`).join("\n");
  throw new Error(`${heading}\n${body}`);
}

export const siteUrl = site.url;
