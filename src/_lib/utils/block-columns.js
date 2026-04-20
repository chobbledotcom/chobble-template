/**
 * Splits a page's blocks into a multi-column first section plus a
 * full-width "rest" list, based on a per-collection layout config.
 *
 * The config shape (per collection tag) is:
 *   { columns: [ { types: ["gallery"] }, { types: ["markdown", ...] } ] }
 *
 * Matching rules:
 *   - Each column's `types` list is a claim queue processed in order.
 *     Listing the same type twice claims two blocks of that type.
 *   - Columns are processed in order; for each listed type the first
 *     unclaimed block of that type (in block order) is taken.
 *   - Blocks within a column appear in the order their slots were
 *     listed in the config, not the page's block order.
 *   - Unclaimed blocks fall through to `rest`, preserving original order.
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

/** @param {string} type */
const isSafeInColumn = (type) =>
  !COLUMN_DISALLOWED_TYPES.includes(type) && !type.startsWith("split-");

/**
 * @typedef {{ columns: Array<{ types: string[] }> }} ColumnLayout
 */

/**
 * @param {unknown} entry
 * @returns {entry is ColumnLayout}
 */
const isColumnLayout = (entry) => {
  if (!entry || typeof entry !== "object") return false;
  if (!("columns" in entry)) return false;
  return Array.isArray(entry.columns);
};

/**
 * Finds the first layout config that matches one of the page's tags.
 * Tags are checked in order; first match wins.
 *
 * @param {string[] | undefined} tags
 * @param {Record<string, unknown> | undefined} allLayouts
 * @returns {ColumnLayout | null}
 */
export const getLayoutForTags = (tags, allLayouts) => {
  if (!Array.isArray(tags) || !allLayouts) return null;
  for (const tag of tags) {
    const entry = allLayouts[tag];
    if (isColumnLayout(entry)) return entry;
  }
  return null;
};

/**
 * Flattens a layout config into an ordered sequence of (type, columnIndex)
 * slots. Each entry in a column's `types` list becomes one slot.
 *
 * @param {Array<{ types?: string[] }>} layoutCols
 * @returns {Array<{ type: string, ci: number }>}
 */
const collectLayoutSlots = (layoutCols) =>
  layoutCols.flatMap((col, ci) => {
    const types = Array.isArray(col?.types) ? col.types : [];
    return types.map((type) => ({ type, ci }));
  });

/**
 * @param {Array<{ type: string, ci: number }>} slots
 */
const validateLayoutSlots = (slots) => {
  const disallowed = slots.find(({ type }) => !isSafeInColumn(type));
  if (disallowed) {
    throw new Error(
      `Block type "${disallowed.type}" is not supported inside a block-columns layout.`,
    );
  }
};

/**
 * @typedef {{ type: string } & Record<string, unknown>} Block
 * @typedef {{ blockIndex: number, ci: number }} Claim
 * @typedef {{ used: number[], claims: Claim[] }} MatchState
 */

/** @type {() => MatchState} */
const emptyMatchState = () => ({ used: [], claims: [] });

/**
 * Walks slots in order and records which block each slot claims. A slot
 * claims the first block whose `type` matches it and whose index has not
 * already been used by an earlier slot. Slots with no matching block are
 * skipped silently.
 *
 * @param {Block[]} blocks
 * @param {Array<{ type: string, ci: number }>} slots
 * @returns {MatchState}
 */
const matchSlotsToBlocks = (blocks, slots) =>
  slots.reduce((acc, slot) => {
    const idx = blocks.findIndex(
      (b, i) => b.type === slot.type && !acc.used.includes(i),
    );
    if (idx === -1) return acc;
    return {
      used: acc.used.concat(idx),
      claims: acc.claims.concat({ blockIndex: idx, ci: slot.ci }),
    };
  }, emptyMatchState());

/**
 * @param {Block[] | undefined} blocks
 * @param {ColumnLayout | null} layout
 * @returns {{ columns: Block[][] | null, rest: Block[] }}
 */
export const splitBlocksForColumns = (blocks, layout) => {
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const layoutCols = layout?.columns;
  if (!Array.isArray(layoutCols) || layoutCols.length === 0) {
    return { columns: null, rest: safeBlocks };
  }
  const slots = collectLayoutSlots(layoutCols);
  validateLayoutSlots(slots);
  const { claims, used } = matchSlotsToBlocks(safeBlocks, slots);
  if (claims.length === 0) return { columns: null, rest: safeBlocks };
  const columns = layoutCols.map((_, ci) =>
    claims.filter((c) => c.ci === ci).map((c) => safeBlocks[c.blockIndex]),
  );
  const rest = safeBlocks.filter((_, i) => !used.includes(i));
  return { columns, rest };
};
