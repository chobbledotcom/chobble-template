import {
  bool,
  HORIZONTAL_FIELD,
  MASONRY_FIELD,
  num,
} from "#utils/block-schema/shared.js";

export const type = "reviews";

export const fields = {
  current_item: {
    ...bool("Filter to Current Item"),
    description:
      "If true, filters reviews to the current item by slug and tags.",
  },
  minimum_rating: {
    ...num("Minimum Rating"),
    description:
      "If set, only reviews with a rating >= this value are displayed (1–5).",
  },
  horizontal: HORIZONTAL_FIELD,
  masonry: MASONRY_FIELD,
};

export const docs = {
  summary:
    "Renders reviews collection with optional filtering to the current item.",
  template: "src/_includes/design-system/reviews-block.html",
  scss: "src/css/design-system/_reviews.scss",
  notes:
    "Uses `getReviewsFor` filter to match reviews by slug and tags when `current_item` is true. Uses `filterByMinRating` filter when `minimum_rating` is set.",
};
