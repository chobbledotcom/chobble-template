import { registerFilters } from "#eleventy/register.js";
import {
  getLayoutForTags,
  splitBlocksForColumns,
} from "#utils/block-columns.js";
import {
  getBlockContainerWidth,
  getBlockTemplate,
} from "#utils/block-schema.js";
import { splitHoistedBanner } from "#utils/sidebar-blocks.js";

const BASE_LAYOUTS = ["base.html", "base"];

/**
 * Passes through content from intermediate layouts unchanged. For pages that
 * use the base layout directly, throws if there is body content — direct
 * users must express all content as blocks in frontmatter.
 *
 * @param {string} content
 * @param {string | undefined} layout
 * @param {string | undefined} inputPath
 * @returns {string} Content string, or empty string for base layout pages.
 */
const validatePageBodyContent = (content, layout, inputPath) => {
  if (!layout || !BASE_LAYOUTS.includes(layout)) return content;
  if (!content || content.trim() === "") return "";
  throw new Error(
    `${inputPath}: uses base.html but has body content. Move it into a 'markdown' block in frontmatter — base layout pages must express all content as blocks.`,
  );
};

/**
 * Wrap splitBlocksForColumns so the columns-per-layout lookup resolves from
 * the page's tags and layouts, as the filter registration requires.
 * @param {Array<{ type: string } & Record<string, unknown>> | undefined} blocks
 * @param {string[] | undefined} tags
 * @param {Record<string, unknown> | undefined} layouts
 */
export const splitBlocksForLayout = (blocks, tags, layouts) =>
  splitBlocksForColumns(blocks, getLayoutForTags(tags, layouts));

/** @param {{ addFilter: Function }} eleventyConfig */
export const configureBlocks = (eleventyConfig) =>
  registerFilters(eleventyConfig)({
    blockContainerWidth: getBlockContainerWidth,
    blockTemplate: getBlockTemplate,
    splitBlocksForColumns: splitBlocksForLayout,
    validatePageBodyContent,
    splitHoistedBanner: splitHoistedBanner,
  });
