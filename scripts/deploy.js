#!/usr/bin/env bun
/**
 * Deploy built site to Bunny CDN using bunny-transfer.
 *
 * Required environment variables:
 *   BUNNY_ACCESS_KEY - Bunny account API Access Key (uuid)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    console.log(`> ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
      } else {
        resolve();
      }
    });
    child.on("error", (err) => {
      reject(new Error(`Failed to start ${command}: ${err.message}`));
    });
  });

const STORAGE_ZONE_NAME = "chobble-example";
const PULL_ZONE_ID = "4582983";

const accessKey = requireEnv("BUNNY_ACCESS_KEY");
const deployDir = resolve("_site");

if (!existsSync(deployDir)) {
  throw new Error(`Deploy directory not found: ${deployDir}`);
}

console.log(`Deploying ${deployDir} to storage zone "${STORAGE_ZONE_NAME}"...`);

await run("bunx", [
  "bunny-transfer",
  "sync",
  deployDir,
  STORAGE_ZONE_NAME,
  `--access-key=${accessKey}`,
]);

console.log("Sync complete.");

console.log(`Purging pull zone ${PULL_ZONE_ID}...`);
await run("bunx", [
  "bunny-transfer",
  "purge",
  PULL_ZONE_ID,
  `--access-key=${accessKey}`,
]);

console.log("Deploy finished successfully.");
