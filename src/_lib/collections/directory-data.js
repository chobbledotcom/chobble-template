import strings from "#data/strings.js";
import { linkableContent } from "#utils/linkable-content.js";
import {
  buildNavigation,
  withNavigationAnchor,
} from "#utils/navigation-utils.js";
import {
  buildPermalink,
  normalisePermalink,
  normaliseSlug,
} from "#utils/slug-utils.js";

/**
 * Directory data for every content collection, keyed by the directory under
 * src/ that holds it.
 *
 * Each `src/<collection>/<collection>.11tydata.js` only re-exports its entry
 * here, so the collection's behaviour is template code while its directory
 * holds nothing but content. A site that drops a collection deletes the
 * directory without deleting logic its tests (or a later re-enable) rely on;
 * the test site factory writes the same one-line re-export into the sites it
 * builds.
 */

/** @param {*} data */
const categorySlug = (data) =>
  data["guide-category"] ? normaliseSlug(data["guide-category"]) : undefined;

/** @param {*} data */
const propertySlug = (data) =>
  data.property ? normaliseSlug(data.property) : undefined;

const DIRECTORY_DATA = {
  pages: {
    tags: ["pages"],
    eleventyComputed: {
      /** @param {*} data */
      name: (data) => data.name || data.meta_title,
      /** @param {*} data */
      navigationParent: (data) => data.eleventyNavigation?.parent || null,
      /**
       * An authored permalink (or permalink: false), else where the file sits
       * under src/pages: src/pages/es/acerca.md publishes at /es/acerca/ and
       * an index.md at its folder's URL, so a page in a language folder lands
       * under that language's prefix without anyone writing a permalink.
       * @param {*} data
       */
      permalink: (data) =>
        data.permalink === false || data.permalink
          ? normalisePermalink(data.permalink)
          : `${data.page.filePathStem.replace(/^\/[^/]+/, "").replace(/\/index$/, "")}/`,
    },
  },
  news: {
    tags: ["news"],
    ...linkableContent("news", {
      date: (data) => data.page.date,
    }),
  },
  "guide-pages": {
    tags: ["guide-pages"],
    ...linkableContent("guide", {
      "guide-category": categorySlug,
      parentGuideCategory: categorySlug,
      property: propertySlug,
      // Paginated reference pages carry their document's title and subtitle
      // as the pagination alias `doc`; other pages pass their own through.
      name: (data) => data.doc?.name || data.name,
      subtitle: (data) => data.doc?.subtitle || data.subtitle,
      permalink: (data) =>
        buildPermalink(
          data,
          `${strings.guide_permalink_dir}/${categorySlug(data) ?? "uncategorized"}`,
        ),
    }),
  },
  "guide-categories": {
    tags: ["guide-categories"],
    ...linkableContent("guide", {
      property: propertySlug,
      eleventyNavigation: (data) =>
        buildNavigation(data, (d) => {
          // A category tied to one property belongs in that property's
          // guide, reached from the property page, not in the site-wide
          // navigation.
          if (d.property) return false;
          return withNavigationAnchor(d, {
            key: d.name,
            parent: d.strings.guide_name,
            order: d.link_order || 0,
          });
        }),
    }),
  },
  snippets: {
    permalink: false,
    layout: null,
    eleventyExcludeFromCollections: false,
  },
};

/**
 * The directory data for one collection's `src/<collection>/` directory, or
 * undefined for a directory that is not a template collection.
 * @param {string} collection
 */
const directoryData = (collection) =>
  /** @type {Record<string, object | undefined>} */ (DIRECTORY_DATA)[
    collection
  ];

export { directoryData };
