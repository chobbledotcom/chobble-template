# Engineering Guide

CfA Static is an Eleventy template for informational and marketing sites, with
schema-validated YAML content blocks, multilingual publishing, responsive media,
themes, search, and a generated PagesCMS editing layer. It is not an e-commerce,
form-processing, or user-data application.

This is the canonical handwritten engineering policy and workflow. Consult:

- [Site Builder Reference](docs/developer-reference.md) for the Node requirement, installation, selected site-building commands, CMS options, and authoring links.
- [Architecture walkthrough](ARCHITECTURE.md) for how the whole system fits together, from content files to deployable artifact.
- [package.json](package.json) for all scripts and import aliases; [biome.json](biome.json) for configured lint rules and scopes; [FP source JSDoc](src/_lib/utils/fp/) for helper APIs.
- [Library map](src/_lib/README.md) for architecture and extension points.
- [Test quality criteria](test/TEST-QUALITY-CRITERIA.md) for the mandatory test standards. Apply every criterion; do not duplicate that checklist elsewhere.
- [Block reference](skills/cfa-static-site-builder/references/blocks.md) for the generated content model and block authoring API; [layouts](skills/cfa-static-site-builder/references/layouts.md) for authored rendering guidance.

## Change Workflow

1. Read the relevant source, tests, and configuration before editing. Follow surrounding conventions and preserve unrelated worktree changes.
2. Make the smallest correct change. Prefer existing helpers and clear, small functions over new abstractions or duplicated logic.
3. Add behavioral tests using the canonical test criteria and the shared helpers exported by `#test/test-utils.js`.
4. Run focused tests while iterating, then the relevant quality gates and lint. Regenerate affected artifacts and check the diff.
5. Run the full `npm run test` once at the end before committing. Report commands, results, and any verification that could not run. Commit only when requested.

Use **npm** for all package management. Install with `npm install`; see the
generated reference for the current Node requirement and command definitions. Do
not describe scripts from memory.

## Code Policy

- Use Node subpath import aliases from `package.json` wherever an alias applies, including dynamic and side-effect imports. Repository paths come from `ROOT_DIR` in `#lib/paths.js`, not `process.cwd()`.
- Prefer arrow functions, `const`, curried helpers, and immutable transformations: `map`/`filter` for transformations, `flatMap` for combined filtering/expansion, `reduce` for aggregation, and `Object.fromEntries` for object construction. Use `pipe` when it makes a transformation clearer; do not force composition or extract helpers solely to add indirection.
- `.push()` and other mutation-style escapes are gated by `test/unit/code-quality/` tests with distinct scopes, exempt directories, and allowlists. Read the failing gate before choosing an implementation, including inside reducers.
- Biome and code-quality tests are complementary. Read `biome.json` for actual Biome limits and overrides, not an invented universal scope. Do not broaden enforcement or weaken checks merely to accommodate a change.
- Site settings are declared once in `#config/config-schema.js` and site identity fields in `#config/site-schema.js`; they supply defaults, validation, the CMS site editor, and generated documentation. Add a key there and to `SiteConfig` or `SiteInfo` together with the code that reads it; never read an undeclared `config` or `site` key.
- Keep HTML rendering in templates under `src/_includes/`; use existing block, shortcode, and filter registration patterns. Remove dead/commented-out code rather than retaining it as documentation.
- Stacked containers such as `.prose`, `.block-column`, and `.hero` space their children with a flex `gap`. Change spacing by overriding the gap. Do not add vertical margins to the children: a child margin adds to the gap, so the spacing doubles. The one exception is extra space before a section, and that rule's comment must show the sum, for example `25px gap + 35px = 60px`.

Generic functional helpers live under `#utils/fp/`; consult the generated export
index and source JSDoc for APIs rather than copying stale utility inventories.
Create cached helpers at module scope so calls reuse the cache; use
reference-based caching for collection lookups where appropriate.

### Fail Fast, Never Mask

Unexpected or invalid state must throw a clear error at its origin. Do not hide
errors behind fallback objects, empty collections, placeholder labels, or
`{ ok: false, error }` results that callers can silently ignore. Let errors
propagate unless the boundary has an explicit, justified recovery contract.

Normalize legitimate content defaults early in the data chain, generally in
collections, rather than scattering defensive defaults through renderers. The
related gates encode these boundaries in their scopes: the generic FP library is
not the site-data chain, and external input or browser storage may need boundary
validation without weakening the gates.

`test/code-quality/code-quality-exceptions.js` is a deletion-only legacy baseline,
not a place to approve new violations: a per-entry ratchet fails on any entry the
baseline has not recorded, and deletions must be locked into the baseline it
prints; suggested updates only remove recorded entries and never approve new
ones. A genuine file rename or shifted line requires an explicitly reviewed
baseline update. Each gate also reports stale entries. If a check appears wrong,
demonstrate the false positive and discuss a targeted correction; do not add
exceptions or convert thrown failures to default values.

## Testing Workflow

Vitest configuration lives in `vitest.config.js`; shared factories and cleanup
helpers live in `test/test-utils/` and are re-exported by `#test/test-utils.js`.
Use them to exercise production behavior and isolate resources. Follow
[all mandatory test criteria](test/TEST-QUALITY-CRITERIA.md).

Tests travel with every site forked from the template, so they test the
template, never the site's content. Site data comes from
`test/fixtures/site-data/` (in-process imports and test-site builds are both
redirected there), images and files from `test/fixtures/`, and collection
directory data from `#collections/directory-data.js`. Only checks of a site's
own generated artifacts, such as `.pages.yml` against its `site.json`, read the
real files. `npm run test:fork` deletes the demo content, rewrites the site data
the way a fork does, and runs the whole suite against that copy; CI runs it on
every pull request.

**Do not run `npm run test` repeatedly to diagnose one issue.** Start with a
file, test name, or subsystem:

```sh
node node_modules/vitest/vitest.mjs run test/unit/utils/slug-utils.test.js
node node_modules/vitest/vitest.mjs run test/unit/utils/slug-utils.test.js -t "specific test name"
node node_modules/vitest/vitest.mjs run test/unit/collections/
node node_modules/vitest/vitest.mjs run test/unit/code-quality/
```

Invoke vitest through `node` and npm through `npm run` as shown: agent
permission profiles allow `node`, `npm run`, `npm install`, and `npm ci`, but
not `npx` or bare `npm` forms such as `npm test`.

For lint, use `npm run lint` and `npm run lint:fix`, or scope the repository's
Biome runner to changed JavaScript files: `node scripts/biome.js check <paths>`.
Inspect formatter changes rather than modifying unrelated files.

When the full suite is needed, capture its output once and inspect that log
instead of rerunning it through successive filters. Keep temporary logs outside
the worktree, for example under `/tmp/opencode/`.

Mutation testing checks whether tests detect changes to production operators:

```sh
npm run mutation -- src/_lib/utils/slug-utils.js test/unit/utils/slug-utils.test.js
npm run mutation -- 'src/_lib/eleventy/*.js' 'test/unit/eleventy/*.test.js' --exhaustive
```

Investigate survivors; a survivor is not automatically a missing test or an
equivalent change. Proven-equivalent mutants (no input can distinguish them)
belong in `scripts/mutation/equivalent-mutants.txt`, whose entries are validated
by the mutation tooling. This is separate from the deletion-only code-quality
baseline. Never weaken production mutation/style gates to satisfy mutation tests.

## Generated Artifacts

Edit sources, never generated output by hand. After block schema changes:

1. Update `src/_lib/utils/block-schema/<type>.js` and register new modules in `src/_lib/utils/block-schema.js`.
2. Add/update `src/_includes/design-system/blocks/<type>.html` and the matching SCSS partial under `src/css/design-system/`.
3. Run `npm run generate-references`. Its three steps generate the block reference, PagesCMS config plus CMS types, and the Site Builder Reference in order, stopping on failure. Review all four artifacts: `skills/cfa-static-site-builder/references/blocks.md`, `.pages.yml`, `src/_lib/types/pages-cms-generated.d.ts`, and `docs/developer-reference.md`. The freshness gates' failure messages name the regeneration command when an artifact drifts.

The block reference is wholly generated. `BLOCKS_LAYOUT.md` is a handwritten
navigation page; the skill's `SKILL.md`, layout guidance, and other workflow
references remain handwritten. Edit those directly when procedures change.

`docs/developer-reference.md` is wholly owned by
`scripts/generate-developer-reference.js`. Regenerate it with
`npm run generate-references` (or `npm run generate-developer-reference` for this file alone)
after changing its `package.json`, shared CMS definition, or config and site
schema (`#config/config-schema.js`, `#config/site-schema.js`) inputs. Its freshness test
compares in memory without rewriting the committed file. Keep policy here and
test criteria in their canonical handwritten document, not in generated facts.
