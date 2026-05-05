---
title: Widgets
subtitle: Innovative widgets for home and business use
featured: true
blocks:
  - type: markdown
    content: |
      # Widgets

      Browse our selection of high-quality widgets, from pocket gizmos and premium widgets to smart space enhancers.
  - type: items
    collection: categories
    filter:
      property: data.parent
      equals: widgets
  - type: items
    collection: products
    filter:
      property: data.categories
      equals: widgets
    filter_ui_collection: categoryListingFilterUI
---
