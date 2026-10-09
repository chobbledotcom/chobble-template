/* jscpd:ignore-start -- block schema declaration data */
/**
 * Block schema definitions for design system blocks.
 *
 * Each block module in `./block-schema/<type>.js` exports:
 *   - `type`   — block type slug
 *   - `fields` — unified field definitions (CMS + doc info per key)
 *   - `docs`   — metadata (summary, scss, htmlRoot, notes)
 *   - `example` — canonical block YAML data for the gallery and skill reference
 *   - optionally `template` and `collections` — dispatch override and CMS allowlist
 *   - optionally `containerWidth` ("full" | "narrow"; defaults to "wide")
 *   - optionally `columnSafe` (false for blocks that need the full width, so
 *     block-columns layouts and the sidebar reject them; defaults to true)
 *
 * This file aggregates them into:
 *   - `BLOCK_SCHEMAS`    — field definitions per type, used for allowed-key
 *     checks, runtime value-shape validation, and default filling. Indexed
 *     by block type; each entry maps field name → `{ type, list?, ... }`.
 *   - `BLOCK_CMS_FIELDS` — CMS field definitions (for .pages.yml generation)
 *   - `BLOCK_DOCS`       — documentation for the generated skill block reference
 *   - per-type lookups (`getBlockTemplate`, `getBlockContainerWidth`,
 *     `isColumnSafeBlock`) that throw on unknown types
 *   - `normaliseBlocks` / `applyBlockDefaults` — the single path every
 *     authored block takes before rendering
 */

import * as callout from "#utils/block-schema/callout.js";
import * as codeBlock from "#utils/block-schema/code-block.js";
import * as cta from "#utils/block-schema/cta.js";
import * as downloads from "#utils/block-schema/downloads.js";
import * as faqs from "#utils/block-schema/faqs.js";
import * as features from "#utils/block-schema/features.js";
import * as gallery from "#utils/block-schema/gallery.js";
import * as guideCategories from "#utils/block-schema/guide-categories.js";
import * as guideHeader from "#utils/block-schema/guide-header.js";
import * as guideNavigation from "#utils/block-schema/guide-navigation.js";
import * as guidePagesList from "#utils/block-schema/guide-pages-list.js";
import * as hero from "#utils/block-schema/hero.js";
import * as html from "#utils/block-schema/html.js";
import * as iconLinks from "#utils/block-schema/icon-links.js";
import * as iframeEmbed from "#utils/block-schema/iframe-embed.js";
import * as imageBackground from "#utils/block-schema/image-background.js";
import * as imageCards from "#utils/block-schema/image-cards.js";
import * as include from "#utils/block-schema/include.js";
import * as items from "#utils/block-schema/items.js";
import * as itemsArray from "#utils/block-schema/items-array.js";
import * as itemsTextList from "#utils/block-schema/items-text-list.js";
import * as linkButton from "#utils/block-schema/link-button.js";
import * as linkColumns from "#utils/block-schema/link-columns.js";
import * as markdown from "#utils/block-schema/markdown.js";
import * as marqueeImages from "#utils/block-schema/marquee-images.js";
import * as newsMeta from "#utils/block-schema/news-meta.js";
import * as sectionHeader from "#utils/block-schema/section-header.js";
import { CONTAINER_FIELDS } from "#utils/block-schema/shared.js";
import * as snippet from "#utils/block-schema/snippet.js";
import * as splitCallout from "#utils/block-schema/split-callout.js";
import * as splitCode from "#utils/block-schema/split-code.js";
import * as splitFull from "#utils/block-schema/split-full.js";
import * as splitHtml from "#utils/block-schema/split-html.js";
import * as splitIconLinks from "#utils/block-schema/split-icon-links.js";
import * as splitImage from "#utils/block-schema/split-image.js";
import * as stats from "#utils/block-schema/stats.js";
import * as tableOfContents from "#utils/block-schema/table-of-contents.js";

/**
 * Iteration order determines the order that `scripts/generate-blocks-reference.js`
 * emits block types into skills/cfa-static-site-builder/references/blocks.md,
 * so keep it intentional rather than alphabetical.
 */
const BLOCK_MODULES = [
  sectionHeader,
  features,
  imageCards,
  stats,
  codeBlock,
  hero,
  splitImage,
  splitCode,
  splitIconLinks,
  splitHtml,
  splitCallout,
  splitFull,
  cta,
  callout,
  imageBackground,
  items,
  itemsArray,
  itemsTextList,
  linkColumns,
  markdown,
  tableOfContents,
  html,
  iframeEmbed,
  include,
  newsMeta,
  faqs,
  guideCategories,
  guideHeader,
  guideNavigation,
  guidePagesList,
  linkButton,
  gallery,
  marqueeImages,
  iconLinks,
  downloads,
  snippet,
];

/**
 * @typedef {(typeof BLOCK_MODULES)[number]} BlockModule
 */

/**
 * @template T
 * @param {(module: BlockModule) => T} getValue
 * @returns {Record<string, T>}
 */
const indexByType = (getValue) =>
  Object.fromEntries(BLOCK_MODULES.map((m) => [m.type, getValue(m)]));

const BLOCK_SCHEMAS = indexByType((m) => m.fields);

const VALID_TYPES_MESSAGE = `Valid types: ${Object.keys(BLOCK_SCHEMAS).join(", ")}`;

/**
 * Indexes one module property by type and returns its lookup. The lookup
 * throws on unknown types, so a typo in a template or layout config fails
 * loudly rather than resolving to `undefined`.
 * @template T
 * @param {(module: BlockModule) => T} getValue
 * @returns {(blockType: string) => T}
 */
const lookupByType = (getValue) => {
  const index = indexByType(getValue);
  return (blockType) => {
    if (!(blockType in index)) {
      throw new Error(
        `Unknown block type "${blockType}". ${VALID_TYPES_MESSAGE}`,
      );
    }
    return index[blockType];
  };
};

/** @type {(blockType: string) => "full" | "wide" | "narrow"} */
const getBlockContainerWidth = lookupByType((m) =>
  "containerWidth" in m ? m.containerWidth : "wide",
);

/**
 * Include-relative template path for a block type, e.g.
 * `"design-system/blocks/hero.html"`. A module exports `template` only when
 * several types share one template (every figure `split-*` variant renders
 * through `design-system/split.html`).
 * @type {(blockType: string) => string}
 */
const getBlockTemplate = lookupByType((m) =>
  "template" in m ? m.template : `design-system/blocks/${m.type}.html`,
);

/**
 * Whether a block type may render inside a block-columns layout or the
 * narrow right-content sidebar. Full-bleed and two-pane blocks opt out.
 * @type {(blockType: string) => boolean}
 */
const isColumnSafeBlock = lookupByType((m) =>
  "columnSafe" in m ? m.columnSafe : true,
);

/**
 * Collection allowlist per block type. `null` means the block is available on
 * every collection; an array restricts it to the listed collections.
 * @param {BlockModule} m
 * @returns {string[] | null}
 */
const allowedCollections = (m) => ("collections" in m ? m.collections : null);

const getAllowedCollections = lookupByType(allowedCollections);

/**
 * Returns true when `blockType` is allowed on the given collection.
 * Unrestricted blocks are allowed on every collection.
 * @param {string} blockType
 * @param {string} collectionName
 */
const isBlockAllowedIn = (blockType, collectionName) => {
  const allowed = getAllowedCollections(blockType);
  return allowed === null || allowed.includes(collectionName);
};

/**
 * CMS-exposed (labelled) fields with the doc-only `description` and the
 * pipeline-applied `default` stripped, recursing into nested fields.
 * @param {Record<string, any>} fields
 * @returns {Record<string, any>}
 */
const toCmsFields = (fields) =>
  Object.fromEntries(
    Object.entries(fields)
      .filter(([, f]) => "label" in f)
      .map(([key, { description, default: _default, ...cmsProps }]) => [
        key,
        cmsProps.fields
          ? { ...cmsProps, fields: toCmsFields(cmsProps.fields) }
          : cmsProps,
      ]),
  );

const BLOCK_CMS_FIELDS = indexByType((m) =>
  toCmsFields({ ...CONTAINER_FIELDS, ...m.fields }),
);

/**
 * @typedef {Object} BlockDoc
 * @property {string} summary
 * @property {string} [scss]
 * @property {string} [htmlRoot]
 * @property {string} [notes]
 */

/** @type {Record<string, BlockDoc>} */
const BLOCK_DOCS = indexByType((m) => m.docs);

/** @param {readonly string[]} arr */
const quoteJoin = (arr) => arr.map((k) => `"${k}"`).join(", ");

/**
 * @typedef {Record<string, unknown>} Block
 */

/** @param {string} t @returns {(v: unknown) => boolean} */
const isTypeof = (t) => (v) => typeof v === t;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Per-field-type runtime checks. `image` stores a path string;
 * `reference` stores a collection item slug; `markdown` stores markdown
 * source text passed to markdown-it — all plain strings at runtime.
 * @type {Record<string, { label: string, check: (v: unknown) => boolean }>}
 */
const FIELD_TYPE_CHECKS = {
  string: { label: "a string", check: isTypeof("string") },
  markdown: { label: "a string", check: isTypeof("string") },
  image: { label: "a string", check: isTypeof("string") },
  reference: { label: "a string", check: isTypeof("string") },
  number: { label: "a number", check: isTypeof("number") },
  boolean: { label: "a boolean", check: isTypeof("boolean") },
  object: {
    label: "an object",
    check: isObject,
  },
};

const LIST_CHECK = { label: "an array", check: Array.isArray };

/**
 * Converts a `{type, list?}` field definition map to `[key, spec]` pairs
 * for constructing a per-block lookup table. The returned spec is
 * `undefined` when the declared type has no known runtime check.
 *
 * @param {object} defs
 */
const specEntries = (defs) =>
  Object.entries(defs).map(([k, d]) => [
    k,
    d.list ? LIST_CHECK : FIELD_TYPE_CHECKS[d.type],
  ]);

/** Wrapper keys (`dark`, `compact`) accepted on every block. */
const COMMON_SPEC_ENTRIES = specEntries(CONTAINER_FIELDS);

/**
 * Pre-computed per-block lookup of `fieldName -> { label, check }`. Built
 * once at module load so `validateBlock` can do a straight dictionary
 * lookup per field instead of branching on `type` + `list` at runtime.
 *
 * @type {Record<string, Record<string, { label: string, check: (v: unknown) => boolean }>>}
 */
const BLOCK_FIELD_SPECS = Object.fromEntries(
  Object.entries(BLOCK_SCHEMAS).map(([blockType, fieldDefs]) => [
    blockType,
    Object.fromEntries([...specEntries(fieldDefs), ...COMMON_SPEC_ENTRIES]),
  ]),
);

/**
 * @param {string} blockType
 * @param {unknown} child
 * @param {any} field
 * @param {string} path
 * @param {string} key
 * @param {string} ctx
 */
const collectNestedRequiredErrors = (
  blockType,
  child,
  field,
  path,
  key,
  ctx,
) => {
  if (field.type !== "object" || !field.fields) return [];
  const childPath = path ? `${path}.${key}` : key;
  const children = field.list ? child : [child];
  if (!Array.isArray(children)) return [];

  /** @param {number} index */
  const nestedPathFor = (index) =>
    field.list ? `${childPath}[${index}]` : childPath;

  /** @param {unknown} item */
  const allowsPipeDelimitedItem = (item) => {
    if (!field.allowPipeDelimitedItems || typeof item !== "string") {
      return false;
    }
    const parts = item.split("|");
    return parts.length === 2 && parts.every((part) => part.trim().length > 0);
  };

  const expectedItemType = () =>
    field.allowPipeDelimitedItems
      ? "an object or pipe-delimited string"
      : "an object";

  /** @param {unknown} item @param {number} index */
  const collectItemErrors = (item, index) => {
    const nestedPath = nestedPathFor(index);
    if (isObject(item)) {
      return collectRequiredFieldErrors(
        blockType,
        item,
        field.fields,
        nestedPath,
        ctx,
      );
    }
    if (!field.list) return [];
    if (allowsPipeDelimitedItem(item)) return [];

    return [
      `Block "${blockType}" field "${nestedPath}" must be ${expectedItemType()}${ctx}`,
    ];
  };

  return children.flatMap(collectItemErrors);
};

/**
 * Recursively checks required fields declared by a block schema. Optional
 * object parents only impose their child requirements when the parent exists.
 * @param {string} blockType
 * @param {Record<string, unknown>} value
 * @param {Record<string, any>} fields
 * @param {string} path
 * @param {string} ctx
 * @returns {string[]}
 */
const collectRequiredFieldErrors = (blockType, value, fields, path, ctx) =>
  Object.entries(fields).flatMap(([key, field]) => {
    const child = value[key];
    const location = path ? ` "${path}"` : "";
    const isMissing =
      child === undefined ||
      child === null ||
      (typeof child === "string" && child.trim() === "");
    if (field.required && isMissing) {
      return [
        `Block "${blockType}"${location} is missing required "${key}" field${ctx}`,
        ...collectNestedRequiredErrors(blockType, child, field, path, key, ctx),
      ];
    }
    return collectNestedRequiredErrors(blockType, child, field, path, key, ctx);
  });

/** @type {Array<(block: Block, specs: Record<string, { label: string, check: (value: unknown) => boolean }>, ctx: string) => string[]>} */
const BLOCK_ERROR_COLLECTORS = [
  (block, specs, ctx) => {
    const unknown = Object.keys(block).filter(
      (key) => key !== "type" && !(key in specs),
    );
    return unknown.length > 0
      ? [
          `Block type "${block.type}" has unknown keys: ${quoteJoin(unknown)}${ctx}. Allowed keys: ${quoteJoin(Object.keys(specs))}`,
        ]
      : [];
  },
  (block, specs, ctx) =>
    Object.entries(block).flatMap(([key, value]) => {
      const spec = specs[key];
      if (!spec || value === undefined || value === null || spec.check(value)) {
        return [];
      }
      return [
        `Block "${block.type}" field "${key}" must be ${spec.label} but got ${Array.isArray(value) ? "array" : typeof value}${ctx}`,
      ];
    }),
  (block, _specs, ctx) =>
    collectRequiredFieldErrors(
      String(block.type),
      block,
      BLOCK_SCHEMAS[String(block.type)],
      "",
      ctx,
    ),
];

/**
 * Validates a single block against its schema.
 *
 * @param {Block} block - Block to validate
 * @param {string} ctx - Context suffix for error messages
 * @returns {string[]} Array of error strings; empty means valid
 */
const validateBlock = (block, ctx) => {
  if (typeof block.type !== "string") {
    return [`Block is missing required "type" field${ctx}`];
  }

  const specs = BLOCK_FIELD_SPECS[block.type];
  if (!specs) {
    return [`Unknown block type "${block.type}"${ctx}. ${VALID_TYPES_MESSAGE}`];
  }
  return BLOCK_ERROR_COLLECTORS.flatMap((collect) =>
    collect(block, specs, ctx),
  );
};

/**
 * Collects validation errors for an array of blocks without throwing.
 * @param {Block[]} blocks - Array of blocks to validate
 * @param {string} context - Context for error messages (e.g., file path)
 * @returns {string[]} Array of error strings
 */
const collectBlockErrors = (blocks, context = "") =>
  blocks.flatMap((block, index) =>
    validateBlock(block, ` (block ${index + 1}${context})`),
  );

/**
 * Validates an array of blocks against their schemas.
 * Collects all errors across all blocks before throwing so the user sees
 * every problem in one build rather than one at a time.
 *
 * @param {Block[]} blocks - Array of blocks to validate
 * @param {string} context - Context for error messages (e.g., file path)
 * @throws {Error} If any block contains unknown keys or invalid type
 */
const validateBlocks = (blocks, context = "") => {
  const errors = collectBlockErrors(blocks, context);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
};

/**
 * A supplied value with its nested fields' defaults filled: each object of
 * an object list, or the object itself, recursively. Other values pass
 * through unchanged.
 * @param {{ fields?: Record<string, any>, list?: boolean }} field
 * @param {unknown} value
 * @returns {unknown}
 */
const fillValue = (field, value) => {
  if (field.list && Array.isArray(value)) {
    return value.map((item) => fillValue({ fields: field.fields }, item));
  }
  return field.fields && isObject(value)
    ? fillDefaults(field.fields, value)
    : value;
};

/**
 * Returns `owner` with every omitted field filled from its schema `default`,
 * recursing into supplied objects and object lists so nested fields (such as
 * a button's variant) are filled too. A function default derives its value
 * from the object that owns the field.
 * @param {Record<string, any>} fields
 * @param {Record<string, unknown>} owner
 * @returns {Record<string, unknown>}
 */
const fillDefaults = (fields, owner) => ({
  ...owner,
  ...Object.fromEntries(
    Object.entries(fields).flatMap(([key, field]) => {
      const value = owner[key];
      if (value !== undefined) return [[key, fillValue(field, value)]];
      if (!("default" in field)) return [];
      return [
        [
          key,
          typeof field.default === "function"
            ? field.default(owner)
            : field.default,
        ],
      ];
    }),
  ),
});

/**
 * Fills a validated block's omitted fields, common wrapper fields included,
 * from its schema defaults, so templates never restate them.
 * @param {Block} block
 * @returns {Block}
 */
const applyBlockDefaults = (block) =>
  fillDefaults(
    { ...CONTAINER_FIELDS, ...BLOCK_SCHEMAS[String(block.type)] },
    block,
  );

/**
 * Validates blocks and fills their defaults: the one path authored blocks
 * take before rendering, whether they come from page frontmatter or a
 * snippet.
 * @param {Block[]} blocks
 * @param {string} context - Context for error messages (e.g., file path)
 * @returns {Block[]}
 */
const normaliseBlocks = (blocks, context) => {
  validateBlocks(blocks, context);
  return blocks.map(applyBlockDefaults);
};

/**
 * Canonical example per block type, in BLOCK_MODULES order. Each entry's
 * `example` is a valid `blocks[]` entry: the block gallery page renders
 * them live and the test suite validates every one against its schema,
 * so each type always has one demonstrable, working usage.
 */
const BLOCK_EXAMPLES = BLOCK_MODULES.map((m) => ({
  type: m.type,
  summary: m.docs.summary,
  collections: allowedCollections(m),
  example: m.example,
}));

export {
  applyBlockDefaults,
  BLOCK_CMS_FIELDS,
  BLOCK_DOCS,
  BLOCK_EXAMPLES,
  BLOCK_SCHEMAS,
  collectBlockErrors,
  getBlockContainerWidth,
  getBlockTemplate,
  isBlockAllowedIn,
  isColumnSafeBlock,
  normaliseBlocks,
  validateBlocks,
};
/* jscpd:ignore-end */
