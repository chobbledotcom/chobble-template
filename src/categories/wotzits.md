---
title: Wotzits
subtitle: Wotzits for all users and purposes
featured: true
blocks:
  - type: markdown
    content: |
      # Wotzits

      Shop our collection of stylish wotzits for every environment and function.
  - type: items
    collection: categories
    filter:
      property: data.parent
      equals: wotzits
  - type: items
    collection: products
    filter:
      property: data.categories
      equals: wotzits
    filter_ui_collection: categoryListingFilterUI
---
