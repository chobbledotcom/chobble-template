/**
 * Factory for creating 11tydata.js exports with shared eleventyComputed shape.
 *
 * Most content types need the same boilerplate: import strings, set
 * navigationParent, compute permalink via buildPermalink. This factory
 * eliminates that duplication.
 *
 * @param {string} type - String key prefix (e.g. "event" → strings.event_name,
 *   strings.event_permalink_dir)
 * @param {Record<string, Function>} [extraComputed] - Additional computed
 *   properties merged into eleventyComputed. These override the defaults, so
 *   a custom permalink function can be passed here.
 * @returns {{ eleventyComputed: Record<string, Function> }}
 */
import strings from "#data/strings.js";
import { buildPermalink } from "#utils/slug-utils.js";

const contentTypeData = (type, extraComputed = {}) => {
  const nameKey = `${type}_name`;
  const dirKey = `${type}_permalink_dir`;

  if (!strings[dirKey]) {
    throw new Error(
      `Missing strings.${dirKey} — cannot build content type data for "${type}"`,
    );
  }

  return {
    eleventyComputed: {
      ...(strings[nameKey] ? { navigationParent: () => strings[nameKey] } : {}),
      permalink: (data) => buildPermalink(data, strings[dirKey]),
      ...extraComputed,
    },
  };
};

export { contentTypeData };
