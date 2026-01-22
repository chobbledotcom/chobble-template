/**
 * Collection lookup utilities for O(1) slug-based lookups.
 *
 * Provides a shared, memoized indexer for looking up collection items by fileSlug.
 * Uses WeakMap caching so the index is built once per collection reference and
 * automatically garbage collected when the collection is no longer used.
 *
 * @example
 * // In JavaScript:
 * import { getBySlug, indexBySlug } from "#eleventy/collection-lookup.js";
 * const product = getBySlug(collections.products, "widget-a");
 *
 * // In Liquid templates:
 * {% assign author = collections.team | getBySlug: authorSlug %}
 */

import { indexBy } from "#toolkit/fp/memoize.js";

/** @typedef {import("#lib/types").EleventyCollectionItem} EleventyCollectionItem */

/**
 * Shared slug indexer - cached per collection reference.
 * Creates a slug → item lookup object for O(1) access.
 *
 * @template {EleventyCollectionItem} T
 * @param {T[]} collection - Collection to index
 * @returns {Record<string, T>} Lookup object keyed by fileSlug
 *
 * @example
 * const bySlug = indexBySlug(collections.products);
 * const product = bySlug["widget-a"];
 */
export const indexBySlug = indexBy((item) => item.fileSlug);

/**
 * Look up a single item by its fileSlug.
 * Uses cached index for O(1) lookups across all pages.
 * Throws if the slug is not found - a missing slug indicates a data error.
 *
 * @template {EleventyCollectionItem} T
 * @param {T[]} collection - The collection to search
 * @param {string} slug - The fileSlug to find
 * @returns {T} The matching item
 * @throws {Error} If no item with the given slug exists
 *
 * @example
 * const category = getBySlug(collections.categories, "widgets");
 */
export const getBySlug = (collection, slug) => {
  const item = indexBySlug(collection)[slug];
  if (!item) {
    throw new Error(`Slug "${slug}" not found. Check your markdown files.`);
  }
  return item;
};

/**
 * Configure collection lookup filter for Eleventy.
 *
 * Replaces O(n) patterns like:
 *   {% assign item = collection | where: "fileSlug", slug | first %}
 *
 * With O(1) lookups:
 *   {% assign item = collection | getBySlug: slug %}
 *
 * If the slug is not found, the build will fail with an error indicating
 * the problematic slug - this catches data errors early.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export const configureCollectionLookup = (eleventyConfig) => {
  eleventyConfig.addFilter("getBySlug", getBySlug);
};
