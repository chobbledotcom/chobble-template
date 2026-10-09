---
name: Configuration
subtitle: Site identity, features, labels, and languages
guide-category: advanced-topics
blocks:
  - type: guide-header
  - type: guide-navigation
  - type: markdown
    content: |
      Site-wide settings live in JSON files under `src/_data/`. Required
      identity and language fields are validated at build time; after other
      changes, build and inspect the affected output.

      ## site.json

      Identity: the site's name, canonical `url`, and social links. The
      `url` feeds canonical tags, the sitemap, and the feed. Deployments
      can override it with the `SITE_URL` environment variable, which is
      how the deploy workflows serve the same site from different base
      URLs without edits.

      ## config.json

      Feature toggles: breadcrumbs, the theme switcher, navigation style,
      and which collections the search indexes.

      ## strings.json

      Supported News and Guide labels and permalink directories - rename
      "News" or move that collection to another path without touching a
      template. Per-language chrome labels such as Home, search, breadcrumbs,
      and the skip link live in `languages.json`.

      ## Theming

      Colors, fonts, and spacing are CSS custom properties. Prebuilt
      themes ship with the template, and the [theme editor](/theme-editor/)
      lets you tune one visually and export the result.

      ## Languages

      `languages.json` lists the languages the site publishes;
      `translations.json` pairs pages that say the same thing. A page's
      language comes from its URL prefix, and paired pages get `hreflang`
      tags and a footer switcher automatically.
---
