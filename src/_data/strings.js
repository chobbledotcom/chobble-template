/**
 * Merges the base strings with any user-provided strings
 *
 * Usage in templates: {{ strings.product_name }}
 */

const baseStrings = require("./strings-base.json");

let userStrings = {};
try {
	userStrings = require("./strings.json");
} catch (e) {}

module.exports = {
	...baseStrings,
	...userStrings,
};
