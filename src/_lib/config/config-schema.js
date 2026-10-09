/**
 * Every setting `src/_data/config.json` accepts, declared once.
 *
 * Each entry gives the setting's value type (`list: true` for an array of
 * that type), the values it may take when the set is fixed (`choices`), the
 * default an omitted or null value takes, and what it does. Everything else
 * derives from this table: the merged defaults (`DEFAULTS`), the startup
 * validation in `#config/validated-config.js` (unknown keys, wrong types,
 * values outside `choices`; see `#config/data-schema.js`), and the settings table in the generated Site
 * Builder Reference. A site's config.json holds only what it changes.
 */
import { schemaErrors } from "#config/data-schema.js";
import { frozenObject, mapObject } from "#utils/fp/object.js";

/** @typedef {import("#config/data-schema.js").DataField} DataField */

/* jscpd:ignore-start -- config schema declaration data */
/** @type {Record<string, DataField>} */
const CONFIG_SCHEMA = {
  horizontal_nav: {
    type: "boolean",
    default: true,
    description:
      "Lay the main menu out across the header; `false` uses a left-hand menu column.",
  },
  sticky_mobile_nav: {
    type: "boolean",
    default: true,
    description: "Keep the header pinned to the top of the screen on mobile.",
  },
  collapse_menu: {
    type: "string",
    choices: ["mobile", "always", "never"],
    default: "mobile",
    description:
      "Where the menu folds behind a toggle button. Without JavaScript the menu stays expanded.",
  },
  language_switcher: {
    type: "string",
    choices: ["footer", "header"],
    default: "footer",
    description:
      "Where the language switcher renders on a site with more than one language.",
  },
  show_breadcrumbs: {
    type: "boolean",
    default: false,
    description:
      "Render a breadcrumb trail (and its BreadcrumbList JSON-LD) on every page but the home page; a page opts out with `no_breadcrumbs`.",
  },
  navigation_content_anchor: {
    type: "boolean",
    default: false,
    description:
      "Append `#content` to internal menu, breadcrumb, and listing links so they land past the header.",
  },
  nav_thumbnails: {
    type: "boolean",
    default: false,
    description:
      "Show a thumbnail beside each nested (dropdown) menu entry that has one.",
  },
  enable_theme_switcher: {
    type: "boolean",
    default: false,
    description:
      "Compile every prebuilt theme into the stylesheet and render a switcher that lets visitors choose one.",
  },
  placeholder_images: {
    type: "boolean",
    default: true,
    description:
      "Give a page with no thumbnail or gallery image a generated placeholder thumbnail.",
  },
  list_item_fields: {
    type: "string",
    list: true,
    choices: ["thumbnail", "link", "date", "subtitle"],
    default: ["thumbnail", "link", "date", "subtitle"],
    description:
      "Which parts of an item a collection listing renders, in order.",
  },
  search_collections: {
    type: "string",
    list: true,
    default: ["news", "pages", "guide-pages", "guide-categories"],
    description:
      "Collection tags whose pages the static search indexes; a page opts out with `no_index`.",
  },
  homepage_footer_markdown: {
    type: "string",
    default: null,
    description: "Markdown rendered in the footer of the home page only.",
  },
  linkify_urls: {
    type: "boolean",
    default: true,
    description: "Turn bare URLs and email addresses in page text into links.",
  },
  externalLinksTargetBlank: {
    type: "boolean",
    default: false,
    description:
      'Open external links in a new tab (`target="_blank"` with `rel="noopener noreferrer"`).',
  },
  phoneNumberLength: {
    type: "number",
    default: 0,
    description:
      "Digit count of the phone numbers to turn into `tel:` links; `0` turns phone linking off.",
  },
  screenshots: {
    type: "object",
    default: {},
    description:
      "Post-build page screenshots: `enabled` and `autoCapture` switch capture on; `collections` or `pages` choose the pages; `outputDir`, `port`, `viewport`, `timeout`, and `limit` tune the run.",
  },
  disable_liquid_cache: {
    type: "boolean",
    default: false,
    description: "Turn off Liquid template caching while debugging templates.",
  },
};
/* jscpd:ignore-end */

/** The value every setting takes when config.json omits it or sets null. */
const DEFAULTS = frozenObject(
  mapObject((key, setting) => [key, setting.default])(CONFIG_SCHEMA),
);

/**
 * Every problem with a config.json object: unknown keys, then each set value
 * that does not fit its setting. Null keeps the default and is accepted.
 */
const configErrors = schemaErrors("config.json", CONFIG_SCHEMA);

export { CONFIG_SCHEMA, configErrors, DEFAULTS };
