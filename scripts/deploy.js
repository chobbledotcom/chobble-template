#!/usr/bin/env bun
/**
 * Deploy built site to Bunny CDN via the REST API.
 *
 * Syncs the _site directory to a Bunny storage zone (upload all local
 * files, delete stale remote files), then purges the pull zone cache.
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
const MAX_RETRIES = 3;

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

const storageUrl = (path) =>
  path
    ? `${STORAGE_ENDPOINT}/${STORAGE_ZONE_NAME}/${path}`
    : `${STORAGE_ENDPOINT}/${STORAGE_ZONE_NAME}/`;

const storageHeaders = { AccessKey: storagePassword };
const apiHeaders = { AccessKey: accessKey };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (status) => status >= 500 || status === 429;

const retryDelay = async (attempt, label, status) => {
  const delay = 1000 * 2 ** attempt;
  console.log(`  Retrying ${label} in ${delay}ms (${status})...`);
  await sleep(delay);
};

const fetchWithRetry = async (url, options, label) => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (!isRetryable(response.status)) {
      throw new Error(`${label}: ${response.status}`);
    }
    if (attempt === MAX_RETRIES) {
      throw new Error(
        `${label}: ${response.status} after ${MAX_RETRIES} retries`,
      );
    }
    await retryDelay(attempt, label, response.status);
  }
};

// --- List remote files ---

const joinPath = (parent, child) => (parent ? `${parent}/${child}` : child);

const listRemoteFiles = async (path = "") => {
  const url = storageUrl(path ? `${path}/` : "");
  const response = await fetchWithRetry(
    url,
    { headers: storageHeaders },
    `list ${path || "/"}`,
  );
  const entries = await response.json();
  const paths = [];
  for (const entry of entries) {
    const entryPath = joinPath(path, entry.ObjectName);
    if (entry.IsDirectory) {
      paths.push(...(await listRemoteFiles(entryPath)));
    } else {
      paths.push(entryPath);
    }
  }
  return paths;
};

// --- Upload a file ---

const uploadFile = async (localPath, remotePath) => {
  const body = readFileSync(localPath);
  await fetchWithRetry(
    storageUrl(remotePath),
    {
      method: "PUT",
      headers: {
        ...storageHeaders,
        "Content-Type": "application/octet-stream",
      },
      body,
    },
    `upload ${remotePath}`,
  );
};

// --- Delete a remote file ---

const deleteFile = async (remotePath) => {
  await fetchWithRetry(
    storageUrl(remotePath),
    { method: "DELETE", headers: storageHeaders },
    `delete ${remotePath}`,
  );
};

// --- Purge pull zone cache ---

const purgeCache = async () => {
  await fetchWithRetry(
    `https://api.bunny.net/pullzone/${PULL_ZONE_ID}/purgeCache`,
    {
      method: "POST",
      headers: { ...apiHeaders, "Content-Type": "application/json" },
    },
    "purge cache",
  );
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
