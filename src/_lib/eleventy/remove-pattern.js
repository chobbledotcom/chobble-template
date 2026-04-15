/**
 * Remove matches of a regex pattern from a string and trim the result.
 *
 * Used by the link-columns block so authors can strip repetitive text
 * (e.g. `"Service in "` from titles like "Service in Town A") without
 * editing the source item titles.
 *
 * @param {string} str - Source string.
 * @param {string} pattern - JavaScript regex source (global flag is applied).
 * @returns {string} String with all matches removed and whitespace trimmed.
 *   Returns the input unchanged if `pattern` is falsy.
 */
const removePattern = (str, pattern) => {
  if (!pattern) return str;
  return str.replace(new RegExp(pattern, "g"), "").trim();
};

/** @param {*} eleventyConfig */
const configureRemovePattern = (eleventyConfig) => {
  eleventyConfig.addFilter("removePattern", removePattern);
};

export { configureRemovePattern, removePattern };
