import { describe, expect, test } from "vitest";
import { configureReviews } from "#collections/reviews.js";
import { collectionApi, withConfiguredMock } from "#test/test-utils.js";

const configured = withConfiguredMock(configureReviews)();
const { minimumRating } = configured.filters;

/** Reviews from [name, dateStr, rating, extra data] tuples. */
const reviewItems = (tuples) =>
  tuples.map(([name, dateStr, rating, extra = {}]) => ({
    data: { name, rating, ...extra },
    date: new Date(dateStr),
  }));

const names = (reviews) => reviews.map((review) => review.data.name);

describe("reviews collection", () => {
  test("lists reviews newest first", () => {
    const reviews = reviewItems([
      ["Oldest", "2024-01-01", 5],
      ["Newest", "2024-03-01", 4],
      ["Middle", "2024-02-01", 5],
    ]);

    const result = configured.collections.reviews(collectionApi(reviews));

    expect(names(result)).toEqual(["Newest", "Middle", "Oldest"]);
  });

  test("leaves out reviews marked hidden", () => {
    const reviews = reviewItems([
      ["Shown", "2024-01-01", 5],
      ["Hidden", "2024-02-01", 5, { hidden: true }],
      ["Not hidden", "2024-03-01", 5, { hidden: false }],
    ]);

    const result = configured.collections.reviews(collectionApi(reviews));

    expect(names(result)).toEqual(["Not hidden", "Shown"]);
  });
});

describe("minimumRating filter", () => {
  const reviews = reviewItems([
    ["Five", "2024-01-01", 5],
    ["Four", "2024-01-02", 4],
    ["One", "2024-01-03", 1],
  ]);

  test("keeps reviews rated at or above the minimum", () => {
    expect(names(minimumRating(reviews, 4))).toEqual(["Five", "Four"]);
  });

  test("keeps every review at the lowest rating", () => {
    expect(names(minimumRating(reviews, 1))).toEqual(["Five", "Four", "One"]);
  });

  test("keeps nothing when no review reaches the minimum", () => {
    expect(minimumRating(reviewItems([["Two", "2024-01-01", 2]]), 3)).toEqual(
      [],
    );
  });
});
