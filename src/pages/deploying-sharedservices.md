---
name: Deploying to SharedServices
meta_title: Putting the CfA Static site on SharedServices
meta_description: One-time setup guide for the internal deployment of the CfA Static template site.
permalink: /deploying-sharedservices/
no_index: true
blocks:
  - type: markdown
    content: |
      # Putting the CfA Static site on SharedServices

      One-time setup for the internal deployment of
      [codeforamerica/cfa-static](https://github.com/codeforamerica/cfa-static).
      The site (unchanged) also keeps deploying publicly to
      [GitHub Pages](https://codeforamerica.github.io/cfa-static/) — both build
      from the same commit and only differ in the URL they are stamped with.
      Everything for the internal side already lives in the repo; what's left
      is platform registration and configuration, in this order.

      ## What's already in place (nothing to do here)

      -
      [`sharedservices-deploy.yaml`](https://github.com/codeforamerica/cfa-static/blob/main/.github/workflows/sharedservices-deploy.yaml)
      — builds the site with the internal URL settings, uploads a build
      artifact, and calls the platform's shared workflow to publish it. Runs
      manually (Actions → *Deploy to SharedServices*), not on every push,
      while this is being piloted.
      -
      [`app.yaml`](https://github.com/codeforamerica/cfa-static/blob/main/app.yaml)
      — the platform registration file declaring this a static app whose
      build output is `_site`.
      - A
      [README section](https://github.com/codeforamerica/cfa-static#deployment)
      summarising all of this, and this walkthrough.

      ## Who does what

      | Step | Needs | That's |
      | --- | --- | --- |
      | 1. Register the app in infra | Access to `shared-services-infra` | Platform DevOps (`#eng-team`) |
      | 2. Configure the GitHub environment | Admin on `cfa-static` | Whoever granted your repo access |
      | 3. Run the first deploy | Write access to the repo | **You** |
      | 4. Verify it works | A browser | **You** |

      If you don't have *t*ofu or infra access — normal! — step 1 happens
      entirely in a different repo by someone who does, and step 2's config
      screen may also be admin-only. Steps 3 and 4 are yours.

      ## Step 1 — Register the app in the platform

      SharedServices doesn't know this site exists yet. The platform's rule is
      that everything it hosts is declared in one central infrastructure repo —
      [`shared-services-infra`](https://github.com/codeforamerica/shared-services-infra)
      (likely requires a DevOps login to view). A declaration is a small YAML
      file called a static app spec: add a `cfa-static` spec to
      [`tofu/configs/static-app/specs/`](https://github.com/codeforamerica/shared-services-infra/tree/main/tofu/configs/static-app/specs)
      ([open a PR there](https://github.com/codeforamerica/shared-services-infra/compare)),
      then apply it with `tofu apply` — the tool that reads the declaration
      and creates the real AWS resources.

      Values for the spec (mirroring the repo's
      [`app.yaml`](https://github.com/codeforamerica/cfa-static/blob/main/app.yaml)):

      | Field | Value | Note |
      | --- | --- | --- |
      | `name` | `cfa-static` | Matches the GitHub repo |
      | `name_short` | `cfa-static` | 10 chars — within the 12-char limit |
      | `type` | `static` | No server — Okta gates it at the edge |
      | `description` | CfA Static site template — self-documenting reference deployment | Free text |

      Worth a comment in the PR: this repo intentionally doesn't follow the
      `sharedservices-*` naming convention, because it's the template's own
      canonical repo rather than an app scaffolded from the platform template.

      Ask DevOps to hand back four values from the apply — the next steps need
      them exactly:

      - the **deploy role ARN** (the layer's `deploy_role_arn` output) — what
        lets GitHub upload to this app's corner of the bucket
      - the **bucket name** of the shared static-hosting bucket
      - the **CloudFront distribution ID** of the shared distribution
      - the app's **endpoint URL** (the layer's `endpoint_url` output) —
        `https://cfa-static.apps.dev.services.cfa.codes` in the development
        environment
  - type: callout
    content: |
      **What applying actually does:** provisions a per-app deploy role and
      grants that role permission to write to the shared static bucket under
      this app's prefix and to invalidate the shared CloudFront distribution.
      Nothing else — the app is static, so there's no container, no database,
      no network config to make. The app is served at the root of its own
      subdomain; a CloudFront edge function maps that subdomain to the app's
      prefix in the bucket behind the scenes, so the site itself never needs
      a path prefix.
  - type: markdown
    content: |
      ## Step 2 — Configure the GitHub environment

      DevOps manages the `development` environment and its settings through
      Doppler, which syncs them to GitHub. Ask DevOps to configure the
      following values rather than editing only the GitHub copy. You can
      inspect the environment under
      [Settings → Environments](https://github.com/codeforamerica/cfa-static/settings/environments).

      Add these **environment variables** (exact names — the workflow looks
      these up):

      | Name | Value | What it's for |
      | --- | --- | --- |
      | `AWS_REGION` | `us-east-1` | Where the bucket lives |
      | `STATIC_BUCKET` | *bucket name from step 1* | Where the files get uploaded |
      | `STATIC_PREFIX` | `cfa-static` | The app's slot in the shared bucket — where the workflow uploads. Must match the app name in the platform spec; the URL is unaffected (each app gets its own subdomain) |
      | `CLOUDFRONT_DISTRIBUTION_ID` | *distribution ID from step 1* | Enables cache invalidation in the shared deployment workflow |
      | `SITE_URL` | *the app's endpoint URL*, e.g. `https://cfa-static.apps.dev.services.cfa.codes` | The address the site stamps into its canonical URLs, sitemap, and social cards. Get the real value from DevOps after step 1 — it's the static-app layer's `endpoint_url` output: one subdomain per app, no path appended. **No trailing slash** — the build validates this and fails loudly rather than publishing odd URLs |

      And one **secret**:

      | Name | Value | What it's for |
      | --- | --- | --- |
      | `AWS_ROLE_ARN` | *deploy role ARN from step 1* | The AWS identity the workflow borrows during a run (kept as a secret to match the platform convention) |
  - type: callout
    content: |
      **The site-deployment workflow needs no stored AWS access keys.** When
      the workflow runs, GitHub and AWS exchange short-lived tokens: GitHub
      says "I'm this repo's deploy job", AWS checks that a role trusts
      exactly that repo, and hands out credentials that die when the run
      ends. That's OIDC — and it's why the deploy can be triggered by anyone
      with write access without them ever holding an AWS credential.
  - type: markdown
    content: |
      ## Step 3 — Run the first deploy

      Go to the workflow's page —
      [Actions → Deploy to SharedServices](https://github.com/codeforamerica/cfa-static/actions/workflows/sharedservices-deploy.yaml)
      — pick `main`, and hit *Run workflow*.

      What the run does, in order:

      1. **Build.** Same `npm ci` + `npm run build` as the public Pages
         deploy, from the same commit — differing only in the internal
         `SITE_URL`, which must be configured. No path prefix applies,
         because the app is served at the root of its own subdomain
      2. **Upload the build.** The exact files deployed get attached to the
         run as an artifact ("sharedservices-site") — download it from the
         run's page if you ever need to inspect what went out
      3. **Deploy the artifact.** The
         [shared workflow](https://github.com/codeforamerica/shared-services-infra/blob/main/.github/workflows/shared-deploy-static.yaml)
         downloads the artifact by ID, authenticates to AWS, and syncs it to
         `s3://<bucket>/cfa-static/`. Its `--delete` flag removes files no
         longer present in the build
      4. **Invalidate CloudFront.** The shared workflow clears the cache when
         the distribution ID variable is configured

      ## Step 4 — Verify

      Ask DevOps for the live URL from step 1 — the app's own subdomain, e.g.
      `https://cfa-static.apps.dev.services.cfa.codes`. Then:

      - Visit the URL in a private/incognito window — you should hit the
        Okta sign-in, *before* any part of the site loads. That's the edge
        doing access control; the site itself never sees auth
      - Sign in, land on the homepage, and click into a deep page — links
        should keep working at the subdomain root
      - Try the search box on the search page — results should come from the
        internal copy, not the public site
      - Spot-check the footer/social links and the feed at `/feed.xml` on
        the subdomain — URLs inside them should point at the internal origin
      - While logged in, view source on the homepage and confirm
        `rel="canonical"` points at the internal URL

      ## After the pilot

      Two deliberate restrictions that can be lifted once this has proven
      itself, both one-line changes:

      - **Deploys are manual.** Adding an `on: push` trigger makes every
        merge to `main` publish internally too, matching the platform's
        other static apps
      - **Deploy logic lives in this repo.** The platform offers a shared
        workflow for static apps; extending it to accept a pre-built
        artifact lets this repo (and future sites from the template) call it
        instead of running AWS commands directly — worth a follow-up issue
