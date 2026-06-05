/**
 * Item-level validation.
 *
 * Checks that collection items have a `name` field, and that nested
 * object-list entries in blocks also have `name` where required by schema.
 * Features blocks additionally require `icon` on each item.
 * Errors are collected before throwing so the user sees every problem
 * in one build.
 */

import { NAMED_LIST_FIELDS } from "#utils/block-schema.js";

/**
 * Collect name-missing errors in one block's object-list fields.
 * Skips features blocks since they have their own dedicated validator.
 * @param {Record<string, unknown>} block
 * @param {string} ctx
 * @returns {string[]}
 */
const collectNestedNameErrors = (block, ctx) => {
  if (typeof block.type !== "string") return [];
  if (block.type === "features") return [];
  const listFields = NAMED_LIST_FIELDS[block.type];
  if (!listFields?.length) return [];

  return listFields.flatMap((fieldName) => {
    const list = block[fieldName];
    if (!Array.isArray(list)) return [];
    return list.flatMap((item, i) => {
      if (!item || typeof item !== "object" || item.name) return [];
      return [
        `Block "${block.type}" "${fieldName}[${i}]" is missing required "name" field${ctx}`,
      ];
    });
  });
};

/**
 * Check a single feature item for missing required fields.
 * @param {Record<string, unknown>} item
 * @returns {string[]} Missing field names
 */
const getMissingFeatureFields = (item) => {
  if (!item || typeof item !== "object") return [];
  const required = ["name", "icon"];
  return required.filter((field) => !item[field]);
};

/**
 * Collect errors for features block items missing required fields.
 * Each feature item must have `name` and `icon`.
 * @param {Record<string, unknown>} block
 * @param {string} ctx
 * @returns {string[]}
 */
const collectFeaturesErrors = (block, ctx) => {
  if (block.type !== "features") return [];
  if (!Array.isArray(block.items)) return [];

  return block.items.flatMap((item, i) => {
    const missing = getMissingFeatureFields(item);
    if (missing.length === 0) return [];
    const fields = missing.map((f) => `"${f}"`).join(", ");
    const plural = missing.length > 1 ? "s" : "";
    return [
      `Block "features" "items[${i}]" is missing required field${plural}: ${fields}${ctx}`,
    ];
  });
};

/**
 * Collect all item-level name errors without throwing.
 * Only checks `name` on tagged content items (pages/products/events etc.);
 * utility templates without tags (feeds, sitemaps) are exempt.
 * @param {Record<string, unknown>} data - Item data
 * @param {string} context - Context for error messages (e.g., file path)
 * @returns {string[]}
 */
export const collectItemErrors = (data, context = "") => {
  const isTaggedContent = Array.isArray(data.tags) && data.tags.length > 0;
  const nameError =
    isTaggedContent && !data.eleventyExcludeFromCollections && !data.name
      ? [`Item is missing required "name" field${context}`]
      : [];

  if (!Array.isArray(data.blocks)) return nameError;

  const blockCtx = ` in blocks${context}`;
  const nestedErrors = data.blocks.flatMap((block, i) => {
    const ctx = ` (block ${i + 1}${blockCtx})`;
    return [
      ...collectNestedNameErrors(block, ctx),
      ...collectFeaturesErrors(block, ctx),
    ];
  });

  return [...nameError, ...nestedErrors];
};

/**
 * Validates that an item and its nested object-list block entries all have
 * `name`. Collects every missing-name error before throwing so the user sees
 * them all at once.
 *
 * @param {Record<string, unknown>} data - Item data
 * @param {string} context - Context for error messages (e.g., file path)
 * @throws {Error} If any required `name` field is missing
 */
export const validateItem = (data, context = "") => {
  const errors = collectItemErrors(data, context);
  if (errors.length > 0) throw new Error(errors.join("\n"));
};
