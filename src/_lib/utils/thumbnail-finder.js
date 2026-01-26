/**
 * Thumbnail resolution utilities with lazy evaluation
 *
 * Provides composable functions for finding thumbnails with fallback
 * to children, using generators to minimize work when searching
 * large hierarchies.
 *
 * @module #utils/thumbnail-finder
 */

import { sortBy } from "#toolkit/fp/array.js";

/**
 * Standard order extraction for items with data.order.
 * @param {{data?: {order?: number}}} item
 * @returns {number | undefined}
 */
const getItemOrder = (item) => item?.data?.order;

/**
 * Generator that yields items sorted by order, lazily.
 * For small lists just sorts eagerly (overhead of lazy approach not worth it).
 * For larger lists, the consumer can stop iteration early.
 *
 * @template T
 * @param {T[]} items - Items to sort and yield
 * @param {(item: T) => number} [getOrder] - Order extraction function
 * @yields {T} Items in sorted order
 */
function* yieldSorted(items, getOrder = getItemOrder) {
  if (!items?.length) return;
  yield* sortBy(getOrder)(items);
}

/**
 * Generator that yields the first non-null value from lazy sources.
 * Each source is a thunk (zero-argument function) that returns a value.
 * Evaluation stops as soon as a non-null value is found.
 *
 * @template T
 * @param {Array<() => T | null | undefined>} sources - Thunks returning values
 * @yields {T} First non-null value (if any)
 *
 * @example
 * // Lazy evaluation - only calls sources until one returns a value
 * const thumbnail = first(yieldFromSources([
 *   () => item.data.thumbnail,
 *   () => item.data.gallery?.[0],
 *   () => computeExpensiveFallback(),
 * ]));
 */
function* yieldFromSources(sources) {
  for (const source of sources) {
    const value = source();
    if (value != null) {
      yield value;
      return;
    }
  }
}

/**
 * Get the first value from a generator, or undefined if empty.
 *
 * @template T
 * @param {Generator<T>} generator
 * @returns {T | undefined}
 */
const first = (generator) => {
  const result = generator.next();
  return result.done ? undefined : result.value;
};

/**
 * Find the first non-null value from lazy sources.
 * Evaluates sources in order, stopping at the first non-null value.
 *
 * @template T
 * @param {...(() => T | null | undefined)} sources - Thunks returning values
 * @returns {T | undefined} First non-null value
 *
 * @example
 * const thumbnail = findFirst(
 *   () => item.data.thumbnail,
 *   () => item.data.gallery?.[0],
 *   () => item.data.header_image,
 * );
 */
const findFirst = (...sources) => first(yieldFromSources(sources));

/**
 * Generator that yields thumbnails from sorted children.
 * Searches children in order, yielding the first valid thumbnail found.
 *
 * @template T
 * @param {T[]} children - Child items to search
 * @param {(item: T) => string | null | undefined} getThumbnail - Extract thumbnail
 * @param {(item: T) => number} [getOrder] - Extract sort order
 * @yields {string} First valid thumbnail (if any)
 */
function* yieldFromChildren(children, getThumbnail, getOrder = getItemOrder) {
  for (const child of yieldSorted(children, getOrder)) {
    const thumbnail = getThumbnail(child);
    if (thumbnail != null) {
      yield thumbnail;
      return;
    }
  }
}

/**
 * Find the first thumbnail from sorted children.
 * Children are sorted by order, then searched lazily.
 *
 * @template T
 * @param {T[]} children - Child items to search
 * @param {(item: T) => string | null | undefined} getThumbnail - Extract thumbnail
 * @param {(item: T) => number} [getOrder] - Extract sort order
 * @returns {string | undefined} First thumbnail found
 *
 * @example
 * const thumbnail = findFromChildren(
 *   category.children,
 *   (child) => thumbnailLookup[child.fileSlug],
 *   (child) => child.data.order ?? 0
 * );
 */
const findFromChildren = (children, getThumbnail, getOrder = getItemOrder) =>
  first(yieldFromChildren(children, getThumbnail, getOrder));

export { findFirst, findFromChildren };
