import { filter, map, pipe, sort } from "#toolkit/fp/array.js";

const listSeparator = (total) => (index) => {
  if (index === total - 1) return "";
  if (index === total - 2) return " and ";
  return ", ";
};

const prepareItemsTextList = (collection, currentUrl) => {
  if (!collection?.length) return [];

  const filtered = pipe(
    filter((item) => item.url !== currentUrl),
    sort((a, b) => a.data.title.localeCompare(b.data.title)),
  )(collection);

  const separator = listSeparator(filtered.length);

  return pipe(
    map((item, index) => ({
      url: item.url,
      name: item.data.title,
      separator: separator(index),
    })),
  )(filtered);
};

const configureItemsTextList = (eleventyConfig) => {
  eleventyConfig.addFilter("prepareItemsTextList", prepareItemsTextList);
};

export { configureItemsTextList };
