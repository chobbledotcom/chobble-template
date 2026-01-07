import { processQuoteFields } from "#config/quote-fields-helpers.js";
import quoteFieldsData from "./quote-fields.json" with { type: "json" };

const quoteFields = processQuoteFields(quoteFieldsData);

export default function () {
  return quoteFields;
}
