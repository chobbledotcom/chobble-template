---
header_text: Properties
meta_description:
meta_title: Properties
layout: design-system-base.html
permalink: "/{{ strings.property_permalink_dir }}/"
eleventyNavigation:
  key: Properties
  order: 4
blocks:
  - type: markdown
    content: |
      # Properties

      This page shows properties. Properties are files in the properties folder. You can add bedrooms, bathrooms, how many people it sleeps, and a price per night. You can also add a list of features and questions with answers.

      Properties can link to locations. When you add location slugs to a property, it shows up on those location pages. You can also add filter attributes like number of bedrooms or whether pets are allowed. If you turn on filtering in the config, visitors can search by these attributes.

      If you use the [Freetobook](https://freetobook.com) booking system, you can add an availability calendar by setting a Freetobook ID and token on your property. Properties with featured set to true show on the homepage.
  - type: properties
---
