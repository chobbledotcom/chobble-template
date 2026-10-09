/**
 * Rewrites one repository-relative link target for a published page.
 *
 * External, site-absolute, and same-page targets pass through; a target in
 * the published routes maps to its route; any other repository file links
 * to GitHub; anything else fails the build rather than silently publishing
 * a broken link.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/** Where repository files that publish no route are linked. */
export const GITHUB_BASE = "https://github.com/codeforamerica/cfa-static";

/** External URLs, protocol-relative URLs, site routes, and fragments. */
const UNRESOLVED = /^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;

/**
 * @param {string} target Link target from the source markdown
 * @param {{ sourcePath: string, routes: Record<string, string>, rootDir: string }} options
 * @returns {string} The published target
 */
export const publishedTarget = (target, { sourcePath, routes, rootDir }) => {
  if (routes[target]) return routes[target];
  if (UNRESOLVED.test(target)) return target;
  const [path, ...rest] = target.split("#");
  const fragment = rest.length > 0 ? `#${rest.join("#")}` : "";
  const from = resolve(rootDir, dirname(sourcePath));
  const repoPath = relative(rootDir, resolve(from, path)).split(sep).join("/");
  if (repoPath.startsWith("..")) {
    throw new Error(
      `docs link escapes the repository: ${target} (in ${sourcePath})`,
    );
  }
  const route = routes[repoPath];
  if (route) return `${route}${fragment}`;
  const absolute = join(rootDir, repoPath);
  if (!existsSync(absolute)) {
    throw new Error(
      `docs link target does not exist: ${target} (in ${sourcePath})`,
    );
  }
  const kind = statSync(absolute).isDirectory() ? "tree" : "blob";
  return `${GITHUB_BASE}/${kind}/${repoPath}${fragment}`;
};
