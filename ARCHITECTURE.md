# CfA Static Architecture

This is the guided walkthrough of how CfA Static works, for every reader —
site builders, content editors, reviewers, maintainers, and AI assistants. It
explains the whole system once, end to end, and links to the reference that
owns each area in depth. It is deliberately fork-safe: no secrets, credentials,
or organization-internal detail, so it can travel unchanged into any site
built from this template.

The one-paragraph version: a site is a git repository full of Markdown files
whose YAML frontmatter declares arrays of typed content blocks. Schemas
validate those arrays at build time and fill omitted fields from defaults;
block templates render them; a token-based theme styles them; Eleventy writes
a self-contained `_site/` directory that any static host can serve. There is
no server, no database, no form backend, and no user data — the static boundary
is a design commitment, not an accident of scope.

## Design Commitments

These recur throughout the system and explain most of its shape:

1. **Content is data, and invalid data fails the build.** Unknown block types,
   unknown top-level block keys, missing required values, placeholder site
   identity, and missing translation labels all abort with loud, file-specific
   errors. Nothing falls back to a default that silently publishes.
2. **A site is a fork, not a dependency.** Content, configuration, and theme
   live in the site's own repository. Template updates arrive only through a
   deliberate, reviewed `upstream` merge, and the quality gates travel with
   the fork so an update that breaks a site says so immediately.
3. **Accessibility is structural.** Semantic templates, keyboard-operable
   components, and visible focus live in the block library, not in each site.
   `npm test` audits every built page against axe-core's WCAG 2.2 AA rules;
   contrast and keyboard flow still need human review where automation cannot
   see rendered pixels.
4. **Generated artifacts have exactly one source.** Block schemas feed the
   block reference, the PagesCMS config, and the CMS types. The config and
   site schemas feed the startup validation of `config.json` and
   `site.json`, the config defaults, the CMS site editor, and the tables in
   the Site Builder Reference, alongside `package.json` and the shared CMS
   definitions. Freshness tests
   fail when a generated file drifts from its source, so nobody hand-edits
   output.

## How To Read This Repository

| You want to… | Read |
| --- | --- |
| Understand how the whole system fits together | this file |
| Install, build, and run a site | [README](README.md) quick start; [Site Builder Reference](docs/developer-reference.md) |
| Start a new site or change its shape | [project setup](skills/cfa-static-site-builder/references/project-setup.md) |
| Author or edit pages, news, guides, snippets | [content authoring](skills/cfa-static-site-builder/references/content-authoring.md) |
| Know every block's fields and examples | generated [block reference](skills/cfa-static-site-builder/references/blocks.md), or the live `/blocks/` gallery |
| Understand rendering, columns, sidebars | [layouts](skills/cfa-static-site-builder/references/layouts.md) |
| Publish in more than one language | [languages](skills/cfa-static-site-builder/references/i18n.md) |
| Rebuild an existing site page for page | [site mirroring](skills/cfa-static-site-builder/references/site-mirroring.md) |
| Verify a change before handoff | [verification](skills/cfa-static-site-builder/references/verification.md) |
| Change the template's own code | [engineering guide](CLAUDE.md); [library map](src/_lib/README.md); [test quality criteria](test/TEST-QUALITY-CRITERIA.md) |
| Drive an AI assistant against a site | [Agent Skill](skills/cfa-static-site-builder/SKILL.md) |
| Deploy | [README deployment](README.md#deployment); [DevOps walkthrough](https://github.com/codeforamerica/cfa-static/blob/main/src/pages/deploying-sharedservices.md) for the internal pipeline |

The [Site Builder Reference](docs/developer-reference.md) is generated from
`package.json` and the CMS definitions; [BLOCKS_LAYOUT.md](BLOCKS_LAYOUT.md)
is a short navigation page to the block and layout references. If those two
disagree with reality, regenerate rather than trusting either.

## Repository Tour

| Path | What lives there |
| --- | --- |
| `src/pages/` | Site pages: Markdown files whose frontmatter declares `blocks` |
| `src/news/` | Dated news posts; filenames `YYYY-MM-DD-slug.md` supply the date |
| `src/guide-categories/`, `src/guide-pages/` | Categorised documentation pages |
| `src/snippets/` | Reusable regions (`footer-content`, `right-content`) and snippet-block sources, with optional per-language folders |
| `src/images/`, `src/files/`, `src/assets/` | Source media, downloadable files, and static assets such as fonts; copied through to the output |
| `src/_data/` | Site identity and behaviour: `site.json`, `config.json` (fields and settings declared in `src/_lib/config/site-schema.js` and `config-schema.js`), `languages.json`, `translations.json`, `strings.json`, `meta.json`, `blockLayouts.json` |
| `src/_includes/` | Templates, including `design-system/blocks/` — one template per block type |
| `src/_layouts/` | Page shells; `base.html` is the root layout |
| `src/css/` | `theme.scss` (the site's token overrides), prebuilt themes, and the `design-system/` partials the blocks rely on |
| `src/_lib/` | All build-time and browser JavaScript; see the [library map](src/_lib/README.md) |
| `scripts/` | Build wrapper, generators, checks, and tooling |
| `test/` | The suite, its fixtures, and the fork simulation |
| `docs/` | The generated Site Builder Reference, served at `/docs/` on each deployment |
| `skills/cfa-static-site-builder/` | The Agent Skill: workflow, references, and evals |
| `.github/workflows/` | CI and the deployment workflows |
| `.pages.yml` | Generated PagesCMS editing config |
| `.eleventy.js` | Eleventy entry point: plugin and subsystem registration |
| `CLAUDE.md` | Handwritten engineering policy for agents and maintainers |

## What Happens During A Build

`npm run build` runs `scripts/eleventy-build.js`, a fail-fast wrapper around
the Eleventy CLI, then checks every internal link. In order:

1. **Site data validation.** `validateSiteData()` scans the identity files
   for placeholder values before Eleventy starts; then, as Eleventy loads its
   data, `src/_lib/config/validated-config.js` rejects a `site.json` or
   `config.json` key its schema does not declare or a value it does not
   accept (including missing identity: `name`, `url`, `description`), a
   `strings.json` label with no default, and incomplete language labels —
   every problem at once, before any page renders.
2. **Eleventy configuration.** [`.eleventy.js`](.eleventy.js) sets the input
   (`src/`), output (`_site/`), and layout directories, registers path-prefix
   URL rewriting, JSON-LD schema output, RSS, and Markdown amendments, then
   runs each subsystem's `configure*` function — the `CONFIGURATORS` list:
   blocks, breadcrumbs, filters, navigation, news, guides, images, icons,
   SCSS, the style and JS bundlers, the HTML transform, and the
   unused-image report.
3. **Collections and defaults.** Each content directory's data is normalized
   in `src/_lib/collections/` (news dates from filenames, navigation keys,
   guide category links), so fork templates read one shape regardless of what
   an author wrote.
4. **Block validation and defaults.** Every authored block array — page
   frontmatter, snippet blocks, the footer and sidebar regions — is checked
   against the schema registry in `src/_lib/utils/block-schema.js` and has
   omitted fields filled from schema `default`s, nested fields included.
   Unknown block types and unknown top-level keys fail here with the file and
   field named.
5. **Rendering.** `src/_layouts/base.html` provides the HTML shell; block
   arrays flow through `design-system/blocks.html` (which applies the column
   layout matching from `blockLayouts.json`) to
   `design-system/render-block.html` or the full-width renderer, and on to the
   resolved per-block template. The
   [layouts reference](skills/cfa-static-site-builder/references/layouts.md)
   owns this chain in detail, including the section wrapper and column
   semantics.
6. **Images.** Block images go through the shared eleventy-img/sharp
   pipeline: responsive formats and sizes, aspect-ratio cropping, base64 LQIP
   placeholders, and a content-hash cache under `.image-cache/`. The build
   ends with an unused-image report so dead assets cannot accumulate quietly.
7. **HTML transforms.** Output HTML passes through
   `src/_lib/transforms/` in phases: a fast string phase (URL and email
   linkification, external-link attributes) and a DOM phase that only runs
   when a page actually has tables, phone numbers, or local images to wrap.
8. **Bundles.** SCSS compiles the design system and the active theme into
   one stylesheet; browser JavaScript in `src/_lib/public/` bundles with
   esbuild. Fonts and favicon copy through from `src/assets/`.
9. **Search and links.** Pagefind indexes the built pages for the static
   `/search/` page, then `npm run check:links` verifies every internal link,
   including `hreflang` targets, against the routes that were actually
   written.

`npm run serve` runs the same wrapper with Eleventy's dev server and
incremental rebuilds. Both commands fail loudly — the wrapper scans build
output for error patterns and prints a failure banner rather than exiting
cleanly on a broken build.

## The Content Model

A page is frontmatter and nothing else — body Markdown below the closing
delimiter is rejected for pages, news, and guides:

```yaml
---
name: About
permalink: /about/
blocks:
  - type: hero
    content: |
      # About us

      One H1 per page, then a logical heading sequence.
  - type: markdown
    content: |
      ## What we do

      Approved body copy.
---
```

- **Block types** are defined once, in schema modules under
  `src/_lib/utils/block-schema/`, and everything else derives from them: the
  template under `src/_includes/design-system/blocks/`, the SCSS partial
  under `src/css/design-system/`, the generated
  [block reference](skills/cfa-static-site-builder/references/blocks.md), the
  PagesCMS field components, and the `/blocks/` gallery that renders the same
  tested examples.
- **Columns and sidebars** are declarative: `blockLayouts.json` maps page tags
  to column layouts (a claim-queue matcher, documented in the layouts
  reference), and the presence of `src/snippets/right-content.md` switches on
  a site-wide sidebar. Neither needs template edits.
- **Snippets** are shared regions resolved per language:
  `src/snippets/<language>/<name>.md` overrides `src/snippets/<name>.md`.
  `footer-content` and `right-content` are the named global regions.
- **News and guides** are optional collections a site enables through the
  CMS customizer; forks that do not use them delete their demo content, and
  the fork simulation proves the template's own tests still pass afterwards.

## The Editing Layer

PagesCMS provides a graphical, Git-based editing surface over the same
content: `.pages.yml` is generated from the block schemas, the site schema,
and the saved
`cms_config` in `src/_data/site.json`, so the editor's forms always match what
the build validates. `npm run customise-cms` tailors the editor to the
collections and features a site actually uses (interactive, or
non-interactive with `--list-collections`, `--list-features`, and `--dry-run`)
and regenerates the config and its TypeScript declarations together.
Markdown fields always use the visual rich-text editor. CMS
choices control what editors see, not what Eleventy publishes.

## Languages

A page's language is its URL prefix; each language's pages live in a folder
named like the prefix. `src/_data/languages.json` declares every published
language and must translate every chrome label the interface shows — the
build fails on a missing one. `src/_data/translations.json` pairs the pages
that say the same thing, which is what produces reciprocal `hreflang` links,
the `x-default`, and the switcher's targets. Menus, snippets, and labels
resolve per language with no template branching. The
[languages reference](skills/cfa-static-site-builder/references/i18n.md)
owns the full pattern, including the checks to run.

## Theming

All visual tokens are CSS custom properties declared at `:root` in
`src/css/_variables.scss` and overridden by the active
[`src/css/theme.scss`](src/css/theme.scss). A fork restyles a site by
replacing `theme.scss` — starting from a prebuilt theme or the live
`/theme-editor/` page, which previews and exports a complete token set.
Brand fonts are self-hosted: `woff2` files in `src/assets/fonts/`, `@font-face`
rules at the top of `theme.scss`, and the `--font-family-*` tokens pointed at
them. Core design-system files should not be edited for a site's look; the
token system is the intended extension point, and the
[Sass defaults](src/css/_variables.scss) are the reference for what exists.

## Browser JavaScript

The shipped site runs a small set of hand-written, framework-free modules from
`src/_lib/public/`, bundled with esbuild: the disclosure menu (Escape to
close, focus return, `collapse_menu` config), the gallery dialog, the theme
switcher and editor, search results rendering, and scroll-reveal animations
that respect reduced-motion preferences. Interactive components degrade to
native behaviour without JavaScript — menus stay operable as plain
disclosures. There is no framework and no client-side data layer; a page is
usable HTML before any script loads.

## Generated Artifacts

Never hand-edit these; change their sources and regenerate. Freshness tests
compare each artifact against its source and fail on drift:

| Artifact | Generated from | Command |
| --- | --- | --- |
| `skills/cfa-static-site-builder/references/blocks.md` | block schemas and canonical examples | `npm run generate-blocks-reference` |
| `.pages.yml` | block schemas and the saved `cms_config` | `npm run generate-pages-yml` |
| `src/_lib/types/pages-cms-generated.d.ts` | `.pages.yml` | `npm run generate-cms-types` |
| `docs/developer-reference.md` | `package.json`, the shared CMS definitions, and the site and config schemas | `npm run generate-developer-reference` |

`npm run generate-references` runs the three generators in order and stops on
the first failure. After changing a block schema, follow the full protocol in
the [engineering guide](CLAUDE.md): schema module, template, SCSS partial,
then regeneration and review of all four artifacts.

## Quality Gates

`npm test` ([`test/run-tests.js`](test/run-tests.js)) runs checks in parallel
lanes: code-quality tests; Biome lint; Stylelint for SCSS; knip for dead
exports; typecheck plus a strict-mode ratchet; copy-paste detection with its
own deletion-only ratchet; a full build followed by the axe-core WCAG 2.2 AA
audit of every built page; unit tests with coverage thresholds; and
integration tests that spawn real Eleventy builds.

Two properties matter as much as the list:

- **The tests are fork-safe.** They read fixtures from `test/fixtures/`, not
  the fork's own content — in-process imports of `src/_data/*.json` are
  redirected there, and the test-site factory overlays the same fixtures.
  `npm run test:fork` proves it: it deletes the demo content, rewrites site
  data the way a real fork does, and runs the whole suite against the
  result.
- **Ratchets only tighten.** The copy-paste and code-quality baselines are
  deletion-only legacy records; an entry can be removed but a new violation
  cannot be added. Mutation testing (`npm run mutation`) is available to check
  whether tests actually detect changes to production operators.

What the tests mean and how to write good ones is owned by the
[test quality criteria](test/TEST-QUALITY-CRITERIA.md). What automation
cannot settle — rendered contrast, keyboard flow, content accuracy — is
flagged for manual review by the
[verification reference](skills/cfa-static-site-builder/references/verification.md).

## Deployment Boundary

The deliverable is the `_site/` directory: self-contained, no application
server, no build-time secrets. `SITE_URL` stamps the public origin into
canonical URLs, the sitemap, feeds, and social metadata; `PATH_PREFIX`
rewrites internal URLs for hosts that serve the site from a subpath. The
repository ships workflow shapes for both of its supported targets — a public
GitHub Pages deploy on every push to `main`, and a manual internal deploy that
hands the artifact to a platform workflow owning the cloud credentials — plus
CI for builds, tests, dependency scanning, and review tooling. Repository
`docs/` publish alongside the site at `/docs/` on each deployment. To host
anywhere else, run `npm run build` and point any static host or pipeline at
`_site/`. The [DevOps walkthrough](https://github.com/codeforamerica/cfa-static/blob/main/src/pages/deploying-sharedservices.md)
covers the internal pipeline's one-time registration in step-by-step detail.

## Extending The System

- **A new block type:** add the schema module under
  `src/_lib/utils/block-schema/`, register it in
  `src/_lib/utils/block-schema.js`, add the template under
  `src/_includes/design-system/blocks/` and its SCSS partial under
  `src/css/design-system/`, then run `npm run generate-references` and review
  all four artifacts.
- **A new site setting:** declare it in `src/_lib/config/config-schema.js`
  (type, choices, default, description), add it to `SiteConfig` in
  `src/_lib/types/config.d.ts`, read it from the merged `config`, and run
  `npm run generate-references`. A new `site.json` field works the same
  way through `site-schema.js` and `SiteInfo`; give it a `label` to
  expose it in the CMS. The build rejects undeclared settings, so
  a setting with no reader is dead weight a fork will copy.
- **A new filter:** register it in the central registry in
  `src/_lib/eleventy/filters.js` — a gate checks that registered filters have
  template consumers.
- **A new collection:** follow the news/guides pattern — directory data and
  normalization in `src/_lib/collections/`, thin `.11tydata.js` re-exports in
  the content directory, then CMS choices through the customizer.
- **Anything else:** the [engineering guide](CLAUDE.md) owns the change
  workflow, code policy, and testing rules that apply first; this file only
  maps the territory.

## Provenance

CfA Static was derived from the
[Chobble Template](https://github.com/chobbledotcom/chobble-template),
relicensed to MIT by its sole author, and cut down to an informational core:
no e-commerce, no forms, no user-data handling. See [LICENSE](LICENSE).
