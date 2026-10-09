/**
 * Reviews collection and filters
 *
 * Reviews live in src/reviews/ as one markdown file each: the reviewer's
 * name, rating and source in the frontmatter, their words as the body.
 * `npm run fetch-reviews` writes them; they can also be written by hand.
 *
 * @module #collections/reviews
 */

import { registerFilters } from "#eleventy/register.js";
import { createTagCollection } from "#utils/collection-utils.js";
import { sortByDateDescending } from "#utils/sorting.js";

/** @typedef {import("#lib/types").ReviewCollectionItem} ReviewCollectionItem */

/**
 * Reviews at or above a rating.
 * @param {ReviewCollectionItem[]} reviews
 * @param {number} rating - Lowest rating to keep, from 1 to 5
 * @returns {ReviewCollectionItem[]}
 */
const minimumRating = (reviews, rating) =>
  reviews.filter((review) => review.data.rating >= rating);

/**
 * Registers the `reviews` collection - every review not marked `hidden`,
 * newest first - and the `minimumRating` filter.
 * @param {import("#lib/types").UserConfig} eleventyConfig
 */
export const configureReviews = (eleventyConfig) => {
  eleventyConfig.addCollection(
    "reviews",
    createTagCollection("reviews", "hidden", sortByDateDescending),
  );
  registerFilters(eleventyConfig)({ minimumRating });
};
