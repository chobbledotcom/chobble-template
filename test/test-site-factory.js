/**
 * Test Site Factory - Creates isolated Eleventy sites for testing.
 *
 * Usage:
 *   await withTestSite({
 *     files: [
 *       { path: 'events/my-event.md', frontmatter: { title: 'Test' }, content: '# Hello' },
 *       { path: 'pages/test.md', frontmatter: { title: 'Test', permalink: '/test/' } }
 *     ],
 *     config: { site_name: 'Test Site' },
 *     images: ['party.jpg']  // optional: copies from src/images/
 *   }, (site) => {
 *     const html = site.getOutput('/events/my-event/index.html');
 *     expectTrue(html.includes('Test'), 'Should contain test content');
 *   });
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ensureDir } from "#eleventy/file-utils.js";
import { ROOT_DIR } from "#lib/paths.js";
import { filter, flatMap, map, pipe, unique } from "#toolkit/fp/array.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { loadDOM } from "#utils/lazy-dom.js";

const rootDir = ROOT_DIR;

// -----------------------------------------------------------------------------
// Curried Path Utilities
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Pure Utility Functions
// -----------------------------------------------------------------------------

const getCachedDirList = memoize((dir) =>
  !fs.existsSync(dir)
    ? []
    : fs.readdirSync(dir).map((name) => ({
        name,
        isFile: fs.statSync(path.join(dir, name)).isFile(),
      })),
);

// -----------------------------------------------------------------------------
// Curried File Operations - Enable composition and partial application
// -----------------------------------------------------------------------------

/** Curried file writer: writeToDir(dir)(filename, content) */
const writeToDir = (dir) => (filename, content) => {
  const filePath = path.join(dir, filename);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  return filePath;
};

/** Curried JSON writer: writeJsonToDir(dir)(filename, data) */
const writeJsonToDir = (dir) => (filename, data) =>
  writeToDir(dir)(filename, JSON.stringify(data, null, 2));

/** Curried file copier: copyToDir(destDir)(srcPath, destName) */
const copyToDir =
  (destDir) =>
  (srcPath, destName = path.basename(srcPath)) => {
    const destPath = path.join(destDir, destName);
    ensureDir(path.dirname(destPath));
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  };

/** Create markdown file from content specification */
const createMarkdownFile =
  (dir) =>
  (filename, { frontmatter = {}, content = "" }) => {
    const write = writeToDir(dir);
    return write(filename, matter.stringify(content, frontmatter));
  };

// -----------------------------------------------------------------------------
// Directory Operations - Functional patterns for bulk operations
// -----------------------------------------------------------------------------

/** Copy files from a directory with optional filtering */
const copyDirFiles = (src, dest, filterFn = () => true) =>
  pipe(
    () => getCachedDirList(src),
    filter((entry) => entry.isFile && filterFn(entry.name)),
    map((entry) => {
      const copy = copyToDir(dest);
      return copy(path.join(src, entry.name), entry.name);
    }),
  )();

/** Copy 11ty data files for a collection */
const copy11tyDataFiles = (templateSrc, srcDir) => (collection) => {
  const hasExtension =
    (...exts) =>
    (filename) =>
      exts.some((ext) => filename.endsWith(ext));
  return copyDirFiles(
    path.join(templateSrc, collection),
    path.join(srcDir, collection),
    hasExtension(".11tydata.js", ".json"),
  );
};

// -----------------------------------------------------------------------------
// Main API Functions
// -----------------------------------------------------------------------------

/**
 * Create a test site with isolated content
 */
const createTestSite = async (options = {}) => {
  const randomId = () => Math.random().toString(36).slice(2, 10);
  const siteId = randomId();
  const siteDir = path.join(import.meta.dirname, ".test-sites", siteId);
  const srcDir = path.join(siteDir, "src");
  const outputDir = path.join(siteDir, "_site");
  const templateSrc = path.join(rootDir, "src");

  fs.mkdirSync(srcDir, { recursive: true });

  // Setup symlinks for shared directories
  const getCachedDirExists = memoize((dir) => fs.existsSync(dir));
  const symlinkDirs = (templateSrc, srcDir, dirs) => {
    for (const dir of dirs.filter((d) =>
      getCachedDirExists(path.join(templateSrc, d)),
    )) {
      fs.symlinkSync(path.join(templateSrc, dir), path.join(srcDir, dir));
    }
  };
  symlinkDirs(templateSrc, srcDir, [
    "_lib",
    "_includes",
    "_layouts",
    "css",
    "assets",
    "utils",
  ]);

  // Copy placeholder images for thumbnail fallbacks
  const placeholdersDir = path.join(templateSrc, "images/placeholders");
  if (fs.existsSync(placeholdersDir)) {
    const destDir = ensureDir(path.join(srcDir, "images/placeholders"));
    copyDirFiles(placeholdersDir, destDir);
  }

  // Setup data directory
  const setupDataDir = (templateSrc, srcDir, options) => {
    const dataSource = path.join(templateSrc, "_data");
    const dataTarget = path.join(srcDir, "_data");
    const writeData = writeToDir(dataTarget);
    const writeJson = writeJsonToDir(dataTarget);

    // Copy base data files
    copyDirFiles(dataSource, dataTarget);

    // Merge config with source config
    if (options.config) {
      const configPath = path.join(dataSource, "config.json");
      const existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      writeJson("config.json", { ...existing, ...options.config });
    }

    // Write custom strings module
    if (options.strings) {
      writeData(
        "strings.js",
        `export default ${JSON.stringify(options.strings, null, 2)};`,
      );
    }

    // Write additional data files
    if (options.dataFiles) {
      for (const { filename, data } of options.dataFiles) {
        writeJson(filename, data);
      }
    }
  };
  setupDataDir(templateSrc, srcDir, options);

  // Create content files and return collections touched
  const getCollection = (filePath) => filePath.split("/")[0];
  const extractCollections = pipe(
    map(({ path: filePath }) => getCollection(filePath)),
    unique,
  );
  const createContentFiles = (templateSrc, srcDir, files = []) => {
    const collections = extractCollections(files);
    const copyDataFiles = copy11tyDataFiles(templateSrc, srcDir);
    const writeMarkdown = createMarkdownFile(srcDir);

    // Copy data files for each collection (side effect)
    for (const collection of collections) {
      copyDataFiles(collection);
    }

    // Create markdown files (side effect)
    for (const file of files) {
      writeMarkdown(file.path, {
        frontmatter: file.frontmatter || {},
        content: file.content || "",
      });
    }

    return collections;
  };
  const collections = createContentFiles(templateSrc, srcDir, options.files);

  // Ensure an index page exists
  const ensureIndexPage = (templateSrc, srcDir, files = [], collections) => {
    const hasIndex = files.some(
      (f) => f.path === "pages/index.md" || f.frontmatter?.permalink === "/",
    );

    if (hasIndex) return;

    if (!collections.includes("pages")) {
      copy11tyDataFiles(templateSrc, srcDir)("pages");
    }

    createMarkdownFile(srcDir)("pages/index.md", {
      frontmatter: { title: "Test Site", layout: "page", permalink: "/" },
      content: "# Test Site",
    });
  };
  ensureIndexPage(templateSrc, srcDir, options.files, collections);

  // Copy test images
  const normalizeImageSpec = (img) =>
    typeof img === "string"
      ? { src: path.join(rootDir, "src/images", img), dest: img }
      : {
          src: img.src.startsWith("/") ? img.src : path.join(rootDir, img.src),
          dest: img.dest,
        };
  const copyTestImages = (srcDir, images = []) => {
    if (images.length === 0) return;

    const imagesDir = ensureDir(path.join(srcDir, "images"));
    const copyImage = copyToDir(imagesDir);

    for (const { src, dest } of images.map(normalizeImageSpec)) {
      copyImage(src, dest);
    }
  };
  copyTestImages(srcDir, options.images);

  // Copy config and create symlinks
  copyToDir(siteDir)(path.join(rootDir, ".eleventy.js"), ".eleventy.js");
  copyToDir(siteDir)(path.join(rootDir, "package.json"), "package.json");

  fs.symlinkSync(
    path.join(rootDir, "node_modules"),
    path.join(siteDir, "node_modules"),
  );
  fs.symlinkSync(
    path.join(rootDir, "packages"),
    path.join(siteDir, "packages"),
  );

  // Create the site object with all methods
  const inDir =
    (base) =>
    (...segments) =>
      path.join(base, ...segments);
  const listFilesRecursive = (dir, prefix = "") =>
    !fs.existsSync(dir)
      ? []
      : pipe(
          () => fs.readdirSync(dir),
          flatMap((entry) => {
            const fullPath = path.join(dir, entry);
            const relativePath = path.join(prefix, entry);
            return fs.statSync(fullPath).isDirectory()
              ? listFilesRecursive(fullPath, relativePath)
              : [relativePath];
          }),
        )();
  const createSiteObject = (siteId, siteDir, srcDir, outputDir) => {
    // Curried helper bound to output directory
    const getOutputPath = inDir(outputDir);

    return Object.freeze({
      id: siteId,
      dir: siteDir,
      srcDir,
      outputDir,

      async build() {
        const result = spawnSync(
          "bun",
          ["./node_modules/@11ty/eleventy/cmd.cjs", "--quiet"],
          { cwd: siteDir, stdio: "pipe", encoding: "utf-8" },
        );

        if (result.status !== 0) {
          const error = new Error(
            `Eleventy build failed: ${result.stderr || result.stdout}`,
          );
          error.stdout = result.stdout;
          error.stderr = result.stderr;
          throw error;
        }

        return result.stdout;
      },

      getOutput(filePath) {
        const fullPath = getOutputPath(filePath);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`Output file not found: ${filePath}`);
        }
        return fs.readFileSync(fullPath, "utf-8");
      },

      async getDoc(filePath) {
        const { window } = await loadDOM(this.getOutput(filePath));
        return window.document;
      },

      hasOutput(filePath) {
        return fs.existsSync(getOutputPath(filePath));
      },

      listOutputFiles() {
        return listFilesRecursive(outputDir);
      },

      addFile(relativePath, content) {
        writeToDir(srcDir)(relativePath, content);
      },

      addMarkdown(relativePath, opts) {
        createMarkdownFile(srcDir)(relativePath, opts);
      },

      cleanup() {
        if (fs.existsSync(siteDir)) {
          fs.rmSync(siteDir, { recursive: true, force: true });
        }
      },
    });
  };

  return createSiteObject(siteId, siteDir, srcDir, outputDir);
};

/**
 * Create a test site, build it, run checks, and clean up automatically.
 */
const withTestSite = async (options, fn) => {
  const site = await createTestSite(options);
  try {
    await site.build();
    await fn(site);
  } finally {
    site.cleanup();
  }
};

/**
 * Create a test site for setup testing (no build), run checks, and clean up.
 * Use this for testing site creation/setup without running Eleventy build.
 */
const withSetupTestSite = async (options, fn) => {
  const site = await createTestSite(options);
  try {
    await fn(site);
  } finally {
    site.cleanup();
  }
};

const cleanupAllTestSites = () => {
  const testSitesDir = path.join(import.meta.dirname, ".test-sites");
  if (fs.existsSync(testSitesDir)) {
    fs.rmSync(testSitesDir, { recursive: true, force: true });
  }
};

export { createTestSite, withTestSite, withSetupTestSite, cleanupAllTestSites };
