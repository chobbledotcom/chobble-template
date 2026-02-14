/**
 * Tags collection and filters
 *
 * @module #collections/tags
 */

import { addDataFilter } from "#eleventy/add-data-filter.js";
import { filter, flatMap, map, pipe, sort, unique } from "#toolkit/fp/array.js";
import { compareStrings } from "#toolkit/fp/sorting.js";

/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */

/**
 * Extract unique tags from a collection.
 *
 * Eleventy guarantees: Collection items always have a `data` property,
 * and `data.tags` is always an array (empty if no tags).
 * See: BaseItemData type definition in eleventy.d.ts
 *
 * @param {EleventyCollectionItem[]} collection - Eleventy collection items
 * @returns {string[]} Sorted array of unique tag strings
 */
const extractTags = (collection) =>
  pipe(
    filter((page) => page.url && !page.data.no_index),
    flatMap((page) => page.data.tags),
    filter((tag) => tag !== null && tag !== undefined),
    map((tag) => String(tag).trim()),
    filter((tag) => tag !== ""),
    unique,
    sort(compareStrings),
  )(collection);

/**
 * Configure tags filter for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureTags = (eleventyConfig) => {
  addDataFilter(eleventyConfig, "tags", extractTags);
};

export { extractTags, configureTags };
