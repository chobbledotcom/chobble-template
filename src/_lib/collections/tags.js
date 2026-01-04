import {
  filter,
  flatMap,
  map,
  pipe,
  sort,
  unique,
} from "#utils/array-utils.js";

const notNullish = (x) => x !== null && x !== undefined;

const extractTags = (collection) => {
  if (!collection) return [];

  return pipe(
    filter((page) => page.url && !page.data?.no_index),
    flatMap((page) => page.data?.tags || []),
    filter(notNullish),
    map((tag) => String(tag).trim()),
    filter((tag) => tag !== ""),
    unique,
    sort((a, b) => a.localeCompare(b)),
  )(collection);
};

const configureTags = (eleventyConfig) => {
  eleventyConfig.addFilter("tags", extractTags);
};

export { extractTags, configureTags };
