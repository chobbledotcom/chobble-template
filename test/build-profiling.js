/**
 * Build Profiling Script
 *
 * Measures and profiles build times for minimal test sites
 * to identify optimization opportunities for faster integration tests.
 *
 * Run with: node test/build-profiling.js
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { createTestSite } from "#test/test-site-factory.js";
import { ROOT_DIR } from "#lib/paths.js";

const rootDir = ROOT_DIR;

const hrtime = () => process.hrtime.bigint();
const hrtimeToMs = (start, end) => Number(end - start) / 1_000_000;

const profileBuild = (siteDir) => {
  const start = hrtime();
  const result = spawnSync("npx", ["eleventy", "--quiet"], {
    cwd: siteDir,
    stdio: "pipe",
    encoding: "utf-8",
  });

  return {
    time: hrtimeToMs(start, hrtime()),
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
};

const profileNodeStartup = () => {
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

const runProfiling = async () => {
  console.log("=".repeat(60));
  console.log("Build Time Profiling for Minimal Test Site");
  console.log("=".repeat(60));
  console.log();

  // 1. Baseline measurements
  console.log("--- Baseline Measurements ---");
  const nodeStartup = profileNodeStartup();
  console.log(`Node.js startup:            ${nodeStartup.toFixed(2)} ms`);
  console.log();

  // 2. Create test site using factory
  console.log("--- Creating Test Site ---");
  const createStart = hrtime();
  const site = await createTestSite({});
  const createTime = hrtimeToMs(createStart, hrtime());
  console.log(`Site creation:              ${createTime.toFixed(2)} ms`);
  console.log();

  // 3. Config loading profiling
  console.log("--- Config Loading ---");
  const configLoad = profileConfigLoad(site.dir);
  console.log(
    `Config import time:         ${configLoad.loadTime.toFixed(2)} ms`,
  );
  console.log(
    `Config total (inc. node):   ${configLoad.totalTime.toFixed(2)} ms`,
  );
  console.log();

  // 4. Eleventy module loading
  console.log("--- Eleventy Module Load ---");
  const eleventyLoad = profileEleventyModuleLoad(site.dir);
  console.log(
    `Eleventy require() time:    ${eleventyLoad.loadTime.toFixed(2)} ms`,
  );
  console.log(
    `Total (inc. node startup):  ${eleventyLoad.totalTime.toFixed(2)} ms`,
  );
  console.log();

  // 5. Full build profiling
  console.log("--- Full Build (npx eleventy --quiet) ---");
  const build1 = profileBuild(site.dir);
  console.log(`First build:                ${build1.time.toFixed(2)} ms`);

  const build2 = profileBuild(site.dir);
  console.log(`Second build (warm cache):  ${build2.time.toFixed(2)} ms`);
  console.log();

  if (build1.status !== 0) {
    console.log("Build failed!");
    console.log("stderr:", build1.stderr);
    console.log("stdout:", build1.stdout);
  }

  // 6. Build time breakdown estimate
  console.log("--- Build Time Breakdown (Estimated) ---");
  const buildTime = build1.time;
  const configOverhead = configLoad.loadTime;
  const eleventyOverhead = eleventyLoad.loadTime;
  const actualProcessing =
    buildTime - nodeStartup - configOverhead - eleventyOverhead;

  console.log(
    `Node.js startup:            ${nodeStartup.toFixed(2)} ms (${((nodeStartup / buildTime) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Config loading:             ${configOverhead.toFixed(2)} ms (${((configOverhead / buildTime) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Eleventy module load:       ${eleventyOverhead.toFixed(2)} ms (${((eleventyOverhead / buildTime) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Actual template processing: ${actualProcessing.toFixed(2)} ms (${((actualProcessing / buildTime) * 100).toFixed(1)}%)`,
  );
  console.log(`${"TOTAL".padEnd(24)} ${buildTime.toFixed(2)} ms`);
  console.log();

  // 7. Multiple runs for consistency
  console.log("--- Multiple Run Statistics (5 runs) ---");
  const runs = [];
  for (let i = 0; i < 5; i++) {
    runs.push(profileBuild(site.dir).time);
  }

  const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
  const min = Math.min(...runs);
  const max = Math.max(...runs);
  const stddev = Math.sqrt(
    runs.reduce((sum, x) => sum + (x - avg) ** 2, 0) / runs.length,
  );

  console.log(`Run times: ${runs.map((r) => r.toFixed(0)).join(", ")} ms`);
  console.log(`Average:                    ${avg.toFixed(2)} ms`);
  console.log(`Min:                        ${min.toFixed(2)} ms`);
  console.log(`Max:                        ${max.toFixed(2)} ms`);
  console.log(`Std Dev:                    ${stddev.toFixed(2)} ms`);
  console.log();

  // 8. Profile core dependencies directly
  console.log("--- Core Dependency Import Times (fresh Node process each) ---");
  const jsdomTime = profileSingleImport("jsdom");
  console.log(
    `jsdom                                    ${jsdomTime.toFixed(2)} ms`,
  );

  const sharpTime = profileSingleImport("sharp");
  console.log(
    `sharp                                    ${sharpTime.toFixed(2)} ms`,
  );

  const sassTime = profileSingleImport("sass");
  console.log(
    `sass                                     ${sassTime.toFixed(2)} ms`,
  );

  const eleventyImgTime = profileSingleImport("@11ty/eleventy-img");
  console.log(
    `@11ty/eleventy-img                       ${eleventyImgTime.toFixed(2)} ms`,
  );

  const jsonToPdfTime = profileSingleImport("json-to-pdf");
  console.log(
    `json-to-pdf                              ${jsonToPdfTime.toFixed(2)} ms`,
  );
  console.log();

  // 9. Profile imports within config context
  console.log("--- Config Module Import Times ---");
  const importTimes = profileConfigImports(site.dir);
  const sortedImports = Object.entries(importTimes).sort((a, b) => b[1] - a[1]);

  for (const [name, time] of sortedImports) {
    console.log(`${name.padEnd(40)} ${time.toFixed(2)} ms`);
  }

  const totalImportTime = Object.values(importTimes).reduce((a, b) => a + b, 0);
  console.log(
    `${"TOTAL IMPORT TIME".padEnd(40)} ${totalImportTime.toFixed(2)} ms`,
  );
  console.log();

  // Cleanup
  site.cleanup();

  // Summary
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log();
  console.log("Key findings:");
  console.log(
    `- Total build time for minimal site: ~${avg.toFixed(0)} ms (~${(avg / 1000).toFixed(1)}s)`,
  );
  console.log(
    `- Node.js startup overhead: ~${nodeStartup.toFixed(0)} ms (${((nodeStartup / avg) * 100).toFixed(1)}%)`,
  );
  console.log(
    `- Config + module loading: ~${(configOverhead + eleventyOverhead).toFixed(0)} ms (${(((configOverhead + eleventyOverhead) / avg) * 100).toFixed(1)}%)`,
  );

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
    console.log(
      `- JSDOM is the #1 bottleneck (${jsdomTime.toFixed(0)}ms) - consider:`,
    );
    console.log("  * Lazy import JSDOM only when transform is actually needed");
    console.log(
      "  * Move JSDOM imports inside functions rather than at module scope",
    );
    console.log(
      "  * Create a 'lite' config for tests that skips external-links transform",
    );
  }

  if (configOverhead > 1000) {
    console.log("- Config loading is slow - consider:");
    console.log(
      "  * Lazy loading expensive modules (sass, sharp, eleventy-img)",
    );
    console.log(
      "  * Creating a 'lite' config for tests without unused features",
    );
    console.log("  * Pre-warming module cache with a persistent process");
  }

  console.log();
  console.log("Files importing JSDOM at module scope:");
  console.log("  - src/_lib/eleventy/external-links.js");
  console.log("  - src/_lib/media/image.js");
  console.log(
    "  Moving these to lazy imports could save ~3.5 seconds per build",
  );
  console.log();
};

runProfiling();
