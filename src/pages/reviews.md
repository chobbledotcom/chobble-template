---
header_image: src/images/placeholder.jpg
header_text: Reviews
meta_description:
meta_title: Reviews
layout: reviews.html
eleventyNavigation:
  key: Reviews
  order: 4
---

## Customer Feedback

Reviews are stored as markdown files in the reviews folder with a date prefix in the filename for sorting. Each review has a name field for the reviewer and can include a URL to link their name, a rating from one to five stars, a thumbnail for their avatar, and a list of product slugs to associate the review with products.

Reviews do not generate their own pages. They appear here on the reviews listing and on the product pages they are linked to. The system calculates an average rating for each product from its linked reviews and displays this as stars. Reviews with hidden set to true in their frontmatter are excluded from the collection.
