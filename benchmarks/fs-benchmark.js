/**
 * Benchmark: Node.js fs vs Bun.file() for file reading operations
 *
 * Tests:
 * 1. Single read performance (cold)
 * 2. Repeated reads (same file multiple times)
 * 3. Memoized Node fs vs raw Bun.file() repeated reads
 * 4. Different file sizes
 * 5. Sync vs async patterns
 */
import fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Simple memoize for benchmarking (matches project pattern)
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = args[0];
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Test file sizes
const FILE_SIZES = {
  tiny: 100, // 100 bytes - like small config snippets
  small: 1024, // 1KB - typical template file
  medium: 10 * 1024, // 10KB - larger template/component
  large: 100 * 1024, // 100KB - big bundled file
  xlarge: 1024 * 1024, // 1MB - very large file
};

// Generate test content
const generateContent = (size) => "x".repeat(size);

// Create temp files for testing
const setupTestFiles = () => {
  const tempDir = join(tmpdir(), `bun-fs-bench-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const files = {};
  for (const [name, size] of Object.entries(FILE_SIZES)) {
    const filePath = join(tempDir, `${name}.txt`);
    fs.writeFileSync(filePath, generateContent(size));
    files[name] = filePath;
  }

  return { tempDir, files };
};

// Cleanup
const cleanup = (tempDir) => {
  fs.rmSync(tempDir, { recursive: true, force: true });
};

// Benchmark runner
const benchmark = async (name, fn, iterations = 1000) => {
  // Warmup
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSec = Math.round(1000 / avgMs);

  return { name, totalMs, avgMs, opsPerSec, iterations };
};

// Format results
const formatResult = (result) =>
  `${result.name.padEnd(45)} ${result.avgMs.toFixed(4).padStart(10)}ms/op  ${String(result.opsPerSec).padStart(8)} ops/sec`;

const printHeader = (title) => {
  console.log("\n" + "=".repeat(70));
  console.log(title);
  console.log("=".repeat(70));
};

// Main benchmark
const runBenchmarks = async () => {
  console.log("Setting up test files...");
  const { tempDir, files } = setupTestFiles();

  try {
    // =========================================================================
    // TEST 1: Single cold read comparison
    // =========================================================================
    printHeader("TEST 1: Single Read Performance (per file size)");
    console.log("Comparing fs.readFileSync vs Bun.file().text() for single reads\n");

    for (const [sizeName, filePath] of Object.entries(files)) {
      const nodeResult = await benchmark(
        `Node fs.readFileSync (${sizeName})`,
        () => fs.readFileSync(filePath, "utf8"),
        5000,
      );

      const bunResult = await benchmark(
        `Bun.file().text() (${sizeName})`,
        async () => await Bun.file(filePath).text(),
        5000,
      );

      console.log(formatResult(nodeResult));
      console.log(formatResult(bunResult));
      const ratio = (nodeResult.avgMs / bunResult.avgMs).toFixed(2);
      console.log(
        `  → Bun is ${ratio}x ${bunResult.avgMs < nodeResult.avgMs ? "faster" : "slower"}\n`,
      );
    }

    // =========================================================================
    // TEST 2: Repeated reads (cache hit scenario)
    // =========================================================================
    printHeader("TEST 2: Repeated Reads - Same File 1000x");
    console.log(
      "Comparing memoized Node fs vs raw Bun.file() for repeated reads\n",
    );

    const testFile = files.medium; // 10KB file

    // Memoized Node fs (current pattern)
    const memoizedReadFile = memoize((path) => fs.readFileSync(path, "utf8"));

    const memoizedResult = await benchmark(
      "Memoized fs.readFileSync",
      () => memoizedReadFile(testFile),
      10000,
    );

    // Raw Bun.file() repeated
    const bunRepeatedResult = await benchmark(
      "Bun.file().text() (no memo)",
      async () => await Bun.file(testFile).text(),
      10000,
    );

    // Memoized Bun.file()
    const memoizedBunFile = memoize(
      async (path) => await Bun.file(path).text(),
    );
    // Prime the cache
    await memoizedBunFile(testFile);

    const memoizedBunResult = await benchmark(
      "Memoized Bun.file().text()",
      async () => await memoizedBunFile(testFile),
      10000,
    );

    console.log(formatResult(memoizedResult));
    console.log(formatResult(bunRepeatedResult));
    console.log(formatResult(memoizedBunResult));

    console.log("\nKey insight: Memoization eliminates I/O entirely on cache hit");
    console.log(
      `Memoized Node vs raw Bun repeated: ${(bunRepeatedResult.avgMs / memoizedResult.avgMs).toFixed(1)}x difference`,
    );

    // =========================================================================
    // TEST 3: First read vs subsequent reads
    // =========================================================================
    printHeader("TEST 3: Cold vs Warm Read (OS page cache effect)");

    // Clear memoize cache by creating new functions
    const freshNodeRead = () => fs.readFileSync(files.large, "utf8");
    const freshBunRead = async () => await Bun.file(files.large).text();

    // Force file out of OS cache (best effort)
    fs.copyFileSync(files.large, files.large + ".tmp");
    fs.unlinkSync(files.large + ".tmp");

    console.log("100KB file - measuring first vs subsequent reads\n");

    // First read (potentially cold)
    const nodeFirst = await benchmark("Node first read", freshNodeRead, 100);
    const bunFirst = await benchmark("Bun first read", freshBunRead, 100);

    // Warm reads (file in OS cache)
    const nodeWarm = await benchmark("Node warm reads", freshNodeRead, 1000);
    const bunWarm = await benchmark("Bun warm reads", freshBunRead, 1000);

    console.log(formatResult(nodeFirst));
    console.log(formatResult(bunFirst));
    console.log(formatResult(nodeWarm));
    console.log(formatResult(bunWarm));

    // =========================================================================
    // TEST 4: Sync patterns for existsSync replacement
    // =========================================================================
    printHeader("TEST 4: File Existence Check");
    console.log("Comparing fs.existsSync vs Bun.file().exists()\n");

    const existsFile = files.small;
    const nonExistentFile = join(tempDir, "does-not-exist.txt");

    const nodeExistsResult = await benchmark(
      "fs.existsSync (exists)",
      () => fs.existsSync(existsFile),
      10000,
    );

    const bunExistsResult = await benchmark(
      "Bun.file().exists() (exists)",
      async () => await Bun.file(existsFile).exists(),
      10000,
    );

    const nodeNotExistsResult = await benchmark(
      "fs.existsSync (not exists)",
      () => fs.existsSync(nonExistentFile),
      10000,
    );

    const bunNotExistsResult = await benchmark(
      "Bun.file().exists() (not exists)",
      async () => await Bun.file(nonExistentFile).exists(),
      10000,
    );

    console.log(formatResult(nodeExistsResult));
    console.log(formatResult(bunExistsResult));
    console.log(formatResult(nodeNotExistsResult));
    console.log(formatResult(bunNotExistsResult));

    // =========================================================================
    // TEST 5: fs.statSync vs Bun.file().size
    // =========================================================================
    printHeader("TEST 5: File Size Check");
    console.log("Comparing fs.statSync().size vs Bun.file().size\n");

    const statFile = files.medium;

    const nodeStatResult = await benchmark(
      "fs.statSync().size",
      () => fs.statSync(statFile).size,
      10000,
    );

    // Note: Bun.file().size is synchronous and lazy - doesn't read the file
    const bunSizeResult = await benchmark(
      "Bun.file().size (sync, lazy)",
      () => Bun.file(statFile).size,
      10000,
    );

    console.log(formatResult(nodeStatResult));
    console.log(formatResult(bunSizeResult));

    // =========================================================================
    // TEST 6: Binary file reading
    // =========================================================================
    printHeader("TEST 6: Binary Read (Buffer vs Uint8Array)");
    console.log("Comparing fs.readFileSync (Buffer) vs Bun.file().bytes()\n");

    const binaryFile = files.large;

    const nodeBinaryResult = await benchmark(
      "fs.readFileSync (Buffer)",
      () => fs.readFileSync(binaryFile),
      2000,
    );

    const bunBinaryResult = await benchmark(
      "Bun.file().bytes() (Uint8Array)",
      async () => await Bun.file(binaryFile).bytes(),
      2000,
    );

    // ArrayBuffer variant
    const bunArrayBufferResult = await benchmark(
      "Bun.file().arrayBuffer()",
      async () => await Bun.file(binaryFile).arrayBuffer(),
      2000,
    );

    console.log(formatResult(nodeBinaryResult));
    console.log(formatResult(bunBinaryResult));
    console.log(formatResult(bunArrayBufferResult));

    // =========================================================================
    // SUMMARY
    // =========================================================================
    printHeader("SUMMARY");
    console.log(`
Key findings for this system:

1. SINGLE READS: Compare Bun vs Node for cold reads at different sizes
   - Check the ratios above for your workload

2. REPEATED READS (cache hit):
   - Memoized reads are ~instant (Map lookup)
   - Raw Bun.file() still does I/O each time
   - Memoization wins for repeated access to same file

3. RECOMMENDATIONS:
   - For files read ONCE: Bun.file() may be faster (check ratios)
   - For files read MULTIPLE TIMES: Keep memoization
   - Bun.file().size is synchronous and very fast for size checks
   - Consider hybrid: Bun.file() + memoization for best of both

4. API CONSIDERATIONS:
   - Bun.file().text() is async, fs.readFileSync is sync
   - If your code path is already async, Bun.file() fits naturally
   - For sync code paths, fs.readFileSync may be simpler
`);
  } finally {
    cleanup(tempDir);
    console.log("\nCleaned up test files.");
  }
};

runBenchmarks().catch(console.error);
