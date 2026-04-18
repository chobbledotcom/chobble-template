/**
 * Split a string into ordered segments around `#hashtag` matches so a template
 * can wrap the tag segments in markup (e.g. a muted span) without any HTML
 * being constructed in JS.
 *
 * @param {string} str - Source string.
 * @returns {Array<{ text: string, isTag: boolean }>} Ordered segments. Tag
 *   segments include the leading `#`. Returns an empty array for non-string or
 *   empty input.
 */
const splitHashtags = (str) => {
  if (typeof str !== "string" || str === "") return [];
  // Capturing group keeps matches in the split output at odd indexes.
  return str
    .split(/(#\w+)/)
    .map((text, index) => ({ text, isTag: index % 2 === 1 }))
    .filter((segment) => segment.text !== "");
};

/** @param {*} eleventyConfig */
const configureWrapHashtags = (eleventyConfig) => {
  eleventyConfig.addFilter("splitHashtags", splitHashtags);
};

export { configureWrapHashtags, splitHashtags };
