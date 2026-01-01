/**
 * Test Site Factory - Creates isolated Eleventy sites for testing.
 *
 * Usage:
 *   const site = await createTestSite({
 *     files: [
 *       { path: 'events/my-event.md', frontmatter: { title: 'Test' }, content: '# Hello' },
 *       { path: 'pages/test.md', frontmatter: { title: 'Test', permalink: '/test/' } }
 *     ],
 *     config: { site_name: 'Test Site' }
 *   });
 *   await site.build();
 *   const html = site.getOutput('/events/my-event/index.html');
 *   site.cleanup();
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const randomId = () => Math.random().toString(36).slice(2, 10);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const copyFile = (src, dest) => {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
};

const writeJson = (filePath, data) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const createMarkdownFile = (
  dir,
  filename,
  { frontmatter = {}, content = "" },
) => {
  const filePath = path.join(dir, filename);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, matter.stringify(content, frontmatter));
  return filePath;
};

const copyDirFiles = (src, dest, filter = () => true) => {
  if (!fs.existsSync(src)) return;
  for (const file of fs.readdirSync(src)) {
    if (fs.statSync(path.join(src, file)).isFile() && filter(file)) {
      copyFile(path.join(src, file), path.join(dest, file));
    }
  }
};

const copy11tyDataFiles = (templateSrc, srcDir, collection) => {
  copyDirFiles(
    path.join(templateSrc, collection),
    path.join(srcDir, collection),
    (f) => f.endsWith(".11tydata.js") || f.endsWith(".json"),
  );
};

const symlinkDirs = (templateSrc, srcDir, dirs) => {
  for (const dir of dirs) {
    const source = path.join(templateSrc, dir);
    if (fs.existsSync(source)) {
      fs.symlinkSync(source, path.join(srcDir, dir));
    }
  }
};

const setupDataDir = (templateSrc, srcDir, options) => {
  const dataSource = path.join(templateSrc, "_data");
  const dataTarget = path.join(srcDir, "_data");
  copyDirFiles(dataSource, dataTarget);

  if (options.config) {
    const configPath = path.join(dataTarget, "config.json");
    const existing = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
      : {};
    writeJson(configPath, { ...existing, ...options.config });
  }

  if (options.strings) {
    const content = `export default ${JSON.stringify(options.strings, null, 2)};`;
    fs.writeFileSync(path.join(dataTarget, "strings.js"), content);
  }

  if (options.dataFiles) {
    for (const { filename, data } of options.dataFiles) {
      writeJson(path.join(dataTarget, filename), data);
    }
  }
};

const createContentFiles = (templateSrc, srcDir, files) => {
  const seenCollections = new Set();

  for (const file of files || []) {
    const collection = file.path.split("/")[0];
    if (!seenCollections.has(collection)) {
      seenCollections.add(collection);
      copy11tyDataFiles(templateSrc, srcDir, collection);
    }
    createMarkdownFile(srcDir, file.path, {
      frontmatter: file.frontmatter || {},
      content: file.content || "",
    });
  }

  return seenCollections;
};

const ensureIndexPage = (templateSrc, srcDir, files, seenCollections) => {
  const hasIndex = files?.some(
    (f) => f.path === "pages/index.md" || f.frontmatter?.permalink === "/",
  );
  if (hasIndex) return;

  if (!seenCollections.has("pages")) {
    copy11tyDataFiles(templateSrc, srcDir, "pages");
  }
  createMarkdownFile(srcDir, "pages/index.md", {
    frontmatter: { title: "Test Site", layout: "page", permalink: "/" },
    content: "# Test Site",
  });
};

const createSiteObject = (siteId, siteDir, srcDir, outputDir) => ({
  id: siteId,
  dir: siteDir,
  srcDir,
  outputDir,

  async build() {
    const result = spawnSync("npx", ["eleventy", "--quiet"], {
      cwd: siteDir,
      stdio: "pipe",
      encoding: "utf-8",
    });
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
    const fullPath = path.join(outputDir, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Output file not found: ${filePath}`);
    }
    return fs.readFileSync(fullPath, "utf-8");
  },

  getDoc(filePath) {
    return new JSDOM(this.getOutput(filePath)).window.document;
  },

  hasOutput(filePath) {
    return fs.existsSync(path.join(outputDir, filePath));
  },

  listOutputFiles() {
    const files = [];
    const walk = (dir, prefix = "") => {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const rel = path.join(prefix, entry);
        fs.statSync(fullPath).isDirectory()
          ? walk(fullPath, rel)
          : files.push(rel);
      }
    };
    if (fs.existsSync(outputDir)) walk(outputDir);
    return files;
  },

  addFile(relativePath, content) {
    const fullPath = path.join(srcDir, relativePath);
    ensureDir(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content);
  },

  addMarkdown(relativePath, opts) {
    createMarkdownFile(srcDir, relativePath, opts);
  },

  cleanup() {
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true, force: true });
    }
  },
});

/**
 * Create a test site with isolated content
 */
const createTestSite = async (options = {}) => {
  const siteId = randomId();
  const siteDir = path.join(__dirname, ".test-sites", siteId);
  const srcDir = path.join(siteDir, "src");
  const outputDir = path.join(siteDir, "_site");
  const templateSrc = path.join(rootDir, "src");

  fs.mkdirSync(srcDir, { recursive: true });

  symlinkDirs(templateSrc, srcDir, [
    "_lib",
    "_includes",
    "_layouts",
    "css",
    "assets",
  ]);
  setupDataDir(templateSrc, srcDir, options);

  const seenCollections = createContentFiles(
    templateSrc,
    srcDir,
    options.files,
  );
  ensureIndexPage(templateSrc, srcDir, options.files, seenCollections);

  copyFile(
    path.join(rootDir, ".eleventy.js"),
    path.join(siteDir, ".eleventy.js"),
  );

  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"),
  );
  writeJson(path.join(siteDir, "package.json"), pkgJson);

  fs.symlinkSync(
    path.join(rootDir, "node_modules"),
    path.join(siteDir, "node_modules"),
  );

  return createSiteObject(siteId, siteDir, srcDir, outputDir);
};

/**
 * Create a test site, build it, run checks, and clean up automatically.
 *
 * Usage:
 *   await withTestSite({ files: [...] }, (site) => {
 *     const doc = site.getDoc('/test/index.html');
 *     expectTrue(doc.querySelector('ul') !== null);
 *   });
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

const cleanupAllTestSites = () => {
  const testSitesDir = path.join(__dirname, ".test-sites");
  if (fs.existsSync(testSitesDir)) {
    fs.rmSync(testSitesDir, { recursive: true, force: true });
  }
};

export { createTestSite, withTestSite, cleanupAllTestSites };
