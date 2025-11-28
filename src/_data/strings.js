/**
 * Merges the base strings with any user-provided strings
 *
 * Usage in templates: {{ strings.product_name }}
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import baseStrings from "./strings-base.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

let userStrings = {};
try {
	const userStringsPath = join(__dirname, "./strings.json");
	userStrings = JSON.parse(readFileSync(userStringsPath, "utf-8"));
} catch (e) {}

export default {
	...baseStrings,
	...userStrings,
};
