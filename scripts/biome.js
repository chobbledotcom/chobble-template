#!/usr/bin/env node

/**
 * Biome runner that prefers the local native binary.
 *
 * If `biome` exists on PATH, use it. That keeps Nix dev shells on the native
 * package even for CI-style checks. If it is missing, fall back to the npm
 * package so hosted CI can run without a separate Biome install step.
 *
 * Usage: node scripts/biome.js <biome args...>
 */

import { spawnSync } from "node:child_process";

const hasCommand = (name) => {
  const result = spawnSync("which", [name], { stdio: "ignore" });
  return result.status === 0;
};

const args = process.argv.slice(2);
const useLocal = hasCommand("biome");

const result = useLocal
  ? spawnSync("biome", args, { stdio: "inherit" })
  : spawnSync("bunx", ["@biomejs/biome@2.4.11", ...args], { stdio: "inherit" });

process.exit(result.status ?? 1);
