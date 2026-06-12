# Snippets

Create a file in this folder called "snippet-name.md" and it'll be rendered in the spot mentioned:

- `homepage-categories-header.md` - Above the homepage categories, if there are any. Defaults to `<h3>Product Categories</h3>`
- `homepage-news-header.md` - Above the homepage news items, if there are any. Defaults to `<h3>Latest Posts</h3>`
- `footer-content.md` - The footer, under the social media links. You can
  also define design-system `blocks` in this snippet's frontmatter; they will
  be rendered at the end of `<main>` on every page (before the `<footer>`), so
  you can build a consistent "fancy footer" that appears across the whole site
- `right-content.md` - An optional right column (sidebar) that appears beside
  the main content on every page. Define design-system `blocks` in the
  frontmatter (column-safe types only — no hero, `*-background`,
  marquee-images, or `split-*`), or just write markdown body content. Width
  is themable via the `--right-column-width` CSS token. When this file
  exists, a page whose first block is `image-background` gets that banner
  hoisted above the columns so it spans content + sidebar
