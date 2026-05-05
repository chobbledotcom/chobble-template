---
title: Thingies
subtitle: Versatile thingies for every occasion
featured: true
blocks:
  - type: markdown
    content: |
      # Thingies

      Discover our extensive range of thingies, from smart connected models to timeless classic designs that never go out of style.
  - type: items
    collection: categories
    filter:
      property: data.parent
      equals: thingies
  - type: items
    collection: products
    filter:
      property: data.categories
      equals: thingies
    filter_ui_collection: categoryListingFilterUI
---
