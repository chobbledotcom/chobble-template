---
name: Home
meta_title: Chobble Template
meta_description: A static-site template for informational and marketing sites, built from composable content blocks.
permalink: /
eleventyNavigation:
  key: Home
  order: 1
blocks:
  - type: hero
    content: |
      # A static-site template for informational sites

      Build small, fast, accessible marketing and informational sites from composable content blocks - written in YAML, rendered by Eleventy, deployed as a static artifact.
    buttons:
      - text: Explore the blocks
        href: /blocks/
        variant: primary
        size: lg
      - text: How it works
        href: /how-it-works/
        variant: secondary
        size: lg
  - type: features
    intro_content: |
      ## What's in the box
    items:
      - icon: "hugeicons:cube"
        name: Content blocks
        description: Pages are YAML lists of typed blocks - heroes, FAQs, callouts, image cards - validated at build time with loud errors.
      - icon: "hugeicons:global"
        name: Multi-language
        description: Publish the same page in more than one language, with hreflang tags and a footer language switcher.
      - icon: "hugeicons:paint-brush-01"
        name: Themeable
        description: CSS custom properties throughout, with a visual theme editor and exportable theme files.
      - icon: "hugeicons:rocket"
        name: Static output
        description: One command builds the whole site to a deployable directory - no servers, no database, nothing to patch.
      - icon: "hugeicons:note-edit"
        name: Visual editing
        description: A generated PagesCMS config lets site owners edit pages and blocks in the browser, without touching YAML.
      - icon: "hugeicons:shopping-cart-01"
        name: Quotes, not checkouts
        description: Products carry add-to-quote buttons, and visitors send their quote - hire dates and an estimated price included - to your inbox.
  - type: markdown
    content: |
      ## Quick start

      ```bash
      npm install          # install dependencies
      npm run serve        # dev server with hot reload
      npm run build        # build to _site/ (includes the internal link check)
      ```

      Starting a new site? The [installation guide](/guide/getting-started/installation/)
      covers forking the template, configuration, and deployment.
  - type: cta
    content: |
      ## This site is its own documentation

      Every page here is built from the template's blocks. Read the guides for setup, configuration, and deployment - or open any page's source file to see exactly how it's made.
    button:
      text: Read the guides
      href: /guide/
      size: lg
---
