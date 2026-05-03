---
meta_description: Browse our delicious vegan menus
meta_title: Menus
eleventyNavigation:
  key: Menus
  order: 4
layout: design-system-base.html
permalink: /menus/
blocks:
  - type: section-header
    intro: |-
      # Our Menus

      Browse our delicious vegan menus
  - type: markdown
    content: |
      This page shows menus. Menus are files in the menus folder. The system uses a three-level structure. Menus contain categories, and categories contain items.

      Menu categories are files in the menu-categories folder. Each category says which menus it belongs to. Menu items are files in the menu-items folder. Each item says which categories it belongs to. This lets you put the same item in more than one category or menu.

      You can mark items as vegan or gluten-free. The menu page shows a key with symbols for these. You can add more dietary indicators in the config.
  - type: items
    collection: menus
---
