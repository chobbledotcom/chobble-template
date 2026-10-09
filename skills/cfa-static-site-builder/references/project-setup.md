# Project Setup And Configuration

Read this reference when starting a site, changing its editable collections,
setting brand or language data, or preparing deployment.

## Confirm Or Establish The Fork

A valid project root contains:

- `package.json` with `"name": "cfa-static"`
- `src/_data/site.json`
- `src/pages/`
- `BLOCKS_LAYOUT.md`
- `package-lock.json`

Use the Node.js version declared by the checkout's `package.json`, npm, and a
POSIX-compatible shell. Do not substitute Bun, Yarn, or pnpm. The checkout's
`docs/developer-reference.md` is the Site Builder Reference, with installation,
selected site-building commands, CMS options, and links to authoring and theme sources.
Installing dependencies normally requires network access.

For a new site, the durable model is a GitHub fork of
`codeforamerica/cfa-static`. Confirm the destination owner and repository name
before creating anything. If GitHub CLI is authenticated and the user approves,
`gh repo fork codeforamerica/cfa-static --clone` is the default starting point.
Otherwise ask the user to create and clone the fork. Do not silently create a
plain upstream clone as the site's long-term repository.

After cloning:

```bash
npm install
```

Keep the template repository as an `upstream` remote only if the site owner
wants to pull reviewed template updates later.

## Capture The Site Decisions

Before replacing content, establish:

| Decision | Destination |
|---|---|
| Name, canonical URL, description, logo, socials | `src/_data/site.json` (every field is listed under Site Identity in `docs/developer-reference.md`) |
| Navigation/search/theme behavior | `src/_data/config.json` (every setting is listed under Site Configuration in `docs/developer-reference.md`) |
| News/guide labels and permalink segments | `src/_data/strings.json` |
| Chrome labels such as home, breadcrumbs, and skip links | `src/_data/languages.json` |
| Organization/schema metadata | `src/_data/meta.json` |
| Published languages and chrome labels | `src/_data/languages.json` |
| Equivalent pages across languages | `src/_data/translations.json` |
| Site-wide block columns | `src/_data/blockLayouts.json` |
| Colors, fonts, spacing, radii | `src/css/theme.scss` |

Use exact user-supplied values. `site.json` requires a real `name`, `url`, and
`description`. The URL must be an HTTP(S) base URL without trailing slash,
query, fragment, surrounding whitespace, or an example hostname.

Organization metadata is optional. Omit facts that are not known instead of
inventing founders, addresses, phone numbers, or dates.

Inspect `src/_data/strings-base.json` before adding a string override; arbitrary
keys do not make templates consume a new label.

## Choose Collections And CMS Features

The CMS customizer controls what editors see; it also regenerates `.pages.yml`
and the matching TypeScript declarations. Inspect the live choices rather than
copying a stale list:

```bash
npm run customise-cms -- --list-collections
npm run customise-cms -- --list-features
```

Useful non-interactive patterns:

```bash
# Preview a simple pages + news setup
npm run customise-cms -- --collections news --dry-run

# Enable news and guides with page-level FAQs and galleries
npm run customise-cms -- --collections news,guide-categories,guide-pages --enable faqs,galleries --quiet

# Enable everything except page-level FAQs
npm run customise-cms -- --all --disable faqs --quiet

# Rebuild artifacts from the saved cms_config
npm run customise-cms -- --regenerate --quiet
```

`pages` and `snippets` are always included. Selecting `guide-pages` also pulls
in `guide-categories`. Use a dry run when the requested editing surface is
ambiguous, inspect the output, then run the writing command. The writing path
saves `cms_config` in `site.json` and regenerates both CMS artifacts.

Do not enable collections merely because they exist. A brochure site may need
only pages. Enable news only for dated publishing and feeds; enable guides only
for categorized documentation. These choices change PagesCMS, not Eleventy
publication. To remove news or guides from a site, also remove their demo
content, listing pages, navigation entries, and related links such as RSS where
the brief does not require them. Confirm the resulting routes after building.

## Navigation And Information Architecture

Page navigation is declared in frontmatter:

```yaml
eleventyNavigation:
  key: About
  order: 2
```

Use short, unique labels and deliberate ordering. Avoid putting utility pages
such as search, accessibility statements, or privacy details in primary
navigation unless the brief calls for them. Nest a page under another with
`parent: <key>`; a menu entry that links off-site is a page with
`permalink: false`, `layout: false`, and `eleventyNavigation.url`.

The header is configured, not edited:

- `logo` in `site.json` (a path under `src/images/`) adds the logo, linked
  to the home page.
- `collapse_menu` in `config.json` folds the menu behind a toggle button:
  `mobile` (default) below the md breakpoint, `always` at every width, or
  `never`. The toggle, a close button, Escape, and focus leaving the menu all
  close it. Style `.site-menu`, `.menu-toggle`, and `.menu-close` in the
  theme, for example as a full-screen overlay.
- `show_breadcrumbs` adds a breadcrumb trail; a page opts out with
  `no_breadcrumbs: true`.

Override `src/_includes/navigation-start.html` or `navigation-end.html` only
for header content these settings cannot produce.

Internal links should be site-relative (`/about/`), never hardcoded deployment
origins. The build rewrites them for `PATH_PREFIX` deployments.

## Theme And Brand

Start with `src/css/theme.scss`. The repository also includes prebuilt
`src/css/theme-*.scss` files and a live `/theme-editor/` that exports a complete
theme file.

For a new visual direction:

1. derive color, type, density, and image treatment from the brief
2. choose the closest existing theme or use the theme editor
3. replace `theme.scss` with the exported tokens
4. add component CSS only for requirements tokens cannot express
5. check desktop and mobile output, focus states, contrast, and long text

Do not mix multiple prebuilt themes or add arbitrary one-off values throughout
block styles. Preserve the token system.

Brand fonts are self-hosted: put the `woff2` files in `src/assets/fonts/`,
declare them with `@font-face` at the top of `theme.scss`, and point
`--font-family-body` and `--font-family-heading` at them. A CSS `@import`
of a font service does not work there, because the theme is compiled into the
middle of the bundle. Other small treatments are tokens too, such as
`--breadcrumb-separator` (a CSS string, `"/"` by default).

## Languages

Read [languages](i18n.md) before adding a language: the URL and folder
convention, every label `languages.json` must translate, translation pairs,
per-language menus and snippets, and the checks to run.

## Deployment

The default deployment publishes to SharedServices, CfA's Okta-protected
internal hosting: `sharedservices-deploy.yaml` builds `_site/` and hands the
artifact to the platform's shared static deployment workflow, which holds the
AWS credentials, S3 sync, and cache invalidation. Deployment is manual and
requires one-time platform registration; see the
[README deployment guidance](../../../README.md#deployment) for setup.

The bundled GitHub Pages workflow also publishes a public deployment on every
push to `main`. The user must enable **Settings > Pages > Source: GitHub
Actions** once. Inspect the selected workflow rather than assuming all
deployment targets use the same runner or credentials.

Both workflow shapes provide `SITE_URL` for canonical URLs, sitemap entries,
feeds, and schema metadata; Pages project subpaths additionally set
`PATH_PREFIX` for URL rewriting. SharedServices serves each app at the root
of its own subdomain, so no `PATH_PREFIX` applies there.

For another static host, publish the generated `_site/` directory. There is no
application server. Building public site content does not require a backend
secret, but deployment authentication depends on the selected host and workflow.

Do not change runners, permissions, domains, or repository settings without a
specific request. Report an unconfigured runner as a deployment prerequisite,
not as a successful setup.

## Site README

A fork inherits a `README.md` describing CfA Static itself, including a
"Starting a site from this template" section that stops making sense once the
fork *is* the site. Replace it. Left alone it tells every later reader and
agent they are looking at the template, and it hides every decision this site
made.

Rewrite it to cover:

| Section | Content |
|---|---|
| What this site is | Real name, public URL, and a one-line purpose |
| Provenance | Built from CfA Static, linked, and the fact that template updates arrive only through a reviewed `upstream` merge |
| Customisations | How the site departs from template defaults: collections and CMS features enabled or removed, theme and brand changes, config toggles, and any custom blocks, includes, or snippets |
| Working on it | `CLAUDE.md`, `docs/developer-reference.md`, the skill's generated `references/blocks.md`, the `/blocks/` gallery, and `src/_data/` |
| Checks | The commands that gate this site, plus any that are known to fail and why |
| Deployment | Where the site publishes, and what a deploy needs |

Keep the pointers a later agent depends on. The [generated block reference](blocks.md),
schema modules, and block gallery stay the authority on block fields, so link
them instead of summarising them. `BLOCKS_LAYOUT.md` remains a navigation page.
A field list copied into the README goes
stale silently the next time a schema changes, and a stale copy is consulted
just as confidently as a fresh one.

Describe only what the site actually does. A README promising news, guides,
search, or languages the fork deleted is worse than the template's, because it
reads as deliberate rather than as leftovers. Where a template default was
reversed on purpose, give the reason in one line — that is the part a later
reader cannot reconstruct from the diff. The same applies to a check the site
cannot pass: record which one and why, so nobody rediscovers it as a mystery
failure.

Update the README in the same pass as the change that dates it, and treat a
site whose README still describes the template as unfinished.
