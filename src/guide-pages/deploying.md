---
name: Deploying
subtitle: GitHub Pages by default, any static host otherwise
guide-category: getting-started
blocks:
  - type: guide-header
  - type: guide-navigation
  - type: markdown
    content: |
      ## Deploy to GitHub Pages

      The repository ships a workflow that builds the site and publishes it
      to GitHub Pages on every push to `main`. Enable it once under the
      repository's **Settings → Pages** by setting **Source** to
      **GitHub Actions**.

      The workflow asks Pages where the site will be served and builds to
      match. On a project site the build rewrites internal URLs under
      `/repo/`; on a custom domain there is no prefix. `SITE_URL` stamps
      the public origin into canonical URLs, the sitemap, and feeds.
      Repository docs publish alongside the site at `/docs/`.

      ## Building for any other host

      `npm run build` produces a self-contained `_site/` directory. Point
      any static host - or your own pipeline - at that directory. There is
      no application server and no application-secret requirement.
faqs:
  - question: Why does the first deploy fail?
    answer: GitHub Pages must be enabled before the workflow can deploy. Under the repository's **Settings → Pages**, set **Source** to **GitHub Actions**, then re-run the workflow.
    order: 1
---
