import { join } from "node:path";
import { Liquid } from "liquidjs";
import { SRC_DIR } from "#lib/paths.js";

const INCLUDES_DIR = join(SRC_DIR, "_includes");

const liquid = new Liquid({
  root: INCLUDES_DIR,
  extname: "",
});

/**
 * Render Liquid expressions in a value, recursing into objects and arrays.
 * @param {unknown} value
 * @param {Record<string, unknown>} context
 * @returns {Promise<unknown>}
 */
const renderValue = async (value, context) => {
  if (typeof value === "string") {
    return value.includes("{{") || value.includes("{%")
      ? liquid.parseAndRender(value, context)
      : value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => renderValue(v, context)));
  }
  if (value !== null && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await renderValue(v, context),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return value;
};

/**
 * Process an array of blocks through Liquid, resolving template expressions
 * like {{ title }} in all string values against the provided context.
 * @param {Record<string, unknown>[]} blocks
 * @param {Record<string, unknown>} context
 * @returns {Promise<Record<string, unknown>[]>}
 */
const processLiquidStrings = (blocks, context) =>
  /** @type {Promise<Record<string, unknown>[]>} */ (
    Promise.all(blocks.map((block) => renderValue(block, context)))
  );

export { processLiquidStrings };
