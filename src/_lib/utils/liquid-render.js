import { join } from "node:path";
import { Liquid } from "liquidjs";
import { SRC_DIR } from "#lib/paths.js";
import { memoize } from "#toolkit/fp/memoize.js";

const liquid = new Liquid();

const INCLUDES_DIR = join(SRC_DIR, "_includes");

/**
 * Create a memoized template loader for a given include file.
 * Uses Bun.file().text() for faster file reading.
 * @param {string} templateName - Name of the template file (without path)
 * @returns {Function} Memoized async function that returns template content
 */
const createTemplateLoader = (templateName) =>
  memoize(async () => Bun.file(join(INCLUDES_DIR, templateName)).text());

/**
 * Create a template renderer function
 * @param {Function} getTemplate - Memoized template loader function
 * @param {string} dataKey - Key name for the data in the template context
 * @returns {Function} Async function that renders the template with data
 */
const createTemplateRenderer =
  (getTemplate, dataKey) =>
  /** @param {unknown[]} data */
  async (data) => {
    if (!data || data.length === 0) {
      return "";
    }

    const template = await getTemplate();
    return liquid.parseAndRender(template, { [dataKey]: data });
  };

/**
 * Recursively process all string values in a data structure through Liquid,
 * resolving template expressions like {{ title }} against the provided context.
 * Non-string values (numbers, booleans, null) are returned unchanged.
 */
const processLiquidStrings = async (value, context) => {
  if (typeof value === "string") {
    return value.includes("{{") || value.includes("{%")
      ? liquid.parseAndRender(value, context)
      : value;
  }
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => processLiquidStrings(item, context)),
    );
  }
  if (value !== null && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await processLiquidStrings(v, context),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return value;
};

export { createTemplateLoader, createTemplateRenderer, processLiquidStrings };
