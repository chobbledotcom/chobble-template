import { getBlockContainerWidth } from "#utils/block-schema.js";

/** @param {{ addFilter: Function }} eleventyConfig */
export const configureBlocks = (eleventyConfig) => {
  eleventyConfig.addFilter("blockContainerWidth", getBlockContainerWidth);
};
