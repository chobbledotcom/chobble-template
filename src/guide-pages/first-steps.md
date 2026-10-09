---
name: Your First Page
subtitle: Build a page out of blocks
guide-category: getting-started
blocks:
  - type: guide-header
  - type: guide-navigation
  - type: markdown
    content: |
      Every page is a markdown file in `src/pages/` whose frontmatter
      declares a `blocks` array. Create `src/pages/hello.md`:
  - type: code-block
    filename: src/pages/hello.md
    language: yaml
    code: "---\nname: Hello\npermalink: /hello/\nblocks:\n  - type: hero\n    content: |\n      # Hello, world\n  - type: markdown\n    content: |\n      My first page, built from two blocks.\n---"
  - type: markdown
    content: |
      Save it and the dev server renders `/hello/` immediately.

      ## Finding the right block

      The [blocks page](/blocks/) renders standalone-previewable block types
      beside schema-backed YAML examples; collection-restricted contextual
      blocks show usage guidance instead. Copy a relevant example, confirm
      consequential fields in the repository's generated block reference at
      `skills/cfa-static-site-builder/references/blocks.md`, and adjust
      it. Invalid block names and top-level fields fail the build with the file
      and block number.

      ## Structure worth knowing

      - `src/pages/` - one file per page
      - `src/news/` - dated posts with an Atom feed
      - `src/guide-pages/` - documentation pages like this one
      - `src/snippets/` - reusable block compositions
      - `src/images/` - images, processed into responsive formats
---
