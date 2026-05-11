import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";
import {
  getBlockContainerWidth,
  getBlockTemplate,
} from "#utils/block-schema.js";

const DESIGN_SYSTEM_LAYOUT = "design-system-base.html";

/**
 * Passes through content from intermediate layouts unchanged. For pages that
 * directly specify `layout: design-system-base.html`, throws if there is body
 * content — direct users must express all content as blocks in frontmatter.
 *
 * @param {string} content
 * @param {string | undefined} layout
 * @param {string | undefined} inputPath
 * @returns {string} Content string, or empty string for direct design-system-base pages.
 */
const validatePageBodyContent = (content, layout, inputPath) => {
  if (layout !== DESIGN_SYSTEM_LAYOUT) return content;
  if (!content || content.trim() === "") return "";
  throw new Error(
    `${inputPath}: uses ${DESIGN_SYSTEM_LAYOUT} but has body content. Move it into a 'markdown' block in frontmatter — design-system-base pages must express all content as blocks.`,
  );
};

/** @param {{ addFilter: Function }} eleventyConfig */
export const configureBlocks = (eleventyConfig) => {
  eleventyConfig.addFilter("blockContainerWidth", getBlockContainerWidth);
  eleventyConfig.addFilter("blockTemplate", getBlockTemplate);
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
