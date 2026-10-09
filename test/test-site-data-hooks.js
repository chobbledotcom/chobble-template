/**
 * Module resolution hook for test site builds (registered by
 * test-site-data-register.js).
 *
 * A test site symlinks the template's src/_lib, and Node resolves a symlinked
 * module from its real path - so template code importing `#data/config.js`
 * would read the repository's site data, which in a fork is the fork's own.
 * This hook sends every import that lands in the repository's src/_data/ to
 * the same file in the test site's src/_data/ (the factory passes the site's
 * directory as TEST_SITE_DIR) instead, so template code and
 * Eleventy's data cascade both see the data the test wrote.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { SRC_DIR } from "#lib/paths.js";

const REPO_DATA_URL = pathToFileURL(join(SRC_DIR, "_data")).href;
const SITE_DATA_URL = pathToFileURL(
  join(process.env.TEST_SITE_DIR, "src", "_data"),
).href;

/** @type {import("node:module").ResolveHook} */
export const resolve = async (specifier, context, nextResolve) => {
  const resolved = await nextResolve(specifier, context);
  return resolved.url.startsWith(`${REPO_DATA_URL}/`)
    ? { ...resolved, url: resolved.url.replace(REPO_DATA_URL, SITE_DATA_URL) }
    : resolved;
};
