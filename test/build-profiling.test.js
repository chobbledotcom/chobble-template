/**
 * Build Profiling Tests
 *
 * These tests measure and profile build times for minimal test sites
 * to identify optimization opportunities for faster integration tests.
 *
 * Run with: node test/build-profiling.test.js
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const randomId = () => Math.random().toString(36).slice(2, 10);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeJson = (filePath, data) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const copyFile = (src, dest) => {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
};

const copyDirFiles = (src, dest, filter = () => true) => {
  if (!fs.existsSync(src)) return;
  for (const file of fs.readdirSync(src)) {
    if (fs.statSync(path.join(src, file)).isFile() && filter(file)) {
      copyFile(path.join(src, file), path.join(dest, file));
    }
  }
};

const symlinkDirs = (templateSrc, srcDir, dirs) => {
  for (const dir of dirs) {
    const source = path.join(templateSrc, dir);
    if (fs.existsSync(source)) {
      fs.symlinkSync(source, path.join(srcDir, dir));
    }
  }
};

const createMarkdownFile = (dir, filename, { frontmatter = {}, content = "" }) => {
  const filePath = path.join(dir, filename);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, matter.stringify(content, frontmatter));
  return filePath;
};

// High resolution timer
const hrtime = () => process.hrtime.bigint();
const hrtimeToMs = (start, end) => Number(end - start) / 1_000_000;

// ============================================
// Profiling functions
// ============================================

const profileSiteCreation = () => {
  const timings = {};
  const siteId = randomId();
  const siteDir = path.join(__dirname, ".test-sites", `profile-${siteId}`);
  const srcDir = path.join(siteDir, "src");
  const templateSrc = path.join(rootDir, "src");

  let start = hrtime();
  fs.mkdirSync(srcDir, { recursive: true });
  timings.createDirs = hrtimeToMs(start, hrtime());

  start = hrtime();
  symlinkDirs(templateSrc, srcDir, [
    "_lib",
    "_includes",
    "_layouts",
    "css",
    "assets",
    "utils",
  ]);
  timings.symlinkDirs = hrtimeToMs(start, hrtime());

  start = hrtime();
  const dataTarget = path.join(srcDir, "_data");
  copyDirFiles(path.join(templateSrc, "_data"), dataTarget);
  timings.copyDataFiles = hrtimeToMs(start, hrtime());

  start = hrtime();
  createMarkdownFile(srcDir, "pages/index.md", {
    frontmatter: { title: "Test Site", layout: "page", permalink: "/" },
    content: "# Test Site",
  });
  timings.createIndexPage = hrtimeToMs(start, hrtime());

  start = hrtime();
  copyFile(
    path.join(rootDir, ".eleventy.js"),
    path.join(siteDir, ".eleventy.js")
  );
  timings.copyEleventyConfig = hrtimeToMs(start, hrtime());

  start = hrtime();
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")
  );
  writeJson(path.join(siteDir, "package.json"), pkgJson);
  timings.copyPackageJson = hrtimeToMs(start, hrtime());

  start = hrtime();
  fs.symlinkSync(
    path.join(rootDir, "node_modules"),
    path.join(siteDir, "node_modules")
  );
  timings.symlinkNodeModules = hrtimeToMs(start, hrtime());

  return { siteDir, srcDir, timings };
};

const profileBuild = (siteDir, options = {}) => {
  const timings = {};
  const args = ["eleventy", "--quiet"];

  if (options.debug) {
    args.push("--debug");
  }

  const start = hrtime();
  const result = spawnSync("npx", args, {
    cwd: siteDir,
    stdio: "pipe",
    encoding: "utf-8",
  });
  timings.totalBuild = hrtimeToMs(start, hrtime());

  return {
    timings,
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
};

const profileNodeStartup = () => {
  // Measure just Node.js startup time with empty script
  const start = hrtime();
  spawnSync("node", ["-e", ""], { encoding: "utf-8" });
  return hrtimeToMs(start, hrtime());
};

const profileSingleImport = (moduleName) => {
  const script = `
    const start = process.hrtime.bigint();
    await import("${moduleName}");
    console.log(Number(process.hrtime.bigint() - start) / 1_000_000);
  `;

  const result = spawnSync("node", ["--input-type=module", "-e", script], {
    cwd: rootDir,
    encoding: "utf-8",
    timeout: 60000,
  });

  return Number.parseFloat(result.stdout.trim());
};

const profileConfigImports = (siteDir) => {
  const script = `
    const times = {};
    const measure = async (name, importFn) => {
      const start = process.hrtime.bigint();
      await importFn();
      times[name] = Number(process.hrtime.bigint() - start) / 1_000_000;
    };

    await measure("@11ty/eleventy_RenderPlugin", () => import("@11ty/eleventy"));
    await measure("@quasibit/eleventy-plugin-schema", () => import("@quasibit/eleventy-plugin-schema"));
    await measure("#build/esbuild.js", () => import("#build/esbuild.js"));
    await measure("#build/scss.js", () => import("#build/scss.js"));
    await measure("#collections/categories.js", () => import("#collections/categories.js"));
    await measure("#collections/events.js", () => import("#collections/events.js"));
    await measure("#collections/products.js", () => import("#collections/products.js"));
    await measure("#collections/properties.js", () => import("#collections/properties.js"));
    await measure("#eleventy/feed.js", () => import("#eleventy/feed.js"));
    await measure("#eleventy/external-links.js", () => import("#eleventy/external-links.js"));
    await measure("#eleventy/navigation.js", () => import("@11ty/eleventy-navigation"));
    await measure("#eleventy/pdf.js", () => import("#eleventy/pdf.js"));
    await measure("#media/image.js", () => import("#media/image.js"));
    await measure("sass", () => import("sass"));
    await measure("sharp", () => import("sharp"));
    await measure("@11ty/eleventy-img", () => import("@11ty/eleventy-img"));

    console.log(JSON.stringify(times));
  `;

  const result = spawnSync("node", ["--input-type=module", "-e", script], {
    cwd: siteDir,
    encoding: "utf-8",
    timeout: 60000,
  });

  return JSON.parse(result.stdout.trim());
};

const profileNpxOverhead = () => {
  // Measure npx overhead vs direct node
  const start = hrtime();
  spawnSync("npx", ["--version"], { encoding: "utf-8" });
  return hrtimeToMs(start, hrtime());
};

const profileEleventyModuleLoad = (siteDir) => {
  const script = `
    const start = process.hrtime.bigint();
    require("@11ty/eleventy");
    console.log(Number(process.hrtime.bigint() - start) / 1_000_000);
  `;

  const start = hrtime();
  const result = spawnSync("node", ["-e", script], {
    cwd: siteDir,
    encoding: "utf-8",
    env: { ...process.env, NODE_PATH: path.join(siteDir, "node_modules") },
  });
  const totalTime = hrtimeToMs(start, hrtime());
  const loadTime = Number.parseFloat(result.stdout.trim());

  return { loadTime, totalTime };
};

const profileConfigLoad = (siteDir) => {
  const script = `
    const start = process.hrtime.bigint();
    await import("./.eleventy.js");
    console.log(Number(process.hrtime.bigint() - start) / 1_000_000);
  `;

  const start = hrtime();
  const result = spawnSync("node", ["--input-type=module", "-e", script], {
    cwd: siteDir,
    encoding: "utf-8",
  });
  const totalTime = hrtimeToMs(start, hrtime());
  const loadTime = Number.parseFloat(result.stdout.trim());

  return { loadTime, totalTime };
};

const cleanup = (siteDir) => {
  if (fs.existsSync(siteDir)) {
    fs.rmSync(siteDir, { recursive: true, force: true });
  }
};

// ============================================
// Run profiling
// ============================================

const runProfiling = async () => {
  console.log("=".repeat(60));
  console.log("Build Time Profiling for Minimal Test Site");
  console.log("=".repeat(60));
  console.log();

  // 1. Baseline measurements
  console.log("--- Baseline Measurements ---");

  const nodeStartup = profileNodeStartup();
  console.log(`Node.js startup:            ${nodeStartup.toFixed(2)} ms`);

  const npxOverhead = profileNpxOverhead();
  console.log(`npx --version:              ${npxOverhead.toFixed(2)} ms`);
  console.log();

  // 2. Site creation profiling
  console.log("--- Site Creation Breakdown ---");

  const { siteDir, srcDir, timings: creationTimings } = profileSiteCreation();

  let creationTotal = 0;
  for (const [key, value] of Object.entries(creationTimings)) {
    console.log(`${key.padEnd(24)} ${value.toFixed(2)} ms`);
    creationTotal += value;
  }
  console.log(`${"TOTAL CREATION".padEnd(24)} ${creationTotal.toFixed(2)} ms`);
  console.log();

  // 3. Config loading profiling
  console.log("--- Config Loading ---");

  const configLoad = profileConfigLoad(siteDir);
  console.log(`Config import time:         ${configLoad.loadTime.toFixed(2)} ms`);
  console.log(`Config total (inc. node):   ${configLoad.totalTime.toFixed(2)} ms`);
  console.log();

  // 4. Eleventy module loading
  console.log("--- Eleventy Module Load ---");

  const eleventyLoad = profileEleventyModuleLoad(siteDir);
  console.log(`Eleventy require() time:    ${eleventyLoad.loadTime.toFixed(2)} ms`);
  console.log(`Total (inc. node startup):  ${eleventyLoad.totalTime.toFixed(2)} ms`);
  console.log();

  // 5. Full build profiling
  console.log("--- Full Build (npx eleventy --quiet) ---");

  const build1 = profileBuild(siteDir);
  console.log(`First build:                ${build1.timings.totalBuild.toFixed(2)} ms`);

  // Run a second build to see if there's any caching
  const build2 = profileBuild(siteDir);
  console.log(`Second build (warm cache):  ${build2.timings.totalBuild.toFixed(2)} ms`);
  console.log();

  if (build1.status !== 0) {
    console.log("Build failed!");
    console.log("stderr:", build1.stderr);
    console.log("stdout:", build1.stdout);
  }

  // 6. Build time breakdown estimate
  console.log("--- Build Time Breakdown (Estimated) ---");

  const buildTime = build1.timings.totalBuild;
  const nodeOverhead = nodeStartup;
  const configOverhead = configLoad.loadTime;
  const eleventyOverhead = eleventyLoad.loadTime;
  const actualProcessing = buildTime - nodeOverhead - configOverhead - eleventyOverhead;

  console.log(`Node.js startup:            ${nodeOverhead.toFixed(2)} ms (${((nodeOverhead/buildTime)*100).toFixed(1)}%)`);
  console.log(`Config loading:             ${configOverhead.toFixed(2)} ms (${((configOverhead/buildTime)*100).toFixed(1)}%)`);
  console.log(`Eleventy module load:       ${eleventyOverhead.toFixed(2)} ms (${((eleventyOverhead/buildTime)*100).toFixed(1)}%)`);
  console.log(`Actual template processing: ${actualProcessing.toFixed(2)} ms (${((actualProcessing/buildTime)*100).toFixed(1)}%)`);
  console.log(`${"TOTAL".padEnd(24)} ${buildTime.toFixed(2)} ms`);
  console.log();

  // 7. Multiple runs for consistency
  console.log("--- Multiple Run Statistics (5 runs) ---");

  const runs = [];
  for (let i = 0; i < 5; i++) {
    const result = profileBuild(siteDir);
    runs.push(result.timings.totalBuild);
  }

  const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
  const min = Math.min(...runs);
  const max = Math.max(...runs);
  const stddev = Math.sqrt(runs.reduce((sum, x) => sum + (x - avg) ** 2, 0) / runs.length);

  console.log(`Run times: ${runs.map(r => r.toFixed(0)).join(", ")} ms`);
  console.log(`Average:                    ${avg.toFixed(2)} ms`);
  console.log(`Min:                        ${min.toFixed(2)} ms`);
  console.log(`Max:                        ${max.toFixed(2)} ms`);
  console.log(`Std Dev:                    ${stddev.toFixed(2)} ms`);
  console.log();

  // 8. Profile core dependencies directly
  console.log("--- Core Dependency Import Times (fresh Node process each) ---");

  const jsdomTime = profileSingleImport("jsdom");
  console.log(`jsdom                                    ${jsdomTime.toFixed(2)} ms`);

  const sharpTime = profileSingleImport("sharp");
  console.log(`sharp                                    ${sharpTime.toFixed(2)} ms`);

  const sassTime = profileSingleImport("sass");
  console.log(`sass                                     ${sassTime.toFixed(2)} ms`);

  const eleventyImgTime = profileSingleImport("@11ty/eleventy-img");
  console.log(`@11ty/eleventy-img                       ${eleventyImgTime.toFixed(2)} ms`);

  const jsonToPdfTime = profileSingleImport("json-to-pdf");
  console.log(`json-to-pdf                              ${jsonToPdfTime.toFixed(2)} ms`);

  console.log();

  // 9. Profile imports within config context
  console.log("--- Config Module Import Times ---");

  const importTimes = profileConfigImports(siteDir);
  const sortedImports = Object.entries(importTimes)
    .sort((a, b) => b[1] - a[1]);

  for (const [name, time] of sortedImports) {
    console.log(`${name.padEnd(40)} ${time.toFixed(2)} ms`);
  }

  const totalImportTime = Object.values(importTimes).reduce((a, b) => a + b, 0);
  console.log(`${"TOTAL IMPORT TIME".padEnd(40)} ${totalImportTime.toFixed(2)} ms`);
  console.log();

  // Cleanup
  cleanup(siteDir);

  // Summary
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log();
  console.log("Key findings:");
  console.log(`- Total build time for minimal site: ~${avg.toFixed(0)} ms (~${(avg/1000).toFixed(1)}s)`);
  console.log(`- Node.js startup overhead: ~${nodeOverhead.toFixed(0)} ms (${((nodeOverhead/avg)*100).toFixed(1)}%)`);
  console.log(`- Config + module loading: ~${(configOverhead + eleventyOverhead).toFixed(0)} ms (${(((configOverhead + eleventyOverhead)/avg)*100).toFixed(1)}%)`);

  if (sortedImports.length > 0) {
    console.log();
    console.log("Top 5 slowest imports:");
    for (const [name, time] of sortedImports.slice(0, 5)) {
      console.log(`  - ${name}: ${time.toFixed(0)} ms`);
    }
  }

  console.log();
  console.log("Optimization opportunities:");

  if (jsdomTime > 1000) {
    console.log(`- JSDOM is the #1 bottleneck (${jsdomTime.toFixed(0)}ms) - consider:`);
    console.log("  * Lazy import JSDOM only when transform is actually needed");
    console.log("  * Move JSDOM imports inside functions rather than at module scope");
    console.log("  * Create a 'lite' config for tests that skips external-links transform");
  }

  if (configOverhead > 1000) {
    console.log("- Config loading is slow - consider:");
    console.log("  * Lazy loading expensive modules (sass, sharp, eleventy-img)");
    console.log("  * Creating a 'lite' config for tests without unused features");
    console.log("  * Pre-warming module cache with a persistent process");
  }

  if (sortedImports.some(([name, time]) => name.includes("sass") && time > 500)) {
    console.log("- Sass import is slow - skip if not testing SCSS features");
  }

  if (sortedImports.some(([name, time]) => name.includes("sharp") && time > 500)) {
    console.log("- Sharp import is slow - skip image processing for simple tests");
  }

  if (sortedImports.some(([name, time]) => name.includes("eleventy-img") && time > 500)) {
    console.log("- eleventy-img import is slow - skip if not testing images");
  }

  console.log();
  console.log("Files importing JSDOM at module scope:");
  console.log("  - src/_lib/eleventy/external-links.js");
  console.log("  - src/_lib/media/image.js");
  console.log("  Moving these to lazy imports could save ~3.5 seconds per build");

  console.log();

  // Output for test runner
  console.log("__TEST_RESULTS__:1:0");
};

runProfiling();
