---
name: About
meta_title: About this template
meta_description: What CfA Static is, where it comes from, and the principles it's built on.
blocks:
  - type: section-header
    intro: |-
      # About this template

      A small, opinionated base for informational sites
  - type: markdown
    content: |
      CfA Static is a static-site template for informational and marketing
      sites. Pages are assembled from typed content blocks written in YAML
      frontmatter, validated at build time, and rendered by
      [Eleventy](https://www.11ty.dev/) to plain HTML.

      It is derived from the [Chobble Template](https://github.com/chobbledotcom/chobble-template),
      relicensed to MIT by its author and cut down to an informational
      core: no e-commerce, no forms, no user data handling.
  - type: features
    intro_content: |
      ## Principles
    items:
      - icon: "hugeicons:shield-01"
        name: Fail loudly at build time
        description: Required site identity, block types, and internal links are checked at build time. Review the rendered page too; automated checks cannot catch every content mistake.
      - icon: "hugeicons:document-validation"
        name: One source of truth
        description: Block schemas drive validation, the editor config, and the generated reference. Tests check that generated artifacts stay current and gallery examples validate.
      - icon: "hugeicons:globe-02"
        name: Static means simple
        description: The deployable artifact is a directory of files. Host it anywhere, cache it everywhere, patch nothing.
      - icon: "hugeicons:wheelchair"
        name: Accessible by default
        description: Semantic markup, reduced-motion support, and a target of WCAG 2.2 AA conformance.
  - type: cta
    content: |
      ## Explore the building blocks

      Browse schema-backed YAML examples, with live previews for blocks that
      work on their own. Collection-restricted blocks include guidance for
      using them in context instead.
    button:
      text: See the blocks
      href: /blocks/
---
