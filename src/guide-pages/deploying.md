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

      The repository ships a workflow that builds the site on every push
      and deploys it to [Bunny Sites](https://bunny.net/). `main` deploys to
      the production site; every other branch deploys to the staging site,
      so a branch can be checked on a real URL before it is merged.

      Create the Bunny Sites, then add `BUNNY_ACCESS_KEY` and
      `BUNNY_PRODUCTION_STORAGE_ZONE_NAME` as repository secrets under
      **Settings → Secrets and variables → Actions**. Add
      `BUNNY_STAGING_STORAGE_ZONE_NAME` to deploy branches too. Repository
      docs publish alongside the site at `/docs/`.

      ## Building for any other host

      `npm run build` produces a self-contained `_site/` directory. Point
      any static host - or your own pipeline - at that directory. There is
      no application server and no application-secret requirement.
faqs:
  - question: Why did the workflow build but not deploy?
    answer: The deploy step is skipped while `BUNNY_ACCESS_KEY` or the site name for that branch is missing, so a fresh fork builds cleanly before it has hosting. Add the secrets under **Settings → Secrets and variables → Actions**, then re-run the workflow.
    order: 1
---
