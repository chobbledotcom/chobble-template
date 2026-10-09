#!/usr/bin/env node

/**
 * Biome runner pinned to the version in devDependencies.
 *
 * Prefers the statically linked musl binary shipped at the pinned version:
 * it starts on any Linux — including NixOS, where the dynamically linked
 * glibc build cannot run — and skips npx startup cost. Falls back to npx
 * everywhere else (macOS, Windows, installs without the musl package), so
 * every environment lints with the exact same version instead of whatever
 * `biome` happens to be on PATH. (Both paths are invisible to knip, so
 * @biomejs/biome sits in its ignoreDependencies.)
 *
 * Usage: node scripts/biome.js <biome args...>
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { runTool } from "#scripts/lib/run-tool.js";

const args = process.argv.slice(2);

const muslBiome = join(
  ROOT_DIR,
  "node_modules",
  "@biomejs",
  "cli-linux-x64-musl/biome",
);

const muslBiomeStarts = () =>
  existsSync(muslBiome) &&
  spawnSync(muslBiome, ["--version"], { cwd: ROOT_DIR }).status === 0;

process.exit(
  muslBiomeStarts()
    ? runTool(muslBiome, args)
    : runTool("npx", ["@biomejs/biome", ...args]),
);
