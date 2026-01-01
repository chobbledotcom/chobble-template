/**
 * Test Site Factory
 *
 * Creates isolated, self-contained Eleventy sites for testing.
 * Each test site inherits the template's infrastructure (_lib, _includes, _layouts, etc.)
 * but has its own content, allowing tests to verify behavior without polluting the real src.
 *
 * Usage:
 *   const site = await createTestSite({
 *     events: [
 *       { filename: 'my-event.md', frontmatter: { title: 'Test', recurring_date: 'Weekly' }, content: '# Hello' }
 *     ],
 *     config: { site_name: 'Test Site' }
 *   });
 *
 *   await site.build();
 *   const html = site.getOutput('/events/my-event/index.html');
 *   site.cleanup();
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Counter for unique site names
let siteCounter = 0;

/**
 * Create a markdown file with YAML frontmatter
 */
const createMarkdownFile = (dir, filename, { frontmatter = {}, content = "" }) => {
  const filePath = path.join(dir, filename);
  const parentDir = path.dirname(filePath);

  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(filePath, fileContent);
  return filePath;
};

/**
 * Create a JSON data file
 */
const createJsonFile = (dir, filename, data) => {
  const filePath = path.join(dir, filename);
  const parentDir = path.dirname(filePath);

  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
};

/**
 * Create a test site with isolated content
 *
 * @param {Object} options
 * @param {Array} options.events - Event markdown files to create
 * @param {Array} options.pages - Page markdown files to create
 * @param {Array} options.products - Product markdown files to create
 * @param {Array} options.categories - Category markdown files to create
 * @param {Array} options.reviews - Review markdown files to create
 * @param {Array} options.locations - Location markdown files to create
 * @param {Object} options.config - Override config.json values
 * @param {Object} options.strings - Override strings.js values
 * @param {Array} options.dataFiles - Additional data files [{ filename, data }]
 * @param {boolean} options.minimal - If true, skip copying optional directories
 */
const createTestSite = async (options = {}) => {
  const siteId = `test-site-${Date.now()}-${++siteCounter}`;
  const siteDir = path.join(__dirname, ".test-sites", siteId);
  const srcDir = path.join(siteDir, "src");
  const outputDir = path.join(siteDir, "_site");

  // Create directory structure
  fs.mkdirSync(srcDir, { recursive: true });

  // Symlink the template infrastructure (read-only, shared)
  const templateSrc = path.join(rootDir, "src");
  const dirsToLink = ["_lib", "_includes", "_layouts", "css", "assets"];

  for (const dir of dirsToLink) {
    const source = path.join(templateSrc, dir);
    const target = path.join(srcDir, dir);
    if (fs.existsSync(source)) {
      fs.symlinkSync(source, target);
    }
  }

  // Copy _data directory (we need to modify config)
  const dataSource = path.join(templateSrc, "_data");
  const dataTarget = path.join(srcDir, "_data");
  fs.mkdirSync(dataTarget, { recursive: true });

  // Copy all data files
  for (const file of fs.readdirSync(dataSource)) {
    const src = path.join(dataSource, file);
    const dest = path.join(dataTarget, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }

  // Override config if provided
  if (options.config) {
    const configPath = path.join(dataTarget, "config.json");
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
    config = { ...config, ...options.config };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  // Override strings if provided
  if (options.strings) {
    const stringsPath = path.join(dataTarget, "strings.js");
    let stringsContent = `export default ${JSON.stringify(options.strings, null, 2)};`;
    fs.writeFileSync(stringsPath, stringsContent);
  }

  // Create content directories and files
  const contentTypes = {
    events: "events",
    pages: "pages",
    products: "products",
    categories: "categories",
    reviews: "reviews",
    locations: "locations",
    news: "news",
    team: "team",
  };

  for (const [optionKey, dirName] of Object.entries(contentTypes)) {
    const items = options[optionKey];
    if (items && Array.isArray(items)) {
      const contentDir = path.join(srcDir, dirName);
      fs.mkdirSync(contentDir, { recursive: true });

      // Copy 11tydata files from template if they exist
      const templateContentDir = path.join(templateSrc, dirName);
      if (fs.existsSync(templateContentDir)) {
        for (const file of fs.readdirSync(templateContentDir)) {
          if (file.endsWith(".11tydata.js") || file.endsWith(".json")) {
            fs.copyFileSync(
              path.join(templateContentDir, file),
              path.join(contentDir, file),
            );
          }
        }
      }

      // Create the markdown files
      for (const item of items) {
        createMarkdownFile(contentDir, item.filename, {
          frontmatter: item.frontmatter || {},
          content: item.content || "",
        });
      }
    }
  }

  // Create additional data files
  if (options.dataFiles) {
    for (const { filename, data } of options.dataFiles) {
      createJsonFile(dataTarget, filename, data);
    }
  }

  // Create a minimal index page if no pages provided
  if (!options.pages || options.pages.length === 0) {
    const pagesDir = path.join(srcDir, "pages");
    fs.mkdirSync(pagesDir, { recursive: true });
    createMarkdownFile(pagesDir, "index.md", {
      frontmatter: {
        title: "Test Site",
        layout: "page",
        permalink: "/",
      },
      content: "# Test Site",
    });
  }

  // Copy the eleventy config
  fs.copyFileSync(
    path.join(rootDir, ".eleventy.js"),
    path.join(siteDir, ".eleventy.js"),
  );

  // Copy package.json for module resolution
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"),
  );
  // Update imports to point to our src
  fs.writeFileSync(
    path.join(siteDir, "package.json"),
    JSON.stringify(pkgJson, null, 2),
  );

  // Symlink node_modules
  fs.symlinkSync(
    path.join(rootDir, "node_modules"),
    path.join(siteDir, "node_modules"),
  );

  // Return the site object
  const site = {
    id: siteId,
    dir: siteDir,
    srcDir,
    outputDir,

    /**
     * Build the site with Eleventy
     */
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

    /**
     * Get the content of an output file
     * @param {string} filePath - Path relative to _site (e.g., '/events/my-event/index.html')
     */
    getOutput(filePath) {
      const fullPath = path.join(outputDir, filePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Output file not found: ${filePath}`);
      }
      return fs.readFileSync(fullPath, "utf-8");
    },

    /**
     * Check if an output file exists
     */
    hasOutput(filePath) {
      return fs.existsSync(path.join(outputDir, filePath));
    },

    /**
     * List all output files
     */
    listOutputFiles() {
      const files = [];
      const walk = (dir, prefix = "") => {
        for (const entry of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, entry);
          const relativePath = path.join(prefix, entry);
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, relativePath);
          } else {
            files.push(relativePath);
          }
        }
      };
      if (fs.existsSync(outputDir)) {
        walk(outputDir);
      }
      return files;
    },

    /**
     * Add a file to the site after creation
     */
    addFile(relativePath, content) {
      const fullPath = path.join(srcDir, relativePath);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content);
    },

    /**
     * Add a markdown file with frontmatter
     */
    addMarkdown(relativePath, { frontmatter = {}, content = "" }) {
      createMarkdownFile(srcDir, relativePath, { frontmatter, content });
    },

    /**
     * Clean up the test site
     */
    cleanup() {
      if (fs.existsSync(siteDir)) {
        fs.rmSync(siteDir, { recursive: true, force: true });
      }
    },
  };

  return site;
};

/**
 * Clean up all test sites (for use in test teardown)
 */
const cleanupAllTestSites = () => {
  const testSitesDir = path.join(__dirname, ".test-sites");
  if (fs.existsSync(testSitesDir)) {
    fs.rmSync(testSitesDir, { recursive: true, force: true });
  }
};

export { createTestSite, cleanupAllTestSites, createMarkdownFile, createJsonFile };
