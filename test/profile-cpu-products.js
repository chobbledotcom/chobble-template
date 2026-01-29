/**
 * CPU Profiling: 100 Products with Filter Attributes
 *
 * Creates a test site with 100 products, each having 4 filter_attributes
 * with 6 possible values per attribute. Builds the site with Eleventy's
 * built-in benchmarking and reports where time is spent.
 *
 * Run with: bun test/profile-cpu-products.js
 */

import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "#lib/paths.js";
import { createTestSite } from "#test/test-site-factory.js";

const rootDir = ROOT_DIR;

// ---------------------------------------------------------------------------
// Filter attribute definitions: 4 attributes, 6 values each
// ---------------------------------------------------------------------------
const FILTER_ATTRIBUTES = {
  Color: ["red", "blue", "green", "yellow", "black", "white"],
  Size: ["tiny", "small", "medium", "large", "xlarge", "jumbo"],
  Material: ["wood", "metal", "plastic", "glass", "ceramic", "carbon"],
  Rating: [
    "one-star",
    "two-star",
    "three-star",
    "four-star",
    "five-star",
    "unrated",
  ],
};

const ATTRIBUTE_NAMES = Object.keys(FILTER_ATTRIBUTES);

const pickRandom = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Simple seeded PRNG (mulberry32) for reproducibility
const seedRng = (seed) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------------------------------------------------------------------------
// Spec definitions: 10 random specs per product
// ---------------------------------------------------------------------------
const SPEC_NAMES = [
  "Processor",
  "Memory",
  "Storage",
  "Display",
  "Battery Life",
  "Weight",
  "Connectivity",
  "Waterproof Rating",
  "Warranty",
  "Operating System",
];

const SPEC_VALUES = {
  Processor: [
    "Dual-core 1.2GHz",
    "Quad-core 2.4GHz",
    "Octa-core 3.0GHz",
    "M1 chip",
    "Snapdragon 8",
  ],
  Memory: ["2GB DDR4", "4GB DDR4", "8GB DDR5", "16GB DDR5", "32GB DDR5"],
  Storage: ["32GB eMMC", "64GB SSD", "128GB SSD", "256GB NVMe", "512GB NVMe"],
  Display: ['2.4" LCD', '3.5" IPS', '4.3" OLED', '5.5" AMOLED', '6.7" Retina'],
  "Battery Life": ["8 hours", "12 hours", "24 hours", "48 hours", "72 hours"],
  Weight: ["85g", "120g", "195g", "280g", "350g"],
  Connectivity: [
    "Bluetooth 5.0",
    "Wi-Fi 6",
    "Wi-Fi 6 + 5G",
    "USB-C only",
    "NFC + BT 5.3",
  ],
  "Waterproof Rating": ["IPX4", "IPX7", "IP67", "IP68", "Not rated"],
  Warranty: ["6 months", "1 year", "2 years", "3 years", "Lifetime"],
  "Operating System": [
    "ThingyOS 2.0",
    "ThingyOS 3.0",
    "WidgetLinux",
    "GadgetOS",
    "Proprietary",
  ],
};

// ---------------------------------------------------------------------------
// Generate product file specs
// ---------------------------------------------------------------------------
const generateProducts = (count = 100) => {
  const rng = seedRng(42);
  const files = [];
  const categories = ["widgets", "gadgets", "tools"];

  for (let i = 0; i < count; i++) {
    const slug = `test-product-${String(i + 1).padStart(3, "0")}`;
    const filterAttrs = ATTRIBUTE_NAMES.map((name) => ({
      name,
      value: pickRandom(FILTER_ATTRIBUTES[name], rng),
    }));

    const specs = SPEC_NAMES.map((name) => ({
      name,
      value: pickRandom(SPEC_VALUES[name], rng),
    }));

    files.push({
      path: `products/${slug}.md`,
      frontmatter: {
        title: `Test Product ${i + 1}`,
        subtitle: `Generated product #${i + 1} for profiling`,
        filter_attributes: filterAttrs,
        specs,
        categories: [pickRandom(categories, rng)],
        options: [
          {
            name: "Standard",
            max_quantity: 10,
            unit_price: Math.round(rng() * 500 * 100) / 100,
            sku: `SKU${String(i + 1).padStart(4, "0")}`,
          },
        ],
      },
      content: `This is test product ${i + 1} used for CPU profiling.`,
    });
  }

  // Also add category files so category-product filtering runs
  for (const cat of categories) {
    files.push({
      path: `categories/${cat}.md`,
      frontmatter: { title: cat.charAt(0).toUpperCase() + cat.slice(1) },
      content: `${cat} category.`,
    });
  }

  return files;
};

// ---------------------------------------------------------------------------
// Parse Eleventy benchmark output
// ---------------------------------------------------------------------------
const parseBenchmarks = (stderr) => {
  const lines = stderr.split("\n");
  const benchmarks = [];
  const benchRe = /Benchmark\s+(\d+)ms\s+(\d+)%\s+(\d+)×\s+(.+)/;

  for (const line of lines) {
    const match = line.match(benchRe);
    if (match) {
      benchmarks.push({
        ms: Number.parseInt(match[1], 10),
        pct: Number.parseInt(match[2], 10),
        count: Number.parseInt(match[3], 10),
        label: match[4].trim(),
      });
    }
  }

  return benchmarks.sort((a, b) => b.ms - a.ms);
};

// ---------------------------------------------------------------------------
// Run a timed build
// ---------------------------------------------------------------------------
const runBuild = (siteDir, env = {}) => {
  const start = process.hrtime.bigint();
  const result = spawnSync(
    "bun",
    ["./node_modules/@11ty/eleventy/cmd.cjs", "--quiet"],
    {
      cwd: siteDir,
      stdio: "pipe",
      encoding: "utf-8",
      env: { ...process.env, ...env },
    },
  );
  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  return { ms, ...result };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log("=".repeat(70));
  console.log("CPU Profile: 100 Products × 4 Filter Attributes × 6 Values");
  console.log("=".repeat(70));
  console.log();

  // 1. Create test site
  console.log("--- Creating test site with 100 products ---");
  const files = generateProducts(100);
  console.log("  Products: 100");
  console.log(`  Filter attributes: ${ATTRIBUTE_NAMES.join(", ")}`);
  console.log("  Values per attribute: 6");
  console.log(
    `  Total filter combinations (theoretical max): ${6 ** 4} per-product-set`,
  );

  const site = await createTestSite({
    files,
    config: { show_cart: true },
  });
  console.log(`  Site dir: ${site.dir}`);
  console.log();

  // 2. Timed builds
  console.log("--- Build 1 (cold) ---");
  const build1 = runBuild(site.dir);
  if (build1.status !== 0) {
    console.error("Build FAILED:");
    console.error(build1.stderr);
    console.error(build1.stdout);
    site.cleanup();
    process.exit(1);
  }
  console.log(`  Build time: ${build1.ms.toFixed(0)} ms`);
  console.log();

  console.log("--- Build 2 (warm cache) ---");
  const build2 = runBuild(site.dir);
  console.log(`  Build time: ${build2.ms.toFixed(0)} ms`);
  console.log();

  // 3. Build with Eleventy benchmarks
  console.log("--- Build 3 (with Eleventy benchmarks) ---");
  const build3 = runBuild(site.dir, { DEBUG: "Eleventy:Benchmark*" });
  console.log(`  Build time: ${build3.ms.toFixed(0)} ms`);
  console.log();

  // 4. Parse and display benchmarks
  const benchmarks = parseBenchmarks(build3.stderr);

  if (benchmarks.length > 0) {
    console.log("--- Eleventy Benchmark Results (sorted by time) ---");
    console.log();
    console.log(`${"Time (ms)".padStart(10)} | ${"Count".padStart(7)} | Label`);
    console.log("-".repeat(70));

    for (const b of benchmarks.slice(0, 40)) {
      const ms = String(b.ms).padStart(10);
      const count = String(b.count).padStart(7);
      console.log(`${ms} | ${count} | ${b.label}`);
    }
    console.log();
  }

  // 5. Count output files
  console.log("--- Build Output Summary ---");
  const outputFiles = site.listOutputFiles();
  console.log(`  Total output files: ${outputFiles.length}`);

  const filterPages = outputFiles.filter((f) => f.includes("/filter/"));
  console.log(`  Filter pages: ${filterPages.length}`);

  const productPages = outputFiles.filter(
    (f) => f.startsWith("products/") && f.endsWith("index.html"),
  );
  console.log(`  Product pages: ${productPages.length}`);

  const categoryPages = outputFiles.filter(
    (f) => f.startsWith("categories/") && f.endsWith("index.html"),
  );
  console.log(`  Category pages: ${categoryPages.length}`);

  // 6. Multiple runs for statistics
  console.log();
  console.log("--- Multiple Run Statistics (3 runs) ---");
  const runs = [build1.ms, build2.ms, build3.ms];
  const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
  const min = Math.min(...runs);
  const max = Math.max(...runs);
  console.log(`  Run times: ${runs.map((r) => r.toFixed(0)).join(", ")} ms`);
  console.log(`  Average: ${avg.toFixed(0)} ms`);
  console.log(`  Min: ${min.toFixed(0)} ms | Max: ${max.toFixed(0)} ms`);

  console.log();
  console.log("=".repeat(70));
  console.log(`Site kept at: ${site.dir} (delete manually when done)`);
  console.log("=".repeat(70));
})();
