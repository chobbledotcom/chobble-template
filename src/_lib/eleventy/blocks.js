import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";
import { getBlockContainerWidth } from "#utils/block-schema.js";

/** @param {{ addFilter: Function }} eleventyConfig */
export const configureBlocks = (eleventyConfig) => {
  eleventyConfig.addFilter("blockContainerWidth", getBlockContainerWidth);
  eleventyConfig.addFilter(
    "splitBlocksForColumns",
    /**
     * @param {Array<{ type: string } & Record<string, unknown>> | undefined} blocks
     * @param {string[] | undefined} tags
     * @param {Record<string, unknown> | undefined} layouts
     */
    (blocks, tags, layouts) =>
      splitBlocksForColumns(blocks, getLayoutForTags(tags, layouts)),
  );
};
