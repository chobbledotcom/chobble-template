---
name: About
meta_title: About this template
meta_description: What Chobble Template is, where it comes from, and the principles it's built on.
blocks:
  - type: section-header
    intro: |-
      # About this template

      A small, opinionated base for informational sites
  - type: markdown
    content: |
      Chobble Template is a static-site template for informational and marketing
      sites. Pages are assembled from typed content blocks written in YAML
      frontmatter, validated at build time, and rendered by
      [Eleventy](https://www.11ty.dev/) to plain HTML.

      This is version 2 of the template: rebuilt from version 1,
      relicensed from AGPL to MIT by its author and cut down to a static
      core: no checkout, no server, no user data stored.
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
      - icon: "hugeicons:checkmark-circle-02"
        name: Tested like software
        description: Every change runs the full test suite, with complete line coverage and quality gates that keep the code small and consistent.
      - icon: "hugeicons:certificate-01"
        name: Yours to keep
        description: MIT licensed, with no service to sign up to. Fork it, change it, host it wherever you like.
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
