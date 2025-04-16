/**
 * Merges the base strings with any user-provided strings
 *
 * Usage in templates: {{ strings.product_name }}
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseStringsPath = path.join(__dirname, "strings-base.json");
const userStringsPath = path.join(__dirname, "strings.json");

// Read base strings
const baseStringsContent = fs.readFileSync(baseStringsPath, "utf8");
const baseStrings = JSON.parse(baseStringsContent);

// Read user strings if they exist
let userStrings = {};
try {
  if (fs.existsSync(userStringsPath)) {
    const userStringsContent = fs.readFileSync(userStringsPath, "utf8");
    userStrings = JSON.parse(userStringsContent);
  }
} catch (e) {
  console.error("Error loading strings.json:", e);
}

export default {
  ...baseStrings,
  ...userStrings,
};