import {
  filter,
  flatMap,
  map,
  pipe,
  sort,
  unique,
} from "#utils/array-utils.js";

/**
 * Extract unique tags from a collection
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} collection - Eleventy collection items
 * @returns {string[]} Sorted array of unique tag strings
 *
 * Eleventy guarantees: Collection items always have a `data` property.
 * Therefore, no optional chaining needed on `page.data`.
 * See: src/_lib/types/index.d.ts EleventyCollectionItem type definition
 */
const extractTags = (collection) =>
  pipe(
    filter((page) => page.url && !page.data.no_index),
    flatMap((page) => page.data.tags || []),
    filter((x) => x !== null && x !== undefined),
    map((tag) => String(tag).trim()),
    filter((tag) => tag !== ""),
    unique,
    sort((a, b) => a.localeCompare(b)),
  )(collection);

const configureTags = (eleventyConfig) => {
  eleventyConfig.addFilter("tags", extractTags);
};

export { extractTags, configureTags };
