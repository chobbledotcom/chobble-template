---
name: Products
meta_description: Products to add to a quote.
meta_title: Products
permalink: /products/
eleventyNavigation:
  key: Products
  order: 4
blocks:
  - type: markdown
    content: |
      # Products

      On a real website this is where you'd list what you sell or hire. Each product can be added to a quote, which visitors send you from the [quote page](/quote/) - there is no checkout or payment, just an enquiry with the items and an estimated price.
  - type: items
    collection: products
    image_aspect_ratio: "4/3"
---
