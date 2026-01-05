import { createRequire } from "node:module";
import { processQuoteFields } from "#config/quote-fields-helpers.js";

const require = createRequire(import.meta.url);

const quoteFieldsData = require("./quote-fields.json");
const quoteFields = processQuoteFields(quoteFieldsData);

export default function () {
  return quoteFields;
}
