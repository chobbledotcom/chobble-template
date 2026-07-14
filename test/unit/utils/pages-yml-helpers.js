/**
 * Shared helpers for tests that parse .pages.yml.
 */

/**
 * Walk a parsed Pages CMS YAML tree and collect every block reference
 * (`{name, component}` entries) from any `blocks:` list of a `type: block`
 * field — those are the block types actually reachable from the CMS UI.
 *
 * @param {unknown} node
 * @param {Array<{name: string, component: string}>} [acc]
 * @returns {Array<{name: string, component: string}>}
 */
export const collectBlockReferences = (node, acc = []) => {
  if (Array.isArray(node)) {
    for (const entry of node) collectBlockReferences(entry, acc);
    return acc;
  }
  if (node && typeof node === "object") {
    if (node.type === "block" && Array.isArray(node.blocks)) {
      acc.push(...node.blocks);
    }
    for (const value of Object.values(node)) collectBlockReferences(value, acc);
  }
  return acc;
};

/**
 * @param {unknown} node
 * @param {object[]} [acc]
 * @returns {object[]}
 */
export const collectReferenceFields = (node, acc = []) => {
  if (Array.isArray(node)) {
    for (const entry of node) collectReferenceFields(entry, acc);
    return acc;
  }
  if (node && typeof node === "object") {
    if (node.type === "reference") acc.push(node);
    for (const value of Object.values(node)) collectReferenceFields(value, acc);
  }
  return acc;
};

/**
 * @param {{content: object[]}} pagesConfig
 * @returns {Map<string, object>}
 */
export const getCollectionMap = (pagesConfig) =>
  new Map(
    pagesConfig.content
      .filter((entry) => entry.type === "collection")
      .map((entry) => [entry.name, entry]),
  );
