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
 * Standard order extraction for Eleventy collection items.
 * @param {import("#lib/types").EleventyCollectionItem} item
 * @returns {number}
 */
const getItemOrder = (item) => item.data?.order ?? 0;

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

/**
 * Generator that yields the first thumbnail from a hierarchy.
 * Checks own thumbnail first, then recursively searches children in order.
 * Yields at most one value - the first thumbnail found.
 *
 * @template T
 * @param {T} item - Item to get thumbnail from
 * @param {(item: T) => string | null | undefined} getThumbnail - Extract thumbnail
 * @param {(item: T) => T[] | null | undefined} getChildren - Extract children
 * @param {(item: T) => number} [getOrder] - Extract sort order
 * @yields {string} First thumbnail found (at most one)
 */
function* yieldThumbnailsRecursive(
  item,
  getThumbnail,
  getChildren,
  getOrder = getItemOrder,
) {
  const own = getThumbnail(item);
  if (own != null) {
    yield own;
    return;
  }

  const children = getChildren(item);
  if (!children?.length) return;

  for (const child of yieldSorted(children, getOrder)) {
    const childGen = yieldThumbnailsRecursive(
      child,
      getThumbnail,
      getChildren,
      getOrder,
    );
    const result = childGen.next();
    if (!result.done) {
      yield result.value;
      return;
    }
  }
}

/**
 * Create a thumbnail resolver for a hierarchy with lazy child fallback.
 *
 * The resolver first checks the item's own thumbnail, then falls back
 * to sorted children. For recursive hierarchies, set recursive: true.
 *
 * @template T
 * @param {object} config
 * @param {(item: T) => string | null | undefined} config.getThumbnail - Extract thumbnail from item
 * @param {(item: T) => T[] | null | undefined} config.getChildren - Get children of item
 * @param {(item: T) => number} [config.getOrder] - Get sort order (default: data.order ?? 0)
 * @param {boolean} [config.recursive=false] - Whether to recurse into children's children
 * @returns {(item: T) => string | undefined} Resolver function
 *
 * @example
 * // Non-recursive: category -> products
 * const resolveFromProducts = createThumbnailResolver({
 *   getThumbnail: (cat) => productThumbnails[cat.fileSlug],
 *   getChildren: (cat) => childCategories.get(cat.fileSlug),
 * });
 *
 * @example
 * // Recursive: nested navigation
 * const resolveFromNav = createThumbnailResolver({
 *   getThumbnail: (nav) => nav.data.thumbnail,
 *   getChildren: (nav) => nav.children,
 *   recursive: true,
 * });
 */
const createThumbnailResolver = ({
  getThumbnail,
  getChildren,
  getOrder = getItemOrder,
  recursive = false,
}) => {
  if (recursive) {
    return (item) =>
      first(
        yieldThumbnailsRecursive(item, getThumbnail, getChildren, getOrder),
      );
  }

  return (item) => {
    const own = getThumbnail(item);
    if (own != null) return own;

    const children = getChildren(item);
    return findFromChildren(children, getThumbnail, getOrder);
  };
};

/**
 * Find thumbnail with lookup table fallback to children.
 *
 * This is the pattern used by categories: check a pre-built lookup table
 * for the item's key, and if not found, check sorted children's keys.
 *
 * @template T
 * @param {string} key - Key to look up (e.g., category slug)
 * @param {Record<string, string | undefined>} lookup - Lookup table: key -> thumbnail
 * @param {T[] | null | undefined} children - Child items to fall back to
 * @param {(child: T) => string} getChildKey - Extract key from child
 * @param {(child: T) => number} [getOrder] - Extract sort order
 * @returns {string | undefined} Thumbnail from lookup or undefined
 *
 * @example
 * const thumbnail = findWithLookupFallback(
 *   category.fileSlug,
 *   thumbnailsByCategory,
 *   childCategories.get(category.fileSlug),
 *   (child) => child.fileSlug,
 * );
 */
const findWithLookupFallback = (
  key,
  lookup,
  children,
  getChildKey,
  getOrder = getItemOrder,
) => {
  const direct = lookup[key];
  if (direct != null) return direct;

  return findFromChildren(
    children,
    (child) => lookup[getChildKey(child)],
    getOrder,
  );
};

export {
  createThumbnailResolver,
  findFirst,
  findFromChildren,
  findWithLookupFallback,
  first,
  yieldFromChildren,
  yieldFromSources,
  yieldSorted,
  yieldThumbnailsRecursive,
};
