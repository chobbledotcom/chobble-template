import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupAllTestSites,
  createTestSite,
  withSetupTestSite,
} from "#test/test-site-factory.js";
import { expectAsyncThrows, rootDir } from "#test/test-utils.js";

/** Minimal page file for tests that just need a valid site */
const MINIMAL_PAGE = {
  path: "pages/index.md",
  frontmatter: { title: "Home", permalink: "/" },
  content: "Home",
};

/** Basic test page file with common defaults */
const factoryTestPage = (options = {}) => ({
  path: options.path || "pages/test.md",
  frontmatter: { title: options.title || "Test", ...options.frontmatter },
  content: options.content || "Test",
});

/** Common test file configuration */
const defaultTestFiles = [factoryTestPage()];

describe("test-site-factory", () => {
  // Clean up any leftover test sites after all tests
  afterAll(() => {
    cleanupAllTestSites();
  });

  // =========================================================================
  // Tests that verify site SETUP (no build required)
  // =========================================================================
  describe("createTestSite setup", () => {
    test("creates test site with custom config merged with existing config", async () => {
      const opts = {
        files: defaultTestFiles,
        config: { custom_field: "test-value" },
      };
      await withSetupTestSite(opts, (site) => {
        // Verify the config file includes both source config and custom config
        const configPath = path.join(site.srcDir, "_data/config.json");
        expect(fs.existsSync(configPath)).toBe(true);

        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        expect(config.custom_field).toBe("test-value");
        // Should also have fields from the source config.json
        expect(config).toBeTruthy();
      });
    });

    test("creates test site with custom strings", async () => {
      const opts = {
        files: defaultTestFiles,
        strings: { greeting: "Hello Test" },
      };
      await withSetupTestSite(opts, (site) => {
        // Verify strings.js was created with the custom strings
        const stringsPath = path.join(site.srcDir, "_data/strings.js");
        expect(fs.existsSync(stringsPath)).toBe(true);

        const stringsContent = fs.readFileSync(stringsPath, "utf-8");
        expect(stringsContent).toContain("greeting");
        expect(stringsContent).toContain("Hello Test");
      });
    });

    test("creates test site with custom dataFiles", async () => {
      const dataFiles = [
        { filename: "custom.json", data: { key: "value" } },
        { filename: "another.json", data: { foo: "bar" } },
      ];
      await withSetupTestSite(
        { files: defaultTestFiles, dataFiles },
        (site) => {
          // Verify custom data files were created
          const customPath = path.join(site.srcDir, "_data/custom.json");
          const anotherPath = path.join(site.srcDir, "_data/another.json");

          expect(fs.existsSync(customPath)).toBe(true);
          expect(fs.existsSync(anotherPath)).toBe(true);

          const customData = JSON.parse(fs.readFileSync(customPath, "utf-8"));
          expect(customData.key).toBe("value");

          const anotherData = JSON.parse(fs.readFileSync(anotherPath, "utf-8"));
          expect(anotherData.foo).toBe("bar");
        },
      );
    });

    test("creates test site with images from src/images", async () => {
      // Create a test image file in src/images for this test
      const testImagePath = path.join(rootDir, "src/images/test-image.jpg");
      fs.writeFileSync(testImagePath, "fake image content");

      try {
        await withSetupTestSite(
          { files: defaultTestFiles, images: ["test-image.jpg"] },
          (site) => {
            // Verify image was copied to site
            const copiedImagePath = path.join(
              site.srcDir,
              "images/test-image.jpg",
            );
            expect(fs.existsSync(copiedImagePath)).toBe(true);
          },
        );
      } finally {
        fs.unlinkSync(testImagePath);
      }
    });

    test("creates test site with images using object spec with absolute path", async () => {
      // Create a test image file
      const testImagePath = path.join(rootDir, "test-custom-image.jpg");
      fs.writeFileSync(testImagePath, "fake image content");

      try {
        await withSetupTestSite(
          {
            files: defaultTestFiles,
            images: [{ src: testImagePath, dest: "custom.jpg" }],
          },
          (site) => {
            // Verify image was copied with custom dest name
            const copiedImagePath = path.join(site.srcDir, "images/custom.jpg");
            expect(fs.existsSync(copiedImagePath)).toBe(true);
          },
        );
      } finally {
        fs.unlinkSync(testImagePath);
      }
    });
  });

  // =========================================================================
  // Tests that verify file manipulation (no build required)
  // =========================================================================
  describe("file manipulation methods", () => {
    let site;

    beforeAll(async () => {
      site = await createTestSite({ files: [MINIMAL_PAGE] });
    });

    afterAll(() => site?.cleanup());

    test("addFile adds a new file to the site", () => {
      site.addFile("test-file.txt", "Test content");

      const filePath = path.join(site.srcDir, "test-file.txt");
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, "utf-8")).toBe("Test content");
    });

    test("addMarkdown adds a markdown file with frontmatter", () => {
      site.addMarkdown("pages/added.md", {
        frontmatter: { title: "Added Page" },
        content: "# Added Content",
      });

      const filePath = path.join(site.srcDir, "pages/added.md");
      expect(fs.existsSync(filePath)).toBe(true);

      const fileContent = fs.readFileSync(filePath, "utf-8");
      expect(fileContent).toContain("title: Added Page");
      expect(fileContent).toContain("# Added Content");
    });
  });

  // =========================================================================
  // Tests that verify site OUTPUT (shared build for efficiency)
  // =========================================================================
  describe("site output methods", () => {
    let site;

    beforeAll(async () => {
      site = await createTestSite({
        files: [
          MINIMAL_PAGE,
          {
            path: "pages/test.md",
            frontmatter: { title: "Test Page", permalink: "/test/" },
            content: "# Hello World",
          },
          {
            path: "pages/about.md",
            frontmatter: { title: "About", permalink: "/about/" },
            content: "About",
          },
        ],
      });
      await site.build();
    });

    afterAll(() => site?.cleanup());

    test("hasOutput returns true for existing files", () => {
      expect(site.hasOutput("test/index.html")).toBe(true);
    });

    test("hasOutput returns false for non-existing files", () => {
      expect(site.hasOutput("nonexistent/file.html")).toBe(false);
    });

    test("getDoc returns a DOM document for querying HTML", async () => {
      const doc = await site.getDoc("test/index.html");

      // Should return a document we can query
      expect(doc.querySelector("h1")).toBeTruthy();
      // The H1 contains the title from frontmatter
      expect(doc.querySelector("h1").textContent).toContain("Test Page");
    });

    test("listOutputFiles returns all output files recursively", () => {
      const files = site.listOutputFiles();

      // Should list HTML files from the build
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes("index.html"))).toBe(true);
    });

    test("getOutput throws error when file does not exist", () => {
      expect(() => {
        site.getOutput("nonexistent/file.html");
      }).toThrow("Output file not found: nonexistent/file.html");
    });
  });

  // =========================================================================
  // Build error handling (needs separate site with broken config)
  // =========================================================================
  describe("build error handling", () => {
    test("build throws error with stderr when Eleventy build fails", async () => {
      await withSetupTestSite({ files: defaultTestFiles }, async (site) => {
        // Create an invalid .eleventy.js to force a build failure
        const invalidConfig = `
          export default function(eleventyConfig) {
            throw new Error("Intentional error for testing");
          }
        `;
        fs.writeFileSync(
          path.join(site.dir, ".eleventy.js"),
          invalidConfig,
          "utf-8",
        );

        // Build should fail and throw an error
        const error = await expectAsyncThrows(() => site.build());
        expect(error.message).toContain("Eleventy build failed");
        // Error should include stdout or stderr
        expect(error.stdout || error.stderr).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // Cleanup functionality
  // =========================================================================
  describe("cleanupAllTestSites", () => {
    test("removes all test site directories", async () => {
      // Create a couple of test sites with different pages
      const site1 = await createTestSite({ files: defaultTestFiles });
      const site2 = await createTestSite({
        files: [factoryTestPage({ path: "pages/test2.md", title: "Test 2" })],
      });

      // Get the test sites directory
      const testSitesDir = path.dirname(site1.dir);

      // Verify sites exist
      expect(fs.existsSync(site1.dir)).toBe(true);
      expect(fs.existsSync(site2.dir)).toBe(true);

      // Clean up all test sites
      cleanupAllTestSites();

      // Verify the entire .test-sites directory was removed
      expect(fs.existsSync(testSitesDir)).toBe(false);
    });
  });
});
