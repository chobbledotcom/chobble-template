/**
 * Dependency check preload script - runs before test setup.
 * Automatically installs dependencies if node_modules is missing.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const nodeModulesPath = join(projectRoot, "node_modules");

if (!existsSync(nodeModulesPath)) {
  console.log("\n⚠ node_modules not found - running bun install...\n");
  try {
    execSync("bun install", { cwd: projectRoot, stdio: "inherit" });
    console.log("\n✓ Dependencies installed successfully\n");
  } catch (error) {
    console.error("\n✗ Failed to install dependencies:", error.message);
    console.error("Please run: bun install\n");
    process.exit(1);
  }
}
