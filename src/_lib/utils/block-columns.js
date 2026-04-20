/**
 * Splits a page's blocks into a multi-column first section plus a
 * full-width "rest" list, based on a per-collection layout config.
 *
 * The config shape (per collection tag) is:
 *   { columns: [ { types: ["gallery"] }, { types: ["markdown", ...] } ] }
 *
 * Matching rules:
 *   - Only the FIRST block of each listed type is claimed by its column.
 *   - Any further blocks of the same type fall through to `rest`.
 *   - Blocks whose type is not listed in any column fall through to `rest`.
 *   - `rest` preserves the original block order.
 *   - If no blocks match any column, columns mode is disabled (returns
 *     columns: null so the template falls back to the default layout).
 */

// Block types that must not be placed inside a column layout, either because
// they need full viewport width or because they already use a two-pane layout.
const COLUMN_DISALLOWED_TYPES = [
  "hero",
  "video-background",
  "bunny-video-background",
  "image-background",
  "marquee-images",
];

const isSafeInColumn = (type) =>
  !COLUMN_DISALLOWED_TYPES.includes(type) && !type.startsWith("split-");

/**
 * Finds the first layout config that matches one of the page's tags.
 * Tags are checked in order; first match wins.
 *
 * @param {string[] | undefined} tags
 * @param {Record<string, unknown> | undefined} allLayouts
 * @returns {{ columns: Array<{ types: string[] }> } | null}
 */
export const getLayoutForTags = (tags, allLayouts) => {
  if (!Array.isArray(tags) || !allLayouts) return null;
  for (const tag of tags) {
    const entry = allLayouts[tag];
    if (entry && typeof entry === "object" && Array.isArray(entry.columns)) {
      return entry;
    }
  }
  return null;
};

/**
 * @param {Array<{ types?: string[] }>} layoutCols
 * @returns {Array<{ type: string, ci: number }>}
 */
const collectLayoutEntries = (layoutCols) =>
  layoutCols.flatMap((col, ci) => {
    const types = Array.isArray(col?.types) ? col.types : [];
    return types.map((type) => ({ type, ci }));
  });

/**
 * @param {Array<{ type: string, ci: number }>} entries
 */
const validateLayoutEntries = (entries) => {
  const disallowed = entries.find(({ type }) => !isSafeInColumn(type));
  if (disallowed) {
    throw new Error(
      `Block type "${disallowed.type}" is not supported inside a block-columns layout.`,
    );
  }
  const types = entries.map(({ type }) => type);
  const duplicate = types.find((t, i) => types.indexOf(t) !== i);
  if (duplicate) {
    throw new Error(
      `Block type "${duplicate}" is listed in multiple columns; each type may appear in only one column.`,
    );
  }
};

/**
 * @typedef {{ type: string } & Record<string, unknown>} Block
 */

/**
 * Returns a parallel array of column indices (-1 = not claimed). Only the
 * FIRST occurrence of each matched type gets a non-negative assignment.
 *
 * @param {Block[]} blocks
 * @param {Record<string, number>} typeToColumn
 * @returns {number[]}
 */
const computeAssignments = (blocks, typeToColumn) =>
  blocks.map((block, i) => {
    const ci = typeToColumn[block.type];
    if (ci === undefined) return -1;
    const firstIndex = blocks.findIndex((b) => b.type === block.type);
    return firstIndex === i ? ci : -1;
  });

/**
 * @param {Block[] | undefined} blocks
 * @param {{ columns: Array<{ types: string[] }> } | null} layout
 * @returns {{ columns: Block[][] | null, rest: Block[] }}
 */
export const splitBlocksForColumns = (blocks, layout) => {
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const layoutCols = layout?.columns;
  if (!Array.isArray(layoutCols) || layoutCols.length === 0) {
    return { columns: null, rest: safeBlocks };
  }
  const entries = collectLayoutEntries(layoutCols);
  validateLayoutEntries(entries);
  const typeToColumn = Object.fromEntries(
    entries.map(({ type, ci }) => [type, ci]),
  );
  const assignments = computeAssignments(safeBlocks, typeToColumn);
  if (!assignments.some((a) => a >= 0)) {
    return { columns: null, rest: safeBlocks };
  }
  const columns = layoutCols.map((_, i) =>
    safeBlocks.filter((_, bi) => assignments[bi] === i),
  );
  const rest = safeBlocks.filter((_, i) => assignments[i] === -1);
  return { columns, rest };
};
