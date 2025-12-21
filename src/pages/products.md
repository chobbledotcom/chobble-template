---
header_image: src/images/placeholder.jpg
header_text: Products
meta_description:
meta_title: Products
layout: categories.html
permalink: "/{{ strings.product_permalink_dir }}/"
eleventyNavigation:
  key: Products
  order: 3
---

# Our Products

This page uses the categories layout to display product categories. Each category is defined as a markdown file in the categories folder and can have a parent category to create a hierarchy. Categories marked as featured appear here on the main products page.

Products are stored as markdown files in the products folder. Each product can belong to multiple categories by listing category slugs in its frontmatter. Products support options with pricing and SKUs for e-commerce, specifications displayed as a table, features shown as a list, tabs for organising content, FAQs, and a gallery of images. Reviews from the reviews collection can be linked to products and will display with star ratings.

When filtering is enabled in the config, products can define filter attributes that generate a filter interface on listing pages. The system pre-generates filtered result pages to maintain a static site architecture.
