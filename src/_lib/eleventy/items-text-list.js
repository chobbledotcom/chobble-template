import { filter, map, pipe, sort } from "#toolkit/fp/array.js";

const prepareItemsTextList = (collection, currentUrl) => {
  if (!collection?.length) return [];

  const filtered = pipe(
    filter((item) => item.url !== currentUrl),
    sort((a, b) => a.data.title.localeCompare(b.data.title)),
  )(collection);

  const separator = (index) => {
    if (index === filtered.length - 1) return "";
    if (index === filtered.length - 2) return " and ";
    return ", ";
  };

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
