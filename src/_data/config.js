import { createRequire } from "node:module";
import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
  validateCartConfig,
} from "#config/helpers.js";

const require = createRequire(import.meta.url);

const configData = require("./config.json");
const products = { ...DEFAULT_PRODUCT_DATA, ...getProducts(configData) };
const config = {
  ...DEFAULTS,
  ...configData,
  products,
};
// @ts-expect-error - Dynamically computed property
config.form_target = getFormTarget(config);

validateCartConfig(config);

export default function () {
  return config;
}
