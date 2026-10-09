# Chobble Template

A static-site template for small informational and marketing sites, built on
[Eleventy](https://www.11ty.dev/) and Node.js. Pages are
assembled from composable, schema-validated content blocks written in YAML
frontmatter, so engineering-adjacent authors (and AI assistants) can build and
edit pages without touching templates.

This is version 2 of the Chobble Template: rebuilt from version 1,
relicensed from AGPL to MIT by its sole author, and cut down to an informational
core: no e-commerce, no forms, no user data handling — just fast, accessible,
static pages.

## How this repository documents itself

Every guide travels inside the repository, so a checkout — or a fork of it —
is self-documenting. Start with the
[architecture walkthrough](ARCHITECTURE.md): it explains the whole system end
to end, and its [reading map](ARCHITECTURE.md#how-to-read-this-repository)
names the reference that owns each task, from starting a site to changing the
template's own code. That map lives in the walkthrough rather than here
because a fork replaces this README but keeps the walkthrough.

The reference documents also publish as pages on this template's own
deployed site — the
[reference category](https://example.chobble.com/guide/reference/)
of its guide section — so the documentation is browsable as a website while
staying plain markdown in the repository for agents and forks.

## What's included

- **Content blocks** — heroes, FAQs, callouts, image cards,
  split layouts, galleries, and stats declared in frontmatter and validated at
  build time with loud, file-specific errors. See the generated
  [block reference](skills/chobble-template-site-builder/references/blocks.md)
  and [layout reference](skills/chobble-template-site-builder/references/layouts.md),
  or the deployed site's `/blocks/` page,
  where standalone-previewable types render next to YAML from the same tested
  fixtures. Collection-restricted contextual blocks show usage guidance
  instead.
- **Content types** — Pages, News (with Atom feed), Guides (categorised
  documentation pages), and reusable Snippets.
- **Multi-language** — publish the same page in more than one language with
  `hreflang` tags, an `x-default`, a header or footer language switcher, and
  per-language menus, snippets, and interface labels. See the
  [languages reference](skills/chobble-template-site-builder/references/i18n.md).
- **Theming** — CSS custom properties throughout, prebuilt themes, a
  visual theme editor at `/theme-editor/` with export.
- **Images** — responsive `srcset` via eleventy-img, base64 LQIP placeholders,
  aspect-ratio cropping, unused-image detection.
- **Accessibility** — `npm test` checks every built page with axe-core's
  automated WCAG 2.2 AA rules, including gallery coverage for blocks that
  support standalone previews. Pages get a skip link, named landmarks, and
  per-language chrome labels out of the box. Manual review is still required
  for context, visual contrast, keyboard flow, and other qualities automation
  cannot settle.
- **Search** — static full-text search via Pagefind.
- **SEO** — schema.org JSON-LD (WebSite, Organization, BreadcrumbList,
  BlogPosting, FAQPage), canonical URLs, sitemap, social cards.
- **Editing layer** — a generated [PagesCMS](https://pagescms.org/) config
  (`.pages.yml`) wired to the block schemas, plus `npm run customise-cms`, an
  interactive/non-interactive wizard that tailors the editor to the
  collections a site actually uses.

## Quick start

Use the Node.js version specified in the
[Site Builder Reference](docs/developer-reference.md), then:

```bash
npm install          # install dependencies
npm run serve        # dev server with hot reload
npm run build        # build to _site/ (includes internal link check)
```

See the Site Builder Reference for selected site-building commands and the
[verification guide](skills/chobble-template-site-builder/references/verification.md) for checks.

The build needs no application secrets or server-side services. Dependency
installation, uncached Iconify icons, and configured remote source images may
require network access. The deployable artifact is the `_site/` directory —
publish it with any static host or pipeline.

## Agent Skill

[`skills/chobble-template-site-builder/`](skills/chobble-template-site-builder/) is a
portable [Agent Skill](https://agentskills.io/) for building and maintaining a
site from this template. Configure a compatible agent client to load that
directory according to the client's skill-discovery instructions. The package
travels with each fork and points agents back to the fork's live schemas,
generators, and checks rather than duplicating them.

## Starting a site from this template

Each site is a **fork of this repository**, not a dependency of it. A site's
content, configuration, and theme live in the fork, and the template's own
demo content is deleted or replaced there.

After cloning the fork, replace the `name`, `url`, and `description` in
`src/_data/site.json` before building. Missing or obvious placeholder identity
data fails the build rather than being published.

Replace this README too. Once the fork is the site, a README describing the
template misleads everyone who lands on the repository and hides the choices
the site made. Say what the site is, how it departs from the template's
defaults, and where its schemas and checks live — while keeping the pointers to
the [block reference](skills/chobble-template-site-builder/references/blocks.md),
[Site Builder Reference](docs/developer-reference.md), `CLAUDE.md`, and the
`/blocks/` gallery that anyone editing the site will need. The skill's
[project setup reference](skills/chobble-template-site-builder/references/project-setup.md#site-readme)
lists what to cover, including provenance and how the site deploys.

Updates flow one way and only when a site asks for them:

```bash
git remote add upstream https://github.com/chobbledotcom/chobble-template.git
git fetch upstream
git merge upstream/main      # deliberate, reviewed, and never automatic
```

That is the point of the arrangement. A site that has shipped keeps building
exactly as it built yesterday; template changes reach it when someone chooses
to merge them, reviews what changed, and re-runs the site's own checks. The
quality gates travel with the fork, so a site that pulls an update finds out
immediately whether the update broke anything it publishes.

## Deployment

The repo ships a deploy workflow (`.github/workflows/pages.yml`)
that builds and publishes to GitHub Pages on every push to `main`. One-time
setup: under the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**. On a project site (`https://<owner>.github.io/<repo>/`)
the build uses the `/<repo>/` path prefix and rewrites internal URLs to
match; with a custom domain or a user/organization site it builds with no
prefix. The workflow also merges `docs/` into the built site, so the generated
[Site Builder Reference](docs/developer-reference.md) is served under `/docs/`
on the deployment's base URL.

To host elsewhere instead, `npm run build` produces a self-contained `_site/`
directory with no application server and no application-secret requirement;
point any static host - or your own pipeline - at it.

## Configuration

Site identity lives in `src/_data/site.json`; behaviour toggles (navigation,
breadcrumbs, search, theme switcher, link handling) in `src/_data/config.json`.
Every field of each is declared once, with its type and meaning, in
[the site schema](src/_lib/config/site-schema.js) and
[the config schema](src/_lib/config/config-schema.js), and listed in the
generated [Site Builder Reference](docs/developer-reference.md#site-identity).
A site's `config.json` holds only what it changes, and the build fails on an
unknown key or a value the schema does not accept.

## Development

The [Site Builder Reference](docs/developer-reference.md) covers the Node
requirement, installation, selected site-building commands, CMS options, and
authoring links. The [Architecture walkthrough](ARCHITECTURE.md) explains how
the whole system fits together, from content files to deployable artifact.
For maintainer details, read [package.json](package.json) for scripts and
import aliases, [biome.json](biome.json) for lint configuration, and the
[FP source JSDoc](src/_lib/utils/fp/) for helper APIs. For how to write
useful tests rather than just pass the checks, read the authored
[test quality criteria](test/TEST-QUALITY-CRITERIA.md).

Run `npm run generate-references` to refresh both generated references,
`.pages.yml`, and the CMS types from their sources and saved CMS configuration.
The individual generator commands remain available for focused updates.

## License

[MIT](LICENSE).
