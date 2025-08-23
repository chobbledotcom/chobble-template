/**
 * Merges the base strings with any user-provided strings
 *
 * Usage in templates: {{ strings.product_name }}
 */

import baseStrings from "./strings-base.json" with { type: "json" };
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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
