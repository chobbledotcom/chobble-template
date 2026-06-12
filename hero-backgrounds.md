# Hero Internals For Background Blocks

## Goal

Make `video-background` and `image-background` support the same internal content model as `hero`, so background media blocks can use:

- `badge`
- `name`
- `lead`
- `buttons`
- `class`
- `reveal`
- existing markdown `content` as a compatibility fallback

The intent is to let the background blocks collapse down to the current markdown overlay when that is all a site needs, while also unlocking the nicer hero button/action treatment.

## Current State

### Rendering

- `hero` renders structured fields in `src/_includes/design-system/blocks/hero.html`.
- `video-background` renders media plus markdown-only `block.content` in `src/_includes/design-system/blocks/video-background.html`.
- `image-background` renders media plus markdown-only `block.content` in `src/_includes/design-system/blocks/image-background.html`.
- `bunny-video-background` is not named in the immediate request, but it uses the same `.video-background` class and the same `VIDEO_BG_SHARED_FIELDS` field set.

### Schema And Validation

- Block schemas live under `src/_lib/utils/block-schema/`.
- Shared field helpers live in `src/_lib/utils/block-schema/shared.js`.
- `src/_lib/utils/block-schema.js` derives:
  - `BLOCK_SCHEMAS` for allowed keys and runtime field-type validation.
  - `BLOCK_CMS_FIELDS` for `.pages.yml` generation.
  - `BLOCK_DOCS` for `BLOCKS_LAYOUT.md` generation.
- `validateBlocks` rejects unknown keys and invalid value types.
- `validateBlocks` does not currently enforce presence of required schema fields for blocks. The `required` flag affects docs and Pages CMS generation more than runtime content validation.

### Generated Files

These files are generated or checked against generators and must be updated together with schema changes:

- `.pages.yml`
  - Generated from `scripts/customise-cms/generate-full.js` for the full template config.
  - Block component definitions come from `BLOCK_CMS_FIELDS`.
  - Current background `content` fields are `required: true`.
- `src/_lib/types/pages-cms-generated.d.ts`
  - Generated from `.pages.yml` by `scripts/generate-pages-cms-types.js`.
  - Required fields in `.pages.yml` become non-optional TypeScript properties.
- `BLOCKS_LAYOUT.md`
  - Generated from `scripts/generate-blocks-reference.js`.
  - Params come from `BLOCK_DOCS`, which is derived from block schema fields.

### CSS

- `src/css/design-system/_hero.scss` styles `.hero`, `.badge`, `.lead`, and `.actions`.
- `src/css/design-system/_video-background.scss` and `_image-background.scss` use shared overlay styling from `media-background-content` in `src/css/_mixins.scss`.
- `media-background-content` currently assumes a `.prose`-style markdown overlay, but it already has some `.btn` styling inside background overlays.

### Block Layout Rules

- `src/_lib/utils/block-columns.js` treats `hero`, `video-background`, `bunny-video-background`, `image-background`, and `marquee-images` as full-width/column-disallowed block types.
- Those blocks can appear in a layout config's `before` list, but not inside `columns`.
- `src/_lib/utils/sidebar-blocks.js` uses the same column-safety rule for `right-content` sidebar blocks.
- A leading `image-background` has special right-content behavior: when a page has a sidebar, the first block is hoisted above `.page-columns` so it spans both main content and sidebar.
- The hero-internals change should not alter these layout rules. It changes the internal overlay content only.

## Desired Content Contract

Background blocks should accept both the old markdown overlay shape and the new hero-style shape.

Recommended fields for `video-background` and `image-background`:

| Field | Required? | Notes |
|---|---:|---|
| `badge` | no | Same meaning as `hero.badge`. |
| `name` | no | Same meaning as `hero.name`, but optional for backwards compatibility. |
| `lead` | no | Same meaning as `hero.lead`. |
| `buttons` | no | Same `{ text, href, variant, size }` list as `hero.buttons`. |
| `content` | no | Existing markdown overlay. Keep to avoid breaking old content. |
| `class` | no | Existing field. |
| `reveal` | no | Same `data-reveal` behavior as `hero`. |

Media-specific fields stay as they are:

- `video-background`: `video_id`, `thumbnail_url`, `video_title`
- `image-background`: `image`, `image_alt`, `parallax`, `tint`

## Rendering Rules

Use these rules to avoid surprising existing sites:

1. If any hero-style field is present (`badge`, `name`, `lead`, or non-empty `buttons`), render the hero-style overlay.
2. If no hero-style field is present and `content` exists, render the existing markdown overlay.
3. If both hero-style fields and `content` exist, render both, with hero content first and markdown content below, unless there is a strong reason to make `content` fallback-only.

The safest default is to render both when both are provided. It avoids silent content loss during migration and lets editors add extra prose under the hero actions.

## Heading Markup

The current `hero` uses `<h1>`. Background blocks can appear anywhere in a page, so blindly reusing `<h1>` inside every background block can create multiple page-level headings.

Options:

- Reuse `hero` exactly, including `<h1>`.
- Extract hero internals but make the heading tag configurable.
- Use a fixed `<h2>` for background hero overlays.

Recommended default: extract a shared partial with a configurable heading tag.

- `hero.html` passes `heading_tag: "h1"`.
- `video-background.html` and `image-background.html` pass `heading_tag: "h2"`.
- If a block later needs explicit control, add `heading_level` as a separate, constrained field. Do not add that now unless required.

## Implementation Plan

### 1. Extract A Shared Hero Content Partial

Create `src/_includes/design-system/hero-content.html`.

Responsibilities:

- Render optional `badge`.
- Render `name` if present.
- Render optional `lead`.
- Render optional `buttons`.
- Render optional markdown `content` if the caller opts in.

Suggested include interface:

```liquid
{% include "design-system/hero-content.html",
   block: block,
   heading_tag: "h1",
   render_content: false
%}
```

For background blocks:

```liquid
{% include "design-system/hero-content.html",
   block: block,
   heading_tag: "h2",
   render_content: true
%}
```

Implementation notes:

- Liquid dynamic tag names need care. If dynamic tags get awkward, use a small `if heading_tag == "h1"` / `else` branch instead of clever string output.
- Keep `hero.html` as the only place that owns `<header class="hero">`.
- Keep background block templates as the only places that own `.video-background` and `.image-background`.
- Avoid giving the shared partial its own root class that changes layout unless needed.

### 2. Preserve Markdown Fallback

Do not delete `content`.

Change `OVERLAY_CONTENT_FIELDS.content` or the background-specific composition so `content` is no longer `required: true` for the background blocks.

This matters because:

- New hero-style background blocks may have `name`/`lead`/`buttons` but no `content`.
- Current `.pages.yml` marks `content` as required, so Pages CMS would otherwise keep forcing editors to fill a markdown field even when using hero-style internals.
- Existing content with `content` only must continue to validate and render.

### 3. Share Schema Without Duplicating Definitions

In `src/_lib/utils/block-schema/shared.js`, add shared fields rather than copying from `hero.js`.

Suggested structure:

- Keep `BUTTON_FIELDS_WITH_SIZE` as the shared button item shape.
- Add a shared hero field set for required-hero use.
- Add a background variant where `name` is optional.

Possible names:

- `HERO_CONTENT_FIELDS`
- `HERO_BACKGROUND_CONTENT_FIELDS`
- `OPTIONAL_HERO_CONTENT_FIELDS`

Example shape, not exact code:

```js
export const HERO_CONTENT_FIELDS = {
  badge: { ...str("Badge Text"), description: "..." },
  name: { ...NAME_REQUIRED, description: "..." },
  lead: { ...str("Lead Text"), description: "..." },
  buttons: { ...objectList("Buttons", BUTTON_FIELDS_WITH_SIZE), description: "..." },
  reveal: REVEAL_STRING_FIELD,
};

export const HERO_BACKGROUND_CONTENT_FIELDS = {
  ...HERO_CONTENT_FIELDS,
  name: { ...str("Name"), description: "..." },
  content: {
    ...md("Overlay Content"),
    description: "Optional markdown content rendered below hero content, or alone as the legacy fallback.",
  },
};
```

Then:

- `hero.js` can use `HERO_CONTENT_FIELDS` if that does not reduce clarity.
- `video-background.js` and `image-background.js` should use `HERO_BACKGROUND_CONTENT_FIELDS`.
- `VIDEO_BG_SHARED_FIELDS` should include `video_title` plus the background hero content fields.

### 4. Update Background Templates

In `video-background.html` and `image-background.html`:

- Keep the outer root element unchanged:
  - `<div class="video-background...">`
  - `<div class="image-background...">`
- Add `data-reveal="{{ block.reveal }}"` to the outer root when present.
- Replace the current hardcoded markdown-only `figcaption` content with a branch:
  - hero-style branch when hero fields are present.
  - markdown-only fallback branch when only `content` is present.

Suggested markup:

```liquid
{%- assign _has_buttons = block.buttons and block.buttons.size > 0 -%}
{%- assign _has_hero_content = block.badge or block.name or block.lead or _has_buttons -%}

<figure>
  {%- if _has_hero_content -%}
    <figcaption class="background-hero">
      {% include "design-system/hero-content.html",
         block: block,
         heading_tag: "h2",
         render_content: true
      %}
    </figcaption>
  {%- elsif block.content -%}
    <figcaption class="prose">
      {{ block.content | renderContent: "md" }}
    </figcaption>
  {%- endif -%}
</figure>
```

Notes:

- The exact `_has_buttons` Liquid expression may need adjustment if Liquid does not like boolean assignment with `and`. Use a couple of explicit `if` assignments if needed.
- If there is neither hero content nor `content`, decide whether to render an empty `<figure>` or omit it. Prefer omitting/empty-safe rendering so new blocks can be media-only without broken markup.
- Keep `renderContent: "md"` inside a `.prose` element. The code-quality test enforces this.

### 5. Update Hero Template

In `hero.html`:

- Keep existing public output as close as possible.
- Replace inner markup with the shared partial.
- Preserve:
  - `<header class="hero...">`
  - `data-reveal`
  - button class construction
  - `badge`, `lead`, and `actions` class names

This reduces the chance of visual or snapshot drift for existing hero blocks.

### 6. CSS Updates

Update the background overlay styling so both old and new overlay modes are styled.

Likely changes:

- Keep existing `.prose` markdown fallback support.
- Add styles for `.background-hero` or equivalent:
  - centered flex column
  - gap similar to `.hero`
  - max-width similar to `$width-default`
  - `.lead` uses body-lg styling and contrast muted color
  - `.actions` wraps and centers buttons
  - `.badge` remains legible over media
- Ensure button styling inside background overlays still works for:
  - default/primary
  - secondary
  - ghost
  - `size: sm`
  - `size: lg`

Watch for specificity:

- `.design-system .badge` from `_hero.scss` is global inside the design system and may already apply.
- `.design-system .actions` from `_hero.scss` may already apply.
- Do not rely on `.hero .lead`; current `.lead` styling is nested under `.hero`, so background overlays need their own `.lead` styling unless the shared partial adds a reusable class.

### 7. Bunny Video Decision

`bunny-video-background` currently shares `VIDEO_BG_SHARED_FIELDS` and the `.video-background` class.

There are two viable scopes:

1. Include `bunny-video-background` in the same implementation.
   - Pros: all visual video backgrounds behave the same.
   - Pros: shared schema changes probably touch it anyway.
   - Cons: slightly larger change than the user explicitly named.
2. Keep Bunny unchanged.
   - Pros: strict scope.
   - Cons: `VIDEO_BG_SHARED_FIELDS` may need splitting.
   - Cons: docs and editor behavior become inconsistent across two video background blocks.

Recommended default: include `bunny-video-background` if `VIDEO_BG_SHARED_FIELDS` is changed. The user said `*-background bits`, and Bunny is one of them in this codebase.

If Bunny is included:

- Update `src/_includes/design-system/blocks/bunny-video-background.html`.
- Update its docs automatically through schema.
- Add at least one rendering test or fixture.

If Bunny is excluded:

- Split shared fields into:
  - `VIDEO_BG_SHARED_FIELDS` for legacy Bunny
  - a new hero-background field set for `video-background`
- Add a note in `BLOCKS_LAYOUT.md` or code docs explaining the intentional difference.

### 8. Keep Layout Behavior Stable

Do not change:

- `COLUMN_DISALLOWED_TYPES` in `src/_lib/utils/block-columns.js`.
- `isColumnSafeType` behavior.
- `validateSidebarBlocks` behavior.
- `splitHoistedBanner` behavior for leading `image-background`.
- `containerWidth = "full"` on `hero`, `video-background`, `bunny-video-background`, or `image-background`.

Expected layout errors should remain unchanged:

```text
Block type "image-background" is not supported inside the right-content sidebar.
```

```text
Block type "video-background" is not supported inside the configured block columns.
```

Exact wording depends on the caller's `where` string, but the important part is that full-width background blocks remain disallowed in narrow columns even after they gain hero-style internals.

## Generated Artifact Plan

After schema/template updates, regenerate in this order:

```sh
bun run generate-pages-yml
bun run generate-cms-types
bun run generate-blocks-reference
```

For a customized downstream site, prefer:

```sh
bun run customise-cms -- --regenerate
bun run generate-cms-types
bun run generate-blocks-reference
```

Notes:

- `bun run generate-pages-yml` writes the full template `.pages.yml`.
- `bun run customise-cms -- --regenerate` is the safer message for existing sites that have saved CMS config in `site.json`, because it should preserve their selected collections/features.
- `.pages.yml` field order will change for each touched block component. That is expected.
- `src/_lib/types/pages-cms-generated.d.ts` will change because `content` stops being required and new optional fields appear.
- `BLOCKS_LAYOUT.md` must show the new background fields and describe `content` as optional fallback/extra markdown.

## `.pages.yml` Edge Cases

### Old `.pages.yml`, New Code

If an existing site pulls the code changes but does not regenerate `.pages.yml`:

- Existing `content`-only blocks continue to render.
- Pages CMS will not show the new hero fields.
- Pages CMS will still require `content` for background blocks because the old `.pages.yml` says `required: true`.
- A developer can manually add `name`/`buttons` in markdown frontmatter and the site will build because runtime schema accepts those fields, even if Pages CMS does not expose them.

User-facing result: no build error, but the editor UI is stale.

### New `.pages.yml`, Old Code

If a site somehow gets the regenerated `.pages.yml` but not the code/schema/template changes:

- Pages CMS may let editors save `badge`, `name`, `lead`, `buttons`, or `reveal` on background blocks.
- Old runtime validation will reject those as unknown keys.
- Expected build error shape:

```text
Block type "video-background" has unknown keys: "name", "buttons" (block N in path/to/page.md). Allowed keys: ...
```

or:

```text
Block type "image-background" has unknown keys: "badge", "lead" (block N in path/to/page.md). Allowed keys: ...
```

User-facing result: clear build failure until code and generated config are aligned.

### New Code, Old Content

If content remains in schema and templates:

- Existing blocks like this should still build and render:

```yaml
- type: image-background
  image: src/images/city-traffic-night.jpg
  content: |
    ## Image Blocks

    Some markdown.
```

No error expected.

### New Code, Hero-Only Content

Blocks like this should build and render without requiring `content`:

```yaml
- type: image-background
  image: src/images/city-traffic-night.jpg
  badge: Featured
  name: Image Background
  lead: A background block with hero-style internals.
  buttons:
    - text: Learn more
      href: /about/
      variant: primary
```

No error expected after `.pages.yml` has been regenerated.

### Missing All Overlay Content

Blocks like this may exist intentionally for media-only sections:

```yaml
- type: video-background
  video_id: dQw4w9WgXcQ
```

Decision needed:

- Allow media-only backgrounds.
- Or enforce either hero content or markdown content at runtime.

Recommended default: allow media-only backgrounds. Current `validateBlocks` does not enforce required fields anyway, and adding conditional required validation would be a bigger schema feature.

### Invalid Button Shapes

`buttons` is an object list. The existing field-type validation only checks list shape, not nested required item fields.

Risks:

- A button without `text` may render an empty anchor.
- A button without `href` may render `href=""` or `href` as blank depending on template behavior.

Recommended implementation:

- Keep schema item fields as required for Pages CMS.
- In the shared partial, only render a button if both `button.text` and `button.href` exist.
- Optionally add follow-up validation for required nested fields generally, but do not make this background change depend on it.

## Existing Sites And Migration

### What Existing Sites Need To Do

If they only use markdown `content`, they do not need to change frontmatter.

If they want the new UI fields in Pages CMS, they need to regenerate CMS config and generated types:

```sh
bun run customise-cms -- --regenerate
bun run generate-cms-types
```

Template maintainers should also regenerate docs:

```sh
bun run generate-blocks-reference
```

### Migration Examples

Old:

```yaml
- type: video-background
  video_id: dQw4w9WgXcQ
  content: |
    ## YouTube Video Backgrounds

    The same block accepts a YouTube video ID.
```

New:

```yaml
- type: video-background
  video_id: dQw4w9WgXcQ
  badge: Video
  name: YouTube Video Backgrounds
  lead: The same block accepts a YouTube video ID.
  buttons:
    - text: View videos
      href: /videos/
      variant: primary
```

Mixed, allowed during migration:

```yaml
- type: video-background
  video_id: dQw4w9WgXcQ
  badge: Video
  name: YouTube Video Backgrounds
  lead: The same block accepts a YouTube video ID.
  content: |
    Extra markdown detail can live here while migrating.
```

## Error Message Expectations

### Unknown New Fields On Old Code

Cause: content edited with new fields, but the site is still running old schema code.

Expected error:

```text
Block type "video-background" has unknown keys: "badge", "name", "buttons" (block N in path/to/file.md). Allowed keys: ...
```

Action:

- Pull/update code.
- Or remove the new fields.
- Or regenerate from a matching template version.

### Old Required `content` In Pages CMS

Cause: code updated but `.pages.yml` not regenerated.

Expected behavior:

- Build likely still works.
- Pages CMS still asks for required `Overlay Content`.
- Editors cannot comfortably create hero-only background blocks from the UI.

Action:

- Regenerate `.pages.yml`.
- Regenerate `src/_lib/types/pages-cms-generated.d.ts`.

### Missing `content` With Old `.pages.yml`

Cause: editor attempts hero-only background while Pages CMS config is stale.

Expected behavior:

- Pages CMS may block save because `content` is required.
- If content is edited manually in markdown, build should pass after schema update.

Action:

- Regenerate `.pages.yml`.

### Markdown Render Test Failure

Cause: `block.content | renderContent: "md"` moved into a non-`.prose` element.

Expected test failure:

```text
renderContent: "md" is not wrapped in a .prose element
```

Action:

- Wrap markdown output in `.prose`.
- Or intentionally add an allowlist entry only if raw HTML is genuinely intended. That should not be needed here.

## Test Plan

### Focused Unit Tests

Run/update:

```sh
bun test test/unit/utils/block-schema.test.js
bun test test/unit/scripts/customise-cms/blocks.test.js
bun test test/unit/code-quality/block-markdown-rendering.test.js
bun test test/unit/utils/pages-yml-block-sync.test.js
bun test test/unit/utils/block-docs.test.js
bun test test/unit/code-quality/pages-yml-freshness.test.js
bun test test/unit/code-quality/type-generation-freshness.test.js
```

Add or adjust tests for:

- `video-background` accepts `badge`, `name`, `lead`, `buttons`, and `reveal`.
- `image-background` accepts `badge`, `name`, `lead`, `buttons`, and `reveal`.
- `content` is accepted but not required in generated CMS fields.
- `.pages.yml` `block_video_background` and `block_image_background` include the new fields.
- `pages-cms-generated.d.ts` marks new fields optional and no longer requires `content` on touched background blocks.
- Markdown-only background content still renders through `renderContent: "md"` inside `.prose`.

### Rendering/Build Tests

Add a fixture or update an existing one to cover:

- markdown-only fallback
- hero-only overlay
- mixed hero plus markdown overlay
- buttons with primary, secondary, ghost, and size variants where practical
- image background with `tint`
- image background with `parallax`
- video background with thumbnail
- Bunny background if included

Then run:

```sh
bun run build
```

or the narrower build/integration tests if full build is too expensive.

### Visual Checks

If this is implemented, visually inspect:

- desktop image background
- mobile image background
- desktop video background
- mobile video background
- long button text wrapping
- no overlay text overflowing the media container
- contrast with and without `tint`

## Documentation Updates

`BLOCKS_LAYOUT.md` should be regenerated, not hand-edited.

Expected docs changes:

- `video-background` summary should mention hero-style overlay content and markdown fallback.
- `image-background` summary should mention hero-style overlay content and markdown fallback.
- Params should include:
  - `badge`
  - `name`
  - `lead`
  - `buttons`
  - `content`
  - `class`
  - `reveal`
- `content` should no longer show as required for these blocks.
- If Bunny is included, `bunny-video-background` should show the same overlay params.

Also update `src/pages/chobble-template.md` examples so the demo page exercises the new contract.

## Recommended Defaults

- Make `name` optional for background blocks.
- Make `content` optional for background blocks.
- Render both hero fields and markdown `content` when both are provided.
- Use `h2` for background hero overlays via a configurable shared partial.
- Include `bunny-video-background` if the shared video background schema is changed.
- Keep old root classes and media markup unchanged.
- Regenerate and commit `.pages.yml`, `src/_lib/types/pages-cms-generated.d.ts`, and `BLOCKS_LAYOUT.md` with the implementation.

## Implementation Checklist

1. Add `hero-content.html` shared partial.
2. Refactor `hero.html` to use it without changing output materially.
3. Add shared hero/background field sets in `shared.js`.
4. Update `video-background.js` schema.
5. Update `image-background.js` schema.
6. Decide and update `bunny-video-background.js` if included.
7. Update `video-background.html`.
8. Update `image-background.html`.
9. Update `bunny-video-background.html` if included.
10. Update overlay SCSS/mixins for hero-style overlay content.
11. Update demo content in `src/pages/chobble-template.md`.
12. Run `bun run generate-pages-yml`.
13. Run `bun run generate-cms-types`.
14. Run `bun run generate-blocks-reference`.
15. Run focused tests.
16. Run build or relevant integration tests.
17. Review generated diffs for `.pages.yml`, generated types, and docs before committing.
