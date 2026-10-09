/* jscpd:ignore-start -- block schema declaration data */
import {
  HORIZONTAL_FIELD,
  INTRO_CONTENT_FIELD,
  MASONRY_FIELD,
  num,
} from "#utils/block-schema/shared.js";

export const type = "reviews";

export const fields = {
  minimum_rating: {
    ...num("Minimum Rating"),
    default: 1,
    description:
      "Only reviews rated at least this are shown, from `1` (every review) to `5`.",
  },
  limit: {
    ...num("Limit"),
    description: "Show at most this many reviews, newest first.",
  },
  horizontal: HORIZONTAL_FIELD,
  masonry: MASONRY_FIELD,
  intro_content: INTRO_CONTENT_FIELD,
};

export const docs = {
  summary:
    "Customer reviews as cards, newest first: rating, date, the reviewer's words, and a link to where they wrote it.",
  scss: "src/css/design-system/_reviews.scss",
  notes:
    "Renders the `reviews` collection: one markdown file per review in `src/reviews/`, named `YYYY-MM-DD-reviewer.md`, with `name`, `rating`, and optional `source`, `url`, and `avatar` (the reviewer's photo; their initial shows without one) in the frontmatter and the review as the body. `npm run fetch-reviews` writes these files from Google, Facebook and Trustpilot. A review with `hidden: true` is left out. The block renders nothing when no review qualifies.",
};

export const example = {
  type: "reviews",
  minimum_rating: 4,
  limit: 6,
  intro_content: "## What customers say",
};
/* jscpd:ignore-end */
