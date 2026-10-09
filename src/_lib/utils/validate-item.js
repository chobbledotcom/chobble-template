/**
 * Item-level validation.
 *
 * Checks that collection items have a `name` field. Callers combine these
 * errors with the shared block-schema validator's output when they need
 * every item and block error together, as `src/_data/eleventyComputed.js`
 * does.
 */

/**
 * Collect item-level name errors without throwing.
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

  return nameError;
};
