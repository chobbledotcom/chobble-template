#!/usr/bin/env bun
import { spawn } from "node:child_process";
/**
 * Deploy built site to Bunny CDN using bunny-transfer.
 *
 * Required environment variables:
 *   BUNNY_ACCESS_KEY        - Bunny account API Access Key (uuid)
 *   BUNNY_STORAGE_ZONE_NAME - Name of the Bunny storage zone
 *
 * Optional environment variables:
 *   BUNNY_PULL_ZONE_ID      - Pull zone ID to purge after sync
 *   DEPLOY_DIR              - Directory to deploy (default: _site)
 */
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

const accessKey = requireEnv("BUNNY_ACCESS_KEY");
const storageZoneName = requireEnv("BUNNY_STORAGE_ZONE_NAME");
const pullZoneId = process.env.BUNNY_PULL_ZONE_ID;
const deployDir = resolve(process.env.DEPLOY_DIR || "_site");

if (!existsSync(deployDir)) {
  throw new Error(`Deploy directory not found: ${deployDir}`);
}

console.log(`Deploying ${deployDir} to storage zone "${storageZoneName}"...`);

await run("npx", [
  "--yes",
  "bunny-transfer@latest",
  "sync",
  deployDir,
  storageZoneName,
  `--access-key=${accessKey}`,
]);

console.log("Sync complete.");

if (pullZoneId) {
  console.log(`Purging pull zone ${pullZoneId}...`);
  await run("npx", [
    "--yes",
    "bunny-transfer@latest",
    "purge",
    pullZoneId,
    `--access-key=${accessKey}`,
  ]);
  console.log("Purge complete.");
} else {
  console.log("No BUNNY_PULL_ZONE_ID set, skipping cache purge.");
}

console.log("Deploy finished successfully.");
