/**
 * Helpers for the right-content sidebar rendered by base.html.
 *
 * The sidebar is a ~16rem column, so the same block types that are banned
 * inside block-columns layouts (full-viewport-width and split-* types) are
 * banned here too.
 */

import { assertColumnSafeTypes, toBlockArray } from "#utils/block-columns.js";

/**
 * @typedef {{ type: string } & Record<string, unknown>} Block
 */

/**
 * Validates that every sidebar block type is safe inside a narrow column.
 * Returns the blocks unchanged so it can be used as a pass-through filter.
 *
 * @param {Block[] | undefined | null} blocks
 * @returns {Block[]}
 */
export const validateSidebarBlocks = (blocks) => {
  const safeBlocks = toBlockArray(blocks);
  assertColumnSafeTypes(
    safeBlocks.map(({ type }) => type),
    "the right-content sidebar",
  );
  return safeBlocks;
};

/**
 * When the two-column sidebar is active and a page's first block is an
 * image-background banner, hoist it out of the page-columns grid so it spans
 * content + sidebar. Otherwise everything stays in `rest`.
 *
 * @param {Block[] | undefined | null} blocks
 * @param {boolean} hasRightContent
 * @returns {{ banner: Block[], rest: Block[] }}
 */
export const splitHoistedBanner = (blocks, hasRightContent) => {
  const safeBlocks = toBlockArray(blocks);
  const [first, ...rest] = safeBlocks;
  if (!hasRightContent || first?.type !== "image-background") {
    return { banner: [], rest: safeBlocks };
  }
  return { banner: [first], rest };
};
