/**
 * Splits a page's blocks into an optional "before" section, a multi-column
 * middle section, and a full-width "rest" list, based on a per-collection
 * layout config.
 *
 * The config shape (per collection tag) is:
 *   {
 *     before: ["hero", "markdown"],
 *     columns: [ { types: ["gallery"] }, { types: ["markdown", ...] } ]
 *   }
 *
 * Both keys are optional. `before` is a single claim queue; `columns` is an
 * array of claim queues (one per column).
 *
 * Matching rules:
 *   - `before` runs first. Each listed type claims the first unclaimed block
 *     of that type (in block order). Claimed blocks render full-width above
 *     the columns section, in the order they were claimed.
 *   - Columns are processed after `before`. Each column's `types` list is a
 *     claim queue processed in order; columns themselves are processed in
 *     order; for each listed type the first unclaimed block of that type
 *     (in block order) is taken.
 *   - Blocks within a column appear in the order their slots were listed in
 *     the config, not the page's block order.
 *   - Unclaimed blocks fall through to `rest`, preserving original order.
 *   - If no blocks match any column, columns mode is disabled (returns
 *     columns: null so the template falls back to the default layout).
 *   - Full-width types (hero, *-background, marquee-images) and split-* types
 *     are allowed inside `before` but disallowed inside `columns`.
 */

// Block types that must not be placed inside a column layout, either because
// they need full viewport width or because they already use a two-pane layout.
// Additionally, every `split-*` block type is disallowed (checked dynamically).
export const COLUMN_DISALLOWED_TYPES = [
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
 * @typedef {{
 *   before?: string[],
 *   columns?: Array<{ types: string[] }>
 * }} ColumnLayout
 */

/**
 * @param {unknown} entry
 * @returns {entry is ColumnLayout}
 */
const isColumnLayout = (entry) => {
  if (!entry || typeof entry !== "object") return false;
  const hasColumns = "columns" in entry && Array.isArray(entry.columns);
  const hasBefore = "before" in entry && Array.isArray(entry.before);
  return hasColumns || hasBefore;
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

/**
 * Walks slots in order and records which block each slot claims. A slot
 * claims the first block whose `type` matches it and whose index has not
 * already been used by an earlier slot (or a prior matching pass, via
 * `usedIndices`). Slots with no matching block are skipped silently.
 *
 * @param {Block[]} blocks
 * @param {Array<{ type: string, ci: number }>} slots
 * @param {number[]} usedIndices
 * @returns {MatchState}
 */
const matchSlotsToBlocks = (blocks, slots, usedIndices = []) =>
  slots.reduce(
    (acc, slot) => {
      const idx = blocks.findIndex(
        (b, i) => b.type === slot.type && !acc.used.includes(i),
      );
      if (idx === -1) return acc;
      return {
        used: acc.used.concat(idx),
        claims: acc.claims.concat({ blockIndex: idx, ci: slot.ci }),
      };
    },
    /** @type {MatchState} */ ({ used: usedIndices, claims: [] }),
  );

/**
 * @param {string[] | undefined} beforeTypes
 * @returns {Array<{ type: string, ci: number }>}
 */
const collectBeforeSlots = (beforeTypes) =>
  Array.isArray(beforeTypes)
    ? beforeTypes.map((type) => ({ type, ci: 0 }))
    : [];

/**
 * @param {Block[]} safeBlocks
 * @param {Array<{ types: string[] }> | null} layoutCols
 * @param {number[]} usedBefore
 * @returns {{ columns: Block[][] | null, used: number[] }}
 */
const buildColumns = (safeBlocks, layoutCols, usedBefore) => {
  /** @type {{ columns: Block[][] | null, used: number[] }} */
  const fallback = { columns: null, used: usedBefore };
  if (!layoutCols || layoutCols.length === 0) return fallback;
  const columnSlots = collectLayoutSlots(layoutCols);
  validateLayoutSlots(columnSlots);
  const columnState = matchSlotsToBlocks(safeBlocks, columnSlots, usedBefore);
  if (columnState.claims.length === 0) return fallback;
  const columns = layoutCols.map((_, ci) =>
    columnState.claims
      .filter((c) => c.ci === ci)
      .map((c) => safeBlocks[c.blockIndex]),
  );
  return { columns, used: columnState.used };
};

/**
 * @param {Block[] | undefined} blocks
 * @param {ColumnLayout | null} layout
 * @returns {{ before: Block[], columns: Block[][] | null, rest: Block[] }}
 */
export const splitBlocksForColumns = (blocks, layout) => {
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const beforeSlots = collectBeforeSlots(layout?.before);
  const layoutCols = Array.isArray(layout?.columns) ? layout.columns : null;
  if (beforeSlots.length === 0 && !layoutCols) {
    return { before: [], columns: null, rest: safeBlocks };
  }
  const beforeState = matchSlotsToBlocks(safeBlocks, beforeSlots);
  const before = beforeState.claims.map((c) => safeBlocks[c.blockIndex]);
  const { columns, used } = buildColumns(
    safeBlocks,
    layoutCols,
    beforeState.used,
  );
  const rest = safeBlocks.filter((_, i) => !used.includes(i));
  return { before, columns, rest };
};
