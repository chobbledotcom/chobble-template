# Snippets

Snippets are reusable content, not standalone pages. Two filenames have global
placements in the base layout:

- `footer-content.md`: Markdown body content renders in `<footer>`, below the
  social links. Its frontmatter `blocks` render separately at the end of
  `<main>`, before the footer, on every page using the base layout.
- `right-content.md`: An optional sidebar beside the main content. Nonempty
  frontmatter `blocks` render instead of its Markdown body. Use column-safe
  blocks only; see the [layout reference](../../skills/cfa-static-site-builder/references/layouts.md)
  for restrictions. Width is themeable via `--right-column-width`. When the
  sidebar exists, a page's first `image-background` block is hoisted above
  the columns to span both content and sidebar.

Homepage section headings belong in the homepage's own `blocks` array; there
are no special homepage heading snippet slots.

## Reusable Blocks

Create `src/snippets/shared-contact-prompt.md` with frontmatter like:

```yaml
---
name: Shared contact prompt
blocks:
  - type: markdown
    content: |
      ## Questions?

      [Contact us](/contact/) for more information.
---
```

Then include its blocks on a page by referencing the filename without `.md`:

```yaml
blocks:
  - type: snippet
    reference: shared-contact-prompt
```

The `snippet` block renders the referenced snippet's blocks, not its Markdown
body. A reference to a missing snippet fails the build, and snippet blocks are
validated and default-filled exactly like page blocks. For accepted fields, use the generated
[block reference](../../skills/cfa-static-site-builder/references/blocks.md).
