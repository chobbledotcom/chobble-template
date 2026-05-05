/**
 * Resolves a dot-notation property path on an object.
 * @param {Record<string, unknown>} obj
 * @param {string} path
 * @returns {unknown}
 */
const getNestedProperty = (obj, path) =>
  path
    .split(".")
    .reduce(
      (current, part) =>
        current === undefined || current === null
          ? undefined
          : /** @type {Record<string, unknown>} */ (current)[part],
      /** @type {unknown} */ (obj),
    );

/**
 * @typedef {object} FilterConfig
 * @property {string} property - Dot-notation path (e.g. "url", "data.title")
 * @property {string} [includes] - Value the property must contain
 * @property {string} [equals] - Value the property must exactly match
 */

/**
 * Match a single non-array value against a filter config.
 * @param {unknown} value
 * @param {FilterConfig} filterConfig
 */
const matchesValue = (value, filterConfig) => {
  const stringValue = String(value);
  if (filterConfig.includes !== undefined)
    return stringValue.includes(filterConfig.includes);
  return stringValue === filterConfig.equals;
};

/**
 * Filters a collection of Eleventy items based on a filter config object.
 *
 * When the resolved property value is an array, the filter matches if any
 * element matches the operator (per-element exact match for `equals`,
 * per-element substring for `includes`).
 *
 * @param {Record<string, unknown>[]} items - Eleventy collection items
 * @param {FilterConfig} filterConfig - Filter configuration
 * @returns {Record<string, unknown>[]} Filtered items
 */
const filterItems = (items, filterConfig) => {
  if (!filterConfig) return items;

  if (!filterConfig.property) {
    throw new Error(
      `Block filter requires a "property" field, got: ${JSON.stringify(filterConfig)}`,
    );
  }

  if (
    filterConfig.includes === undefined &&
    filterConfig.equals === undefined
  ) {
    throw new Error(
      `Block filter requires an operator ("includes" or "equals"), got: ${JSON.stringify(filterConfig)}`,
    );
  }

  return items.filter((item) => {
    const value = getNestedProperty(item, filterConfig.property);
    if (value === undefined || value === null) return false;
    if (Array.isArray(value))
      return value.some((v) => matchesValue(v, filterConfig));
    return matchesValue(value, filterConfig);
  });
};

export { filterItems, getNestedProperty };
