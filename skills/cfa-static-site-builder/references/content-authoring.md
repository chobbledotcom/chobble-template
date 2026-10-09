# Content Authoring

Read this reference before creating, migrating, or substantially restructuring
CfA Static content.

## Use The Live Schema

[The block reference](blocks.md) is generated from full schemas and canonical
examples; `/blocks/` is the live gallery. The schema modules under
`src/_lib/utils/block-schema/` define accepted
fields. The template path recorded in the reference, usually under
`src/_includes/design-system/`, defines rendering. Before using a block:

1. find its entry and canonical YAML example in [the block reference](blocks.md)
2. confirm consequential fields in its schema and template
3. include every required field
4. build immediately after introducing a new block pattern

Unknown block types, unknown top-level block keys, malformed object-list
entries, and missing required values fail the build. Nested object validation
does not reject every unknown or mistyped child field, so compare nested entries
with the schema and inspect rendered output. Treat validation errors as content
corrections; do not weaken validation to accommodate invalid frontmatter.

## Choose Blocks By Content Purpose

Prefer the smallest coherent set:

| Need | Default block |
|---|---|
| Page lead with one H1 and actions | `hero` |
| Section introduction | `section-header` |
| Long-form prose | `markdown` |
| Features or benefits | `features` |
| Image-led cards | `image-cards` |
| Key figures | `stats` |
| Advisory, note, or warning | `callout` |
| Strong closing action | `cta` or `link-button` |
| Text beside an image | `split-image` |
| In-page navigation for long content | `table-of-contents` |
| Image collection | `gallery` |
| Download list with file metadata | `downloads` |
| Reusable block composition | `snippet` |
| Collection listing | `items`, `items-text-list`, or `link-columns` |

Use full-bleed image, marquee, iframe, raw HTML, and include blocks only when
the brief actually requires them. Do not use block variety as a substitute for
information hierarchy.

## Standard Page

Pages live in `src/pages/` and contain all publishable content in frontmatter
blocks:

```yaml
---
name: About
meta_title: About the organization
meta_description: A factual summary for search and social previews.
permalink: /about/
eleventyNavigation:
  key: About
  order: 2
blocks:
  - type: hero
    content: |
      # About us

      A concise, factual introduction.
  - type: markdown
    content: |
      ## What we do

      Approved body copy goes here.
---
```

Do not add Markdown after the closing frontmatter delimiter. Use one clear H1,
then a logical heading sequence. Write descriptive link labels rather than
"click here".

## News

News posts live in `src/news/`. Use a dated filename so the collection, feed,
and metadata share one date:

```text
src/news/2026-08-28-service-update.md
```

```yaml
---
name: Service update
subtitle: Optional short summary
author: Optional real author name
blocks:
  - type: hero
    content: |
      # Service update
  - type: news-meta
  - type: markdown
    content: |
      ## What changed

      Approved update copy.
---
```

Do not fabricate authors or publish empty demo posts. Confirm whether a dated
item is truly news rather than a permanent page.

## Guides

A guide category lives in `src/guide-categories/`:

```yaml
---
name: Getting Started
subtitle: Short category summary
icon: "hugeicons:book-02"
blocks:
  - type: guide-header
  - type: markdown
    content: |
      Category introduction.
  - type: guide-pages-list
---
```

A guide page lives in `src/guide-pages/` and links to the category slug:

```yaml
---
name: First Steps
subtitle: Optional page summary
guide-category: getting-started
blocks:
  - type: guide-header
  - type: guide-navigation
  - type: markdown
    content: |
      ## First task

      Guide content.
---
```

Keep procedural guides task-oriented. Use `code-block`, `downloads`, callouts,
and a table of contents only when they improve the instructions. Current guide
lists use Eleventy collection order and do not sort by a frontmatter `order`
field. If editorial ordering is required, implement and test an explicit
collection sort rather than assuming the CMS field controls display order.

## FAQs

For CMS-managed page-level FAQs, declare `faqs` in frontmatter and render one
`faqs` block without `items`:

```yaml
faqs:
  - question: What does this service cost?
    answer: The approved answer, with Markdown if needed.
blocks:
  - type: faqs
```

Alternatively, put `items` directly on the block. Do not define both sources
unless there is a clear reason.

## Snippets And Shared Regions

Snippet files live in `src/snippets/` and may use either Markdown body content
or a `blocks` array. `footer-content.md` and `right-content.md` are named global
regions. Read `src/snippets/README.md` and [layouts](layouts.md) before changing
them; the [generated compatibility table](blocks.md#column-and-sidebar-compatibility)
lists column-safe block types for sidebars.

The `snippet` block references a reusable block composition by filename without
the `.md` extension:

```yaml
blocks:
  - type: snippet
    reference: shared-contact-prompt
```

Create `src/snippets/shared-contact-prompt.md` before using that reference. A
missing snippet fails the build, and snippet blocks are validated like page
blocks. The generated PagesCMS snippet
form edits name and Markdown body; block-based snippet frontmatter currently
requires direct source editing.

Do not use snippets to hide one-off content or create indirection without reuse.

## Images, Files, And Embeds

- Put source images in `src/images/` and reference them with site-relative
  paths such as `/images/team.jpg`.
- Write alt text for the image's purpose in context. Use empty alt text only
  for genuinely decorative images when the block supports it.
- Use `downloads` only for files that exist under `src/` and are configured for
  passthrough copying.
- Give every `iframe-embed` a meaningful `name`, plus either a height or aspect
  ratio. Confirm the third party and privacy implications with the user.
- Never hotlink an image or embed user-tracking content without approval.

## Content And Design Quality

- Use the organization's language, not generic marketing filler.
- Keep claims concrete and verifiable; preserve supplied wording where legal or
  policy meaning matters.
- Design around the content hierarchy. Avoid repetitive card grids, excessive
  gradients, unnecessary animation, and decorative icons on every heading.
- Check long names, narrow screens, empty collections, and pages with little
  content.
- Preserve existing redirects when moving routes. Add `redirect_from` whenever
  a public URL changes; enable the CMS redirects feature as well when editors
  need to maintain those values through PagesCMS.
