import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";
import {
  BLOCK_CONSUMES_PAGE_CONTENT,
  getBlockContainerWidth,
} from "#utils/block-schema.js";

const DESIGN_SYSTEM_LAYOUT = "design-system-base.html";

/**
 * Throws if a `design-system-base.html` page has body content but no block
 * in its blocks list consumes it. Body content must be expressed as a
 * `markdown` (or other content-consuming) block; the auto-fallback that
 * used to render trailing body content was removed when the `content`
 * block was retired.
 *
 * @param {string} content
 * @param {Array<{ type?: string, consumesPageContent?: boolean }> | undefined} blocks
 * @param {string | undefined} layout
 * @param {string | undefined} inputPath
 * @returns {string} Empty string (used as a no-output assertion).
 */
const validatePageBodyContent = (content, blocks, layout, inputPath) => {
  if (layout !== DESIGN_SYSTEM_LAYOUT) return "";
  if (!content || content.trim() === "") return "";
  const consumed = Array.isArray(blocks)
    ? blocks.some(
        (b) =>
          b?.consumesPageContent === true ||
          (b?.type && BLOCK_CONSUMES_PAGE_CONTENT[b.type] === true),
      )
    : false;
  if (consumed) return "";
  throw new Error(
    `${inputPath}: uses ${DESIGN_SYSTEM_LAYOUT} and has body content, but no block in its 'blocks' list consumes it. Move the body content into a 'markdown' block in frontmatter, or add a block whose schema declares 'consumesPageContent: true'.`,
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
