import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";
import { getBlockContainerWidth } from "#utils/block-schema.js";

const DESIGN_SYSTEM_LAYOUT = "design-system-base.html";

/**
 * Throws if a `design-system-base.html` page has any body content. All
 * content on a design-system-base page must be expressed as blocks in
 * frontmatter (use a `markdown` block for prose).
 *
 * @param {string} content
 * @param {string | undefined} layout
 * @param {string | undefined} inputPath
 * @returns {string} Empty string (used as a no-output assertion).
 */
const validatePageBodyContent = (content, layout, inputPath) => {
  if (layout !== DESIGN_SYSTEM_LAYOUT) return "";
  if (!content || content.trim() === "") return "";
  throw new Error(
    `${inputPath}: uses ${DESIGN_SYSTEM_LAYOUT} but has body content. Move it into a 'markdown' block in frontmatter — design-system-base pages must express all content as blocks.`,
  );
};

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
  eleventyConfig.addFilter("validatePageBodyContent", validatePageBodyContent);
};
