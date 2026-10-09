---
name: cfa-static-site-builder
description: >-
  Use this skill to create, redesign, migrate, or edit a website built with
  CfA Static: site identity, information architecture, pages, news, guides,
  schema-validated content blocks, navigation, branding, themes, languages,
  search, PagesCMS setup, deployment, and launch checks. Use it for generic
  website requests when the current workspace is a CfA Static fork, even if
  the user does not name the template. Also use it to handle requests for
  forms, ecommerce, accounts, databases, or server-side processing on a CfA
  Static site without crossing the template's static boundary. Do not use it
  for unrelated Eleventy projects.
license: MIT
compatibility: Requires git, npm, the Node.js version declared by the checkout's package.json, a POSIX-compatible shell, and a CfA Static fork or checkout. Network access may be needed to clone, install dependencies, fetch an uncached icon or remote asset, or deploy.
metadata:
  author: chobbledotcom
  version: "1.1.0"
  repository: https://github.com/codeforamerica/cfa-static
---

# CfA Static Site Builder

Build small informational and marketing sites by editing a fork of CfA Static.
Run project commands from the CfA Static repository root, not from this skill's
directory.

## Scope

CfA Static produces a static `_site/` artifact. It has no form backend,
ecommerce, accounts, database, or user-data handling. If a request needs those
capabilities, explain the boundary and offer a static alternative such as a
link to an external service. Do not quietly add a server-side subsystem.

## Operating Rules

- Treat the site as a fork of CfA Static, never as an npm dependency.
- Use supplied facts and assets. Never invent contact details, people,
  addresses, testimonials, statistics, legal claims, or organization history.
- Prefer the existing block vocabulary. Read the generated
  [block reference](references/blocks.md) before authoring a block instead of
  guessing its fields. Read [layouts](references/layouts.md) for columns,
  sidebars, and rendering context.
- Pages, news, guide categories, and guide pages are block-only. Do not add
  Markdown body content below their frontmatter. Snippet body content is the
  intentional exception.
- Do not hand-edit `.pages.yml`, `references/blocks.md`, the checkout's
  `docs/developer-reference.md`, or `src/_lib/types/pages-cms-generated.d.ts`;
  regenerate them from source. `BLOCKS_LAYOUT.md` is an authored navigation
  page, not generated output.
- Preserve existing user changes and the site's visual language unless the
  user asks for a redesign.
- Follow the checked-out repository's `CLAUDE.md` and local instructions when
  changing code. They override examples in this skill if the template evolves.

## Workflow

For a new site, migration, redesign, or cross-cutting change, track these stages
and do not skip validation:

- [ ] Establish the project and worktree state
- [ ] Extract the site brief and identify missing facts
- [ ] Plan collections, sitemap, navigation, and block outlines
- [ ] Configure site data and CMS editing
- [ ] Author content, assets, and theme changes
- [ ] Rewrite `README.md` to describe the site rather than the template
- [ ] Build, inspect, and validate the finished site

For a localized correction, use the proportional path: establish context,
inspect the affected source and schema, make the smallest edit, build, and
inspect the affected route. Do not create a site-wide plan for a typo or broken
link.

### 1. Establish Context

1. Locate the repository root. Confirm `package.json` names `cfa-static` and
   that `src/_data/site.json`, `src/pages/`, and `BLOCKS_LAYOUT.md` exist.
2. Read `CLAUDE.md`, `README.md`, `src/_data/site.json`,
   `src/_data/config.json`, and the relevant existing content files.
3. Inspect git status before editing. Do not discard unrelated changes.
4. If there is no CfA Static checkout, read
   [project setup](references/project-setup.md) and establish a fork before
   authoring the site.

### 2. Turn the Request Into a Brief

Derive as much as possible from the user's request and supplied files. Ask only
for facts or decisions that block implementation:

- real site name, public URL, and concise description
- audience, primary goal, and primary calls to action
- required pages and whether news or guides are needed
- approved copy, contact routes, organization metadata, and media
- brand direction, language requirements, and deployment target

If factual content is missing, omit the optional section or ask for it. Do not
publish plausible-looking filler. For a migration, inventory the source pages,
assets, redirects, and metadata before mapping them into CfA Static.

### 3. Plan Before Editing

For a new site, migration, redesign, or cross-cutting change, create a compact
implementation map covering:

1. sitemap and navigation order
2. enabled collections and CMS features
3. one block outline per page
4. shared snippets and reusable assets
5. theme direction and any multilingual page pairs

For an existing site, match nearby content patterns. For a new or explicitly
redesigned site, choose a deliberate visual direction rather than using every
available block or producing a generic hero/cards/CTA sequence.

Read [project setup](references/project-setup.md) when changing identity,
collections, CMS features, themes, languages, or deployment. Read
[content authoring](references/content-authoring.md) before creating or
migrating content files. Read [languages](references/i18n.md) for a site in
more than one language, and [site mirroring](references/site-mirroring.md) to
rebuild an existing site page for page.

### 4. Configure and Author

1. Set the real identity in `src/_data/site.json` before the first build. Keep
   the URL free of a trailing slash, query string, or fragment.
2. When the CMS collection or feature set changes, use the non-interactive
   `npm run customise-cms` CLI. Discover accepted values with
   `--list-collections` and `--list-features`; preview uncertain choices with
   `--dry-run`.
3. Edit the supported news/guide labels and permalinks in
   `src/_data/strings.json`, chrome labels in `src/_data/languages.json`,
   feature toggles in `src/_data/config.json` (each setting is listed in the
   Site Builder Reference, `docs/developer-reference.md`),
   and optional organization
   metadata in `src/_data/meta.json`.
4. Author pages from schema-valid blocks. Build after each coherent group of
   edits so validation errors stay local.
5. Put local media in `src/images/`, write meaningful alt text, and let the
   provided image shortcodes and block templates produce responsive output.
6. Use existing themes and tokens before adding custom CSS. Use raw HTML,
   includes, or new block types only when the existing vocabulary cannot meet
   the requirement cleanly.
7. Rewrite `README.md` so it describes this site. A fork that keeps the
   template's README tells the next reader it is a template, hides the
   decisions this site actually made, and leaves them guessing which
   deviations are deliberate. Record what the site is, how it departs from
   template defaults, and where its schemas and checks live, following
   [project setup](references/project-setup.md).

### 5. Validate the Result

Read [verification](references/verification.md) before finalizing. At minimum:

```bash
npm run build
npm run check:a11y
```

Inspect the generated pages relevant to the task, not only the command exit
codes. Confirm headings, navigation, links, responsive media, metadata, and
empty collection states. For code or schema changes, run targeted tests while
iterating and `npm test` once at the end.

### 6. Hand Off

Report:

- pages, content collections, data, and theme files changed
- routes added or redirected
- commands and checks that passed
- whether `README.md` now describes the site, and which customisations it
  records
- factual, visual, accessibility, or deployment decisions still needing human
  review

Do not commit, push, deploy, or alter repository settings unless the user asks.

## Gotchas

- `site.json` identity is required and placeholder identities fail the build.
- `SITE_URL` overrides the public site base URL during deployment;
  `PATH_PREFIX` controls project-subpath URLs. A project site's `SITE_URL`
  includes that subpath. Do not bake a deployment prefix into content links.
- `pages` and `snippets` are required CMS collections. `guide-pages` depends on
  `guide-categories`.
- CMS collection choices control the editor, not what Eleventy publishes.
- A `faqs` block with no `items` intentionally reads page-level `faqs`.
- Stats may use objects or exactly `"value|label"`; other object lists require
  object entries.
- Top-level block keys are rejected when unknown, but nested object typos are
  not all detected. Compare nested fields with the schema and inspect output.
- News dates normally come from `YYYY-MM-DD-slug.md` filenames.
- `_site/` is generated output. Fix source files rather than patching it.
