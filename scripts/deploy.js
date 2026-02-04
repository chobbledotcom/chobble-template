#!/usr/bin/env bun
/**
 * Deploy built site to Bunny CDN via the REST API.
 *
 * Syncs the _site directory to a Bunny storage zone (upload new/changed
 * files, delete removed files), then purges the pull zone cache.
 *
 * Required environment variables:
 *   BUNNY_ACCESS_KEY            - Account API key (for pull zone purge)
 *   BUNNY_STORAGE_ZONE_PASSWORD - Storage zone password (for file uploads)
 */
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Glob } from "bun";

const STORAGE_ZONE_NAME = "chobble-example";
const STORAGE_ENDPOINT = "https://storage.bunnycdn.com";
const PULL_ZONE_ID = "4582983";
const CONCURRENCY = 10;

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const accessKey = requireEnv("BUNNY_ACCESS_KEY");
const storagePassword = requireEnv("BUNNY_STORAGE_ZONE_PASSWORD");
const deployDir = resolve("_site");

if (!statSync(deployDir, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error(`Deploy directory not found: ${deployDir}`);
}

const storageUrl = (path) => `${STORAGE_ENDPOINT}/${STORAGE_ZONE_NAME}/${path}`;

const storageHeaders = { AccessKey: storagePassword };
const apiHeaders = { AccessKey: accessKey };

// --- List remote files ---

const listRemoteFiles = async (path = "") => {
  const url = storageUrl(`${path}/`);
  const response = await fetch(url, { headers: storageHeaders });
  if (!response.ok) {
    throw new Error(`Failed to list ${url}: ${response.status}`);
  }
  const entries = await response.json();
  const paths = [];
  for (const entry of entries) {
    const entryPath = path ? `${path}/${entry.ObjectName}` : entry.ObjectName;
    if (entry.IsDirectory) {
      const nested = await listRemoteFiles(entryPath);
      paths.push(...nested);
    } else {
      paths.push(entryPath);
    }
  }
  return paths;
};

// --- Upload a file ---

const uploadFile = async (localPath, remotePath) => {
  const body = readFileSync(localPath);
  const response = await fetch(storageUrl(remotePath), {
    method: "PUT",
    headers: { ...storageHeaders, "Content-Type": "application/octet-stream" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload ${remotePath}: ${response.status}`);
  }
};

// --- Delete a remote file ---

const deleteFile = async (remotePath) => {
  const response = await fetch(storageUrl(remotePath), {
    method: "DELETE",
    headers: storageHeaders,
  });
  if (!response.ok) {
    throw new Error(`Failed to delete ${remotePath}: ${response.status}`);
  }
};

// --- Purge pull zone cache ---

const purgeCache = async () => {
  const response = await fetch(
    `https://api.bunny.net/pullzone/${PULL_ZONE_ID}/purgeCache`,
    {
      method: "POST",
      headers: { ...apiHeaders, "Content-Type": "application/json" },
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to purge cache: ${response.status}`);
  }
};

// --- Run batches with concurrency limit ---

const runBatched = async (items, fn) => {
  let i = 0;
  const next = async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  };
  const workers = Array.from({ length: CONCURRENCY }, () => next());
  await Promise.all(workers);
};

// --- Main ---

const glob = new Glob("**/*");
const localFiles = new Set();
for await (const path of glob.scan({ cwd: deployDir, onlyFiles: true })) {
  localFiles.add(path);
}

console.log(`Found ${localFiles.size} local files in ${deployDir}`);

console.log("Listing remote files...");
const remoteFiles = new Set(await listRemoteFiles());
console.log(`Found ${remoteFiles.size} remote files`);

const toUpload = [...localFiles];
const toDelete = [...remoteFiles].filter((f) => !localFiles.has(f));

console.log(`Uploading ${toUpload.length} files...`);
let uploaded = 0;
await runBatched(toUpload, async (file) => {
  await uploadFile(join(deployDir, file), file);
  uploaded++;
  if (uploaded % 50 === 0) {
    console.log(`  ${uploaded}/${toUpload.length}`);
  }
});
console.log(`Uploaded ${uploaded} files.`);

if (toDelete.length > 0) {
  console.log(`Deleting ${toDelete.length} remote files...`);
  await runBatched(toDelete, deleteFile);
  console.log(`Deleted ${toDelete.length} files.`);
}

console.log("Purging CDN cache...");
await purgeCache();

console.log("Deploy finished successfully.");
