---
name: Deploying
subtitle: Bunny Sites by default, any static host otherwise
guide-category: getting-started
blocks:
  - type: guide-header
  - type: guide-navigation
  - type: markdown
    content: |
      ## Deploy to Bunny Sites

      The repository ships a workflow that builds and deploys the site on
      every push to `main`. Pull requests are built without deploying, so a
      broken change shows up before it is merged.

      Create the Bunny Site, then add `BUNNY_ACCESS_KEY` and
      `BUNNY_STORAGE_ZONE_NAME` as repository secrets under
      **Settings → Secrets and variables → Actions**. Repository docs
      publish alongside the site at `/docs/`.

      ## Building for any other host

      `npm run build` produces a self-contained `_site/` directory. Point
      any static host - or your own pipeline - at that directory. There is
      no application server and no application-secret requirement.
faqs:
  - question: Why did the workflow build but not deploy?
    answer: The deploy step is skipped while `BUNNY_STORAGE_ZONE_NAME` is missing (a site that predates the rename can set `BUNNY_PRODUCTION_STORAGE_ZONE_NAME` instead), so a fresh fork builds cleanly before it has hosting. Add the secrets under **Settings → Secrets and variables → Actions**, then re-run the workflow.
    order: 1
---
