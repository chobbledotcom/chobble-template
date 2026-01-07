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
const baseConfig = {
  ...DEFAULTS,
  ...configData,
  products,
};
const config = {
  ...baseConfig,
  form_target: getFormTarget(baseConfig),
};

validateCartConfig(config);

export default function () {
  return config;
}
