/**
 * Merges the base strings with any user-provided strings
 *
 * Usage in templates: {{ strings.product_name }}
 *
 * All string keys must have defaults in strings-base.json.
 * This is enforced by tests in test/strings.test.js
 */

import userStrings from "#data/strings.json" with { type: "json" };
import baseStrings from "#data/strings-base.json" with { type: "json" };

export default {
  ...baseStrings,
  ...userStrings,
};
