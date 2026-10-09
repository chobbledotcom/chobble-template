/**
 * Dependency check preload script - runs before test setup.
 * Automatically installs dependencies if node_modules is missing.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const projectRoot = ROOT_DIR;

// In-process image work must not seed the checkout's .image-cache, which
// every site build then ships into _site/img/. Redirect it to a per-worker
// directory under the .test-sites root that global-teardown sweeps.
const testSitesRoot = join(projectRoot, "test", ".test-sites");
mkdirSync(testSitesRoot, { recursive: true });
process.env.IMAGE_CACHE_DIR ||= mkdtempSync(
  join(testSitesRoot, "image-cache-"),
);

const nodeModulesPath = join(projectRoot, "node_modules");

if (!existsSync(nodeModulesPath)) {
  console.log("\n⚠ node_modules not found - running npm install...\n");
  try {
    execSync("npm install", { cwd: projectRoot, stdio: "inherit" });
    console.log("\n✓ Dependencies installed successfully\n");
  } catch (error) {
    console.error("\n✗ Failed to install dependencies:", error.message);
    console.error("Please run: npm install\n");
    process.exit(1);
  }
}
