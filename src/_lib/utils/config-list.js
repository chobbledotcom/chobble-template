/**
 * Resolve config-provided lists with a default fallback.
 */

/**
 * Resolve config list to a default list when empty or invalid.
 * @param {unknown} configList
 * @param {string[]} defaultList
 * @returns {string[]}
 */
const resolveConfigList = (configList, defaultList) =>
  Array.isArray(configList) && configList.length > 0 ? configList : defaultList;

export { resolveConfigList };
