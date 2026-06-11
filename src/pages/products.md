---
name: Products
meta_description:
meta_title: Products
permalink: "/{{ strings.product_permalink_dir }}/"
eleventyNavigation:
  key: Products
  order: 3
blocks:
  - type: include
    file: products-header.html
  - type: markdown
    content: Browse all products or use the filters above to narrow your search.
  - type: items
    collection: products
    filter_ui_collection: filteredProductPagesListingFilterUI
---
