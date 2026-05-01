/**
 * Thumbnail resolver helpers for hierarchical collections.
 *
 * @module #collections/thumbnail-resolvers
 */

import { findFirst, findFromChildren } from "#utils/thumbnail-finder.js";

/**
 * Create a recursive thumbnail resolver that walks child items.
 *
 * @template {{fileSlug: string, data?: {order?: number}}} T
 * @param {object} options
 * @param {Map<string, T[]>} options.childrenByParent
 * @param {(item: T) => string | null | undefined} options.getOwnThumbnail
 * @param {(item: T) => string | null | undefined} [options.getFallbackThumbnail]
 * @param {(item: T) => string} [options.getKey]
 * @returns {(item: T) => string | undefined}
 */
const createChildThumbnailResolver = ({
  childrenByParent,
  getOwnThumbnail,
  getFallbackThumbnail,
  getKey = (item) => item.fileSlug,
}) => {
  /**
   * @param {T} item
   * @returns {string | undefined}
   */
  const resolve = (item) =>
    findFirst(
      () => getOwnThumbnail(item),
      () => findFromChildren(childrenByParent.get(getKey(item)), resolve),
      () => (getFallbackThumbnail ? getFallbackThumbnail(item) : undefined),
    );

  return resolve;
};

export { createChildThumbnailResolver };
