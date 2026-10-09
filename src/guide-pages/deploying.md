---
name: Deploying
subtitle: SharedServices by default, public Pages alongside
guide-category: getting-started
blocks:
  - type: guide-header
  - type: guide-navigation
  - type: markdown
    content: |
      ## Deploy to SharedServices

      Code for America publishes this site through SharedServices, its
      Okta-protected internal hosting platform. The
      `sharedservices-deploy.yaml` workflow builds `_site/` from the commit
      it is dispatched on and hands the artifact to the platform's
      [shared static deployment workflow](https://github.com/codeforamerica/shared-services-infra/blob/main/.github/workflows/shared-deploy-static.yaml),
      which assumes the application's AWS role, syncs the static bucket, and
      invalidates the CloudFront cache. Okta SSO is enforced at the edge, so
      the site itself never handles authentication.

      Deployment is manual: under **Actions**, run **Deploy to
      SharedServices** on `main` and pick an environment. A dispatch queues
      behind an in-flight deploy rather than cancelling it mid-sync.

      Each environment's settings are managed through Doppler, covering
      `SITE_URL`, the target bucket, and the AWS role. SharedServices serves
      each application at the root of its own subdomain, so builds involve no
      path prefix - only `SITE_URL` differs. Repository docs publish
      alongside the site at `/docs/`.

      ## Deploy to GitHub Pages

      The repository keeps a public deployment running alongside the
      internal one: a workflow builds and publishes to GitHub Pages on
      every push to `main`. Enable it once under the repository's
      **Settings → Pages** by setting **Source** to **GitHub Actions**.
      On a project site the build rewrites internal URLs under `/repo/`;
      on a custom domain there is no prefix. Both deployments build from
      the same commit and differ only in `SITE_URL`.

      ## Building for any other host

      `npm run build` produces a self-contained `_site/` directory. Point
      any static host - or your own pipeline - at that directory. There is
      no application server and no application-secret requirement.
faqs:
  - question: Why does the first deploy fail?
    answer: The application must be registered in `shared-services-infra` before it can deploy - a spec under `tofu/configs/static-app/specs/` provisions the deploy role and its Doppler configuration. If registration exists but the deploy still reports `Not authorized to perform sts:AssumeRoleWithWebIdentity`, the role's OIDC trust policy does not match the subject claims GitHub mints for this repository. Repositories created after July 15, 2026 mint immutable subjects (`org@<id>/name@<id>`), so the spec's `repo` value must use that format.
    order: 1
  - question: How do I add a deployment environment?
    answer: Have DevOps configure the environment through Doppler with `AWS_REGION`, `STATIC_BUCKET`, `STATIC_PREFIX`, `CLOUDFRONT_DISTRIBUTION_ID` (for cache invalidation), and `SITE_URL` (the app's endpoint URL, with no trailing slash), plus the `AWS_ROLE_ARN` secret. The workflow's `environment` input selects it.
    order: 2
---
