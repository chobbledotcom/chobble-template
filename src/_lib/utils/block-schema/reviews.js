export const type = "reviews";

export const schema = ["current_item"];

export const docs = {
  summary:
    "Renders reviews collection with optional filtering to the current item.",
  template: "src/_includes/design-system/reviews-block.html",
  scss: "src/css/design-system/_reviews.scss",
  notes:
    "Uses `getReviewsFor` filter to match reviews by slug and tags when `current_item` is true.",
  params: {
    current_item: {
      type: "boolean",
      description:
        "If true, filters reviews to the current item by slug and tags.",
    },
  },
};
