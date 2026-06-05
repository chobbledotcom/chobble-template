---
name: Mini Gizmo with Local Image
subtitle: This gizmo uses a local image file path
filter_attributes:
  - name: Size
    value: compact
  - name: Type
    value: classic
  - name: Price
    value: budget
keywords:
  - portable
  - colorful
  - self cleaning
order: 1
product_mode: buy
options:
  - name: Standard
    max_quantity: 10
    unit_price: 0.30
    sku: MH6D2J
features:
  - Colorful blinking lights
  - Makes whooshing sounds
  - Self-cleaning surface
add_ons:
  intro: Make it extra special
  options:
    - name: Gift Wrapping
      price: 4.99
    - name: Spare Batteries (4-pack)
      price: 8.99
    - name: Protective Sleeve
      price: 12.99
categories:
  - src/categories/compact-doodahs.md

blocks:
  - type: snippet
    reference: product-intro
  - type: markdown
    content: |
      This is a mini gizmo that demonstrates using a local image path. The system should look for the image in the /images/ directory.
  - type: snippet
    reference: contact-cta
  - type: features
    items:
      - icon: "hugeicons:cube"
        name: Material
        description: Crystalized Flubber
      - icon: "hugeicons:weight-scale"
        name: Weight
        description: 1.2 kg
      - icon: "hugeicons:usb-connected-01"
        name: Has dongle
        description: "Yes"
  - type: snippet
    reference: product-outro
---
