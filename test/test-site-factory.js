/**
 * Test Site Factory - Creates isolated Eleventy sites for testing.
 *
 * Usage:
 *   await withTestSite({
 *     files: [
 *       { path: 'events/my-event.md', frontmatter: { title: 'Test' }, content: '# Hello' },
 *       { path: 'pages/test.md', frontmatter: { title: 'Test', permalink: '/test/' } }
 *     ],
 *     config: { show_breadcrumbs: false },
 *     images: ['party.jpg'],  // optional: copies from test/fixtures/images/
 *     processImages: true  // optional: real sharp processing instead of placeholders
 *   }, (site) => {
 *     const html = site.getOutput('/events/my-event/index.html');
 *     expectTrue(html.includes('Test'), 'Should contain test content');
 *   });
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { afterAll, beforeAll } from "vitest";
import { directoryData } from "#collections/directory-data.js";
import { ensureDir } from "#eleventy/file-utils.js";
import { ROOT_DIR } from "#lib/paths.js";
import { filter, flatMap, map, pipe, unique } from "#utils/fp/array.js";
import { memoize } from "#utils/fp/memoize.js";
import { loadDOM } from "#utils/lazy-dom.js";

const rootDir = ROOT_DIR;
const FIXTURES_DIR = path.join(rootDir, "test", "fixtures");
const SITE_DATA_REGISTER = path.join(
  import.meta.dirname,
  "test-site-data-register.js",
);

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

/** Drain a child process stream into a string */
const collectStream = async (stream) =>
  Buffer.concat(await Array.fromAsync(stream)).toString();

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

/**
 * Write a collection's directory data file - the same one-line re-export of
 * the template's directory data a site's own collection directory holds - so
 * test sites never depend on a collection directory the site may have deleted.
 * Directories that are not template collections get no directory data.
 */
const writeDirectoryData = (srcDir) => (collection) => {
  if (!directoryData(collection)) return;
  writeToDir(srcDir)(
    `${collection}/${collection}.11tydata.js`,
    `import { directoryData } from "#collections/directory-data.js";\n\nexport default directoryData("${collection}");\n`,
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

    // Copy the data modules, then the template-default site data over the
    // site's own: tests build the template, not the fork they run in.
    copyDirFiles(dataSource, dataTarget);
    copyDirFiles(path.join(FIXTURES_DIR, "site-data"), dataTarget);

    // Merge config with the template-default config
    if (options.config) {
      const configPath = path.join(dataTarget, "config.json");
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
  const createContentFiles = (srcDir, files = []) => {
    const collections = extractCollections(files);
    const writeMarkdown = createMarkdownFile(srcDir);

    // Write directory data for each collection (side effect)
    for (const collection of collections) {
      writeDirectoryData(srcDir)(collection);
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
  const collections = createContentFiles(srcDir, options.files);

  // Ensure something serves "/": a home page, or a redirect from "/" (a site
  // whose default language lives under a prefix such as /en/)
  const ensureIndexPage = (srcDir, files = [], collections) => {
    const hasIndex = files.some(
      (f) =>
        f.path === "pages/index.md" ||
        f.frontmatter?.permalink === "/" ||
        [f.frontmatter?.redirect_from].flat().includes("/"),
    );

    if (hasIndex) return;

    if (!collections.includes("pages")) {
      writeDirectoryData(srcDir)("pages");
    }

    createMarkdownFile(srcDir)("pages/index.md", {
      frontmatter: {
        name: "Test Site",
        permalink: "/",
        blocks: [{ type: "markdown", content: "# Test Site" }],
      },
    });
  };
  ensureIndexPage(srcDir, options.files, collections);

  // Copy test images
  const normalizeImageSpec = (img) =>
    typeof img === "string"
      ? { src: path.join(FIXTURES_DIR, "images", img), dest: img }
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

  // Copy the directory data file providing the default base.html layout
  copyToDir(srcDir)(
    path.join(templateSrc, "src.11tydata.js"),
    "src.11tydata.js",
  );

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
  const createSiteObject = (siteId, siteDir, srcDir, outputDir, options) => {
    // Curried helper bound to output directory
    const getOutputPath = inDir(outputDir);

    return Object.freeze({
      id: siteId,
      dir: siteDir,
      srcDir,
      outputDir,

      async build() {
        // Async spawn so concurrent tests can overlap builds. Sites skip
        // sharp image processing unless the test opts in via processImages.
        const child = spawn(
          process.execPath,
          [
            "--import",
            pathToFileURL(SITE_DATA_REGISTER).href,
            "./node_modules/@11ty/eleventy/cmd.cjs",
            "--quiet",
          ],
          {
            cwd: siteDir,
            stdio: ["ignore", "pipe", "pipe"],
            env: {
              ...process.env,
              ...options.env,
              TEST_SITE_DIR: siteDir,
              PLACEHOLDER_IMAGES: options.processImages ? "0" : "1",
              // Blank the vitest worker's cache override so each site keeps
              // its own .image-cache instead of sharing the worker's.
              IMAGE_CACHE_DIR: "",
            },
          },
        );
        const [stdout, stderr, status] = await Promise.all([
          collectStream(child.stdout),
          collectStream(child.stderr),
          new Promise((resolve) => child.on("close", resolve)),
        ]);

        if (status !== 0) {
          const error = new Error(`Eleventy build failed:\n${stdout}${stderr}`);
          error.stdout = stdout;
          error.stderr = stderr;
          throw error;
        }

        return stdout;
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

  return createSiteObject(siteId, siteDir, srcDir, outputDir, options);
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

/**
 * Build one shared test site for an entire describe block. Registers the
 * build in `beforeAll` and cleanup in `afterAll`, and returns a getter for
 * the built site. Use when several tests inspect different outputs of the
 * same site, so the (expensive) Eleventy build runs once instead of per test.
 */
const useSharedSite = (options) => {
  let site = null;
  beforeAll(async () => {
    site = await createTestSite(options);
    await site.build();
  }, 30_000);
  afterAll(() => site?.cleanup());
  return () => site;
};

/**
 * Run a describe block's in-process tests from inside an unbuilt test site.
 * Code that resolves files from the working directory - images resolve from
 * ./src/images - then reads the site's fixtures instead of whatever content
 * the repository (perhaps a fork with its demo deleted) happens to hold.
 */
const useSiteAsWorkingDirectory = (options) => {
  let restore = null;
  beforeAll(async () => {
    const site = await createTestSite(options);
    process.chdir(site.dir);
    restore = () => {
      process.chdir(rootDir);
      site.cleanup();
    };
  });
  afterAll(() => restore?.());
};

// The shared .test-sites root is swept by test/global-teardown.js after the
// whole run, never mid-run: parallel workers build sibling sites in the same
// root, so removing it from inside any single test file would race them.

/**
 * A standalone page file carrying the given design-system blocks, served at
 * `/<slug>/`.
 * @param {string} slug
 * @param {Record<string, unknown>[]} blocks
 */
const pageWithBlocks = (slug, blocks) => ({
  path: `pages/${slug}.md`,
  frontmatter: { name: slug, permalink: `/${slug}/`, blocks },
});

export {
  createTestSite,
  pageWithBlocks,
  useSharedSite,
  useSiteAsWorkingDirectory,
  withSetupTestSite,
  withTestSite,
};
