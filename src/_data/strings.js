/**
 * Merges the base strings with any user-provided strings
 *
 * Usage in templates: {{ strings.product_name }}
 *
 * All string keys must have defaults in strings-base.json.
 * This is enforced by tests in test/strings.test.js
 */

import baseStrings from "./strings-base.json" with { type: "json" };
import userStrings from "./strings.json" with { type: "json" };

export default {
  ...baseStrings,
  ...userStrings,
};
