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
 * @typedef {{ data?: { order?: number } }} OrderedItem
 */

/**
 * Default order extractor used when callers don't supply one.
 * Assumes the item has the standard Eleventy `data.order` shape;
 * missing orders sort as 0.
 *
 * @param {OrderedItem} item
 * @returns {number}
 */
const defaultOrder = (item) => {
  const order = item?.data?.order;
  return typeof order === "number" ? order : 0;
};

/**
 * Generator that yields items sorted by order, lazily.
 * For small lists just sorts eagerly (overhead of lazy approach not worth it).
 * For larger lists, the consumer can stop iteration early.
 *
 * @template {OrderedItem} T
 * @param {T[] | null | undefined} items - Items to sort and yield
 * @param {(item: T) => number} [getOrder] - Order extraction function
 * @returns {Generator<T>}
 */
function* yieldSorted(items, getOrder = defaultOrder) {
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
 * @returns {Generator<T>}
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
 * @template {OrderedItem} T
 * @param {T[] | null | undefined} children - Child items to search
 * @param {(item: T) => string | null | undefined} getThumbnail - Extract thumbnail
 * @param {(item: T) => number} [getOrder] - Extract sort order
 * @returns {Generator<string>}
 */
function* yieldFromChildren(children, getThumbnail, getOrder = defaultOrder) {
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
 * @template {OrderedItem} T
 * @param {T[] | null | undefined} children - Child items to search
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
const findFromChildren = (children, getThumbnail, getOrder = defaultOrder) =>
  first(yieldFromChildren(children, getThumbnail, getOrder));

export { findFirst, findFromChildren };
