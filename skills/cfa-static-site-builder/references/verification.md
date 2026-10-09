# Verification

Read this reference before declaring a CfA Static site task complete. Run
commands from the repository root.

## Validation Loop

1. Make one coherent group of changes.
2. Run the narrowest relevant check.
3. Fix the source of every failure; do not add fallbacks or exclusions to hide
   invalid content.
4. Build and inspect the affected routes.
5. Run the final checks once the implementation is stable.

## Command Matrix

| Change | During iteration | Before handoff |
|---|---|---|
| Content or site data | `npm run build` | `npm run build`, `npm run check:a11y` |
| Theme or SCSS | targeted build/SCSS test | `npm run build`, `npm run lint:scss`, `npm run check:a11y` |
| Frontend JavaScript | targeted Vitest file | `npm test` |
| Eleventy, collections, config, media | targeted unit/integration tests | `npm test` |
| Block schema/template | targeted block tests plus generators | `npm test` |
| CMS generator | targeted CMS tests plus artifact generation | `npm test` |
| Deployment/path behavior | path-prefix integration test | `npm test`, production build |

Use targeted Vitest commands while iterating:

```bash
npx vitest run test/unit/path/to/feature.test.js
npx vitest run test/integration/eleventy/path-prefix.test.js
```

Run the full suite only once at the end of broad or code-level work:

```bash
npm test
```

## Generated Artifacts

After changing schemas or other generated-reference inputs, regenerate all
references and CMS artifacts:

```bash
npm run generate-references
```

Its three steps generate the block reference, PagesCMS config plus CMS types,
and Site Builder Reference in order, stopping on failure. CMS artifacts use the saved
`cms_config`; the command does not change the selected collections or features.
Individual generator commands remain available for focused work.

The block generator owns `references/blocks.md` inside this skill, not
`BLOCKS_LAYOUT.md` or the authored `layouts.md` companion. The Site Builder
Reference derives only from `package.json` and shared CMS definition modules.

Freshness checks compare generated content without rewriting either reference.
Precommit does not regenerate stale artifacts; regenerate and re-stage them
before retrying. Skill packaging checks validate metadata, links, and evaluation
definitions; they do not run an agent against the evaluation scenarios or prove
task success.

Never repair generated output by hand. Change its source inputs or saved
`cms_config`, regenerate, and inspect the diff.

## Build And Accessibility

`npm run build` clears and writes `_site/`, runs Pagefind, and checks internal
links. A successful process is necessary but not sufficient.

Then run:

```bash
npm run check:a11y
```

This audits every built page against WCAG 2.2 AA rules that axe can evaluate.
Manually review qualities automation cannot settle: color contrast in rendered
themes, keyboard flow, image meaning, content clarity, and responsive layout.

## Inspect The Output

For each affected route, verify:

- exactly one appropriate H1 and a logical heading sequence
- primary navigation and breadcrumbs point to the intended routes
- internal links and assets include the correct project prefix when applicable
- images have useful alt text, dimensions, and responsive sources
- calls to action are accurate and not duplicated excessively
- empty news/guide/listing states do not leave misleading copy or broken grids
- title, description, canonical URL, hreflang, and schema metadata are factual
- mobile content order remains meaningful

Use the development server or built HTML as appropriate. If screenshots are
enabled, inspect them rather than treating capture success as visual approval.

## Project-Path Check

When the site is served from a subpath, rely on the
existing integration test. For an extra production smoke test, use a valid
public site base URL with no trailing slash:

```bash
PATH_PREFIX=/project/ SITE_URL=https://site.invalid/project npm run build
```

Check representative HTML, feed, search, redirect, image, font, canonical, and
schema URLs for exactly one `/project/` prefix.

## Failure Triage

- **Placeholder site data:** replace or remove the reported publishable value;
  do not weaken `scripts/site-data.js`.
- **Unknown block/key:** compare the content with [the block reference](blocks.md) and the
  schema module named by the block.
- **Missing required field:** add factual content or choose a block that does
  not require that field.
- **Missing download/image:** fix the source path and passthrough configuration.
- **Internal link failure:** correct the source route or preserve the old route
  with a redirect.
- **Generated freshness failure:** regenerate from the source inputs or saved CMS
  configuration.
- **Accessibility failure:** fix the rendered semantic cause, then rerun the
  audit across the whole site.

## Handoff Evidence

State exactly which commands ran and whether they passed. If a useful check was
not run, say why. Identify content, design, translation, privacy, or deployment
decisions that still need a human; do not imply automated checks reviewed them.
