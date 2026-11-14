/**
 * Loaded with `node --import` into every test site build: points template
 * code's site-data imports at the test site's own data (see
 * test-site-data-hooks.js).
 */
import { register } from "node:module";

register("./test-site-data-hooks.js", import.meta.url);
