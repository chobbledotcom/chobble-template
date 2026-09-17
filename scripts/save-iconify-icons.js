import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import socialIcons from "#data/social-icons.json" with { type: "json" };
import { getIcon, getIconPath } from "#media/iconify.js";

const templateRoot = path.resolve(import.meta.dir, "..");
const iconRefPattern = /\bicon:\s*["']([^"']+)["']/g;
const textFilePattern = /\.(md|json|yml|yaml|html|liquid)$/;
const skipDirNames = new Set([
  ".git",
  ".build",
  ".image-cache",
  ".opencode",
  ".github",
  "_site",
  "node_modules",
  "chobble-template",
  "coverage",
]);

const collectIconRefsFromFile = (filePath, refs) => {
  for (const match of readFileSync(filePath, "utf8").matchAll(iconRefPattern)) {
    refs.add(match[1].trim());
  }
};

const collectIconRefsFromEntry = (entry, entryPath, refs) => {
  if (entry.isDirectory()) {
    if (!skipDirNames.has(entry.name)) collectIconRefsFromDir(entryPath, refs);
    return;
  }
  if (textFilePattern.test(entry.name)) {
    collectIconRefsFromFile(entryPath, refs);
  }
};

const collectIconRefsFromDir = (dir, refs) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    collectIconRefsFromEntry(entry, path.join(dir, entry.name), refs);
  }
};

const collectSocialIconRefs = (clientDir, refs) => {
  const siteFilePath = path.join(clientDir, "_data", "site.json");
  if (!existsSync(siteFilePath)) return;
  const site = JSON.parse(readFileSync(siteFilePath, "utf8"));
  for (const [platform, url] of Object.entries(site.socials || {})) {
    if (!url) continue;
    const iconId = socialIcons[platform.toLowerCase()];
    if (iconId) refs.add(iconId);
  }
};

const collectIconRefs = (targetDir) => {
  const refs = new Set();
  collectIconRefsFromDir(targetDir, refs);
  collectSocialIconRefs(targetDir, refs);
  return refs;
};

const saveIcon = async (iconId, results) => {
  if (!/^[a-z0-9-]+:[a-z0-9_ -]+$/i.test(iconId)) return;
  if (existsSync(getIconPath(iconId, templateRoot))) {
    results.cached.push(iconId);
    return;
  }
  try {
    await getIcon(iconId, templateRoot);
    results.saved.push(iconId);
  } catch (err) {
    results.failed.push(`${iconId} (${err.message})`);
  }
};

const reportSaved = (saved) => {
  if (!saved.length) return;
  console.log(`Saved: ${saved.length} icons`);
  for (const iconId of saved) console.log(`  ${iconId}`);
};

const reportFailed = (failed) => {
  if (!failed.length) return;
  console.warn(`Failed: ${failed.length} icons`);
  for (const failure of failed) console.warn(`  ${failure}`);
  process.exitCode = 1;
};

const report = (results) => {
  if (results.cached.length) {
    console.log(`Already cached: ${results.cached.length} icons`);
  }
  reportSaved(results.saved);
  reportFailed(results.failed);
  if (
    results.cached.length + results.saved.length + results.failed.length ===
    0
  ) {
    console.log("No icon references found");
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const targets = args.filter((arg) => !arg.includes(":"));
  const explicitIconIds = args.filter((arg) => arg.includes(":"));

  const results = { saved: [], cached: [], failed: [] };
  const scanDirs = targets.length ? targets : [templateRoot];

  const refs = new Set(explicitIconIds);
  for (const dir of scanDirs) {
    for (const ref of collectIconRefs(path.resolve(dir))) refs.add(ref);
  }

  for (const iconId of refs) await saveIcon(iconId, results);
  report(results);
};

if (import.meta.main) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
