/**
 * Filters a collection of Eleventy items based on a filter config object.
 *
 * Supported operators:
 *   - includes: string contains check
 *   - equals: exact match
 *
 * The `property` field supports dot-notation paths (e.g. "data.title", "url").
 *
 * @param {object[]} items - Eleventy collection items
 * @param {object} filterConfig - Filter configuration
 * @param {string} filterConfig.property - Dot-notation path to the property (e.g. "url", "data.title")
 * @param {string} [filterConfig.includes] - Value the property must contain
 * @param {string} [filterConfig.equals] - Value the property must exactly match
 * @returns {object[]} Filtered items
 */
const getNestedProperty = (obj, path) => {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
};

const filterItems = (items, filterConfig) => {
  if (!filterConfig) return items;

  const { property, includes, equals } = filterConfig;

  if (!property) {
    throw new Error(
      `Block filter requires a "property" field, got: ${JSON.stringify(filterConfig)}`,
    );
  }

  if (includes === undefined && equals === undefined) {
    throw new Error(
      `Block filter requires an operator ("includes" or "equals"), got: ${JSON.stringify(filterConfig)}`,
    );
  }

  return items.filter((item) => {
    const value = getNestedProperty(item, property);
    if (value === undefined || value === null) return false;
    const stringValue = String(value);
    if (includes !== undefined) return stringValue.includes(includes);
    if (equals !== undefined) return stringValue === equals;
    return true;
  });
};

export { filterItems };
