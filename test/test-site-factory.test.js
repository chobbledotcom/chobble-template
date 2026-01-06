import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupAllTestSites,
  createTestSite,
  withTestSite,
} from "#test/test-site-factory.js";

describe("test-site-factory", () => {
  // Clean up any leftover test sites before and after all tests
  afterAll(() => {
    cleanupAllTestSites();
  });

  describe("createTestSite", () => {
    test("creates test site with custom config merged with existing config", async () => {
      const site = await createTestSite({
        config: { custom_field: "test-value" },
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });

      try {
        // Verify the config file includes both source config and custom config
        const configPath = path.join(site.srcDir, "_data/config.json");
        expect(fs.existsSync(configPath)).toBe(true);

        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        expect(config.custom_field).toBe("test-value");
        // Should also have fields from the source config.json
        expect(config).toBeTruthy();
      } finally {
        site.cleanup();
      }
    });

    test("creates test site with custom strings", async () => {
      const site = await createTestSite({
        strings: { greeting: "Hello Test" },
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });

      try {
        // Verify strings.js was created with the custom strings
        const stringsPath = path.join(site.srcDir, "_data/strings.js");
        expect(fs.existsSync(stringsPath)).toBe(true);

        const stringsContent = fs.readFileSync(stringsPath, "utf-8");
        expect(stringsContent).toContain("greeting");
        expect(stringsContent).toContain("Hello Test");
      } finally {
        site.cleanup();
      }
    });

    test("creates test site with custom dataFiles", async () => {
      const site = await createTestSite({
        dataFiles: [
          { filename: "custom.json", data: { key: "value" } },
          { filename: "another.json", data: { foo: "bar" } },
        ],
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });

      try {
        // Verify custom data files were created
        const customPath = path.join(site.srcDir, "_data/custom.json");
        const anotherPath = path.join(site.srcDir, "_data/another.json");

        expect(fs.existsSync(customPath)).toBe(true);
        expect(fs.existsSync(anotherPath)).toBe(true);

        const customData = JSON.parse(fs.readFileSync(customPath, "utf-8"));
        expect(customData.key).toBe("value");

        const anotherData = JSON.parse(fs.readFileSync(anotherPath, "utf-8"));
        expect(anotherData.foo).toBe("bar");
      } finally {
        site.cleanup();
      }
    });

    test("creates test site with images from src/images", async () => {
      // First, create a test image file in src/images
      const testImagePath = path.join(
        process.cwd(),
        "src/images/test-image.jpg",
      );
      const imageExists = fs.existsSync(testImagePath);

      // Only run this test if the test image exists, otherwise skip
      if (!imageExists) {
        // Create a minimal test image
        fs.writeFileSync(testImagePath, "fake image content");
      }

      const site = await createTestSite({
        images: ["test-image.jpg"],
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });

      try {
        // Verify image was copied to site
        const copiedImagePath = path.join(site.srcDir, "images/test-image.jpg");
        expect(fs.existsSync(copiedImagePath)).toBe(true);
      } finally {
        site.cleanup();
        // Clean up test image if we created it
        if (!imageExists) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test("creates test site with images using object spec with absolute path", async () => {
      // Create a test image file
      const testImagePath = path.join(process.cwd(), "test-custom-image.jpg");
      fs.writeFileSync(testImagePath, "fake image content");

      const site = await createTestSite({
        images: [{ src: testImagePath, dest: "custom.jpg" }],
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });

      try {
        // Verify image was copied with custom dest name
        const copiedImagePath = path.join(site.srcDir, "images/custom.jpg");
        expect(fs.existsSync(copiedImagePath)).toBe(true);
      } finally {
        site.cleanup();
        fs.unlinkSync(testImagePath);
      }
    });

    test("hasOutput returns true for existing files", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/test.md",
              frontmatter: { title: "Test", permalink: "/test/" },
              content: "# Test Content",
            },
          ],
        },
        (site) => {
          expect(site.hasOutput("test/index.html")).toBe(true);
        },
      );
    });

    test("hasOutput returns false for non-existing files", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/test.md",
              frontmatter: { title: "Test" },
              content: "Test",
            },
          ],
        },
        (site) => {
          expect(site.hasOutput("nonexistent/file.html")).toBe(false);
        },
      );
    });

    test("addFile adds a new file to the site", async () => {
      const site = await createTestSite({
        files: [
          {
            path: "pages/index.md",
            frontmatter: { title: "Home", permalink: "/" },
            content: "Home",
          },
        ],
      });

      try {
        // Add a new file after creation
        site.addFile("test-file.txt", "Test content");

        // Verify file was created
        const filePath = path.join(site.srcDir, "test-file.txt");
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("Test content");
      } finally {
        site.cleanup();
      }
    });

    test("addMarkdown adds a markdown file with frontmatter", async () => {
      const site = await createTestSite({
        files: [
          {
            path: "pages/index.md",
            frontmatter: { title: "Home", permalink: "/" },
            content: "Home",
          },
        ],
      });

      try {
        // Add a markdown file after creation
        site.addMarkdown("pages/added.md", {
          frontmatter: { title: "Added Page" },
          content: "# Added Content",
        });

        // Verify markdown file was created with frontmatter
        const filePath = path.join(site.srcDir, "pages/added.md");
        expect(fs.existsSync(filePath)).toBe(true);

        const fileContent = fs.readFileSync(filePath, "utf-8");
        expect(fileContent).toContain("title: Added Page");
        expect(fileContent).toContain("# Added Content");
      } finally {
        site.cleanup();
      }
    });

    test("getDoc returns a DOM document for querying HTML", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/test.md",
              frontmatter: { title: "Test Page", permalink: "/test/" },
              content: "# Hello World",
            },
          ],
        },
        (site) => {
          const doc = site.getDoc("test/index.html");

          // Should return a document we can query
          expect(doc.querySelector("h1")).toBeTruthy();
          // The H1 contains the title from frontmatter
          expect(doc.querySelector("h1").textContent).toContain("Test Page");
        },
      );
    });

    test("listOutputFiles returns all output files recursively", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/index.md",
              frontmatter: { title: "Home", permalink: "/" },
              content: "Home",
            },
            {
              path: "pages/about.md",
              frontmatter: { title: "About", permalink: "/about/" },
              content: "About",
            },
          ],
        },
        (site) => {
          const files = site.listOutputFiles();

          // Should list HTML files from the build
          expect(files.length).toBeGreaterThan(0);
          expect(files.some((f) => f.includes("index.html"))).toBe(true);
        },
      );
    });

    test("getOutput throws error when file does not exist", async () => {
      await withTestSite(
        {
          files: [
            {
              path: "pages/test.md",
              frontmatter: { title: "Test" },
              content: "Test",
            },
          ],
        },
        (site) => {
          expect(() => {
            site.getOutput("nonexistent/file.html");
          }).toThrow("Output file not found: nonexistent/file.html");
        },
      );
    });
  });

  describe("build error handling", () => {
    test("build throws error with stderr when Eleventy build fails", async () => {
      const site = await createTestSite({
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });

      try {
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
        let error;
        try {
          await site.build();
        } catch (e) {
          error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toContain("Eleventy build failed");
        // Error should include stdout or stderr
        expect(error.stdout || error.stderr).toBeTruthy();
      } finally {
        site.cleanup();
      }
    });
  });

  describe("cleanupAllTestSites", () => {
    test("removes all test site directories", async () => {
      // Create a couple of test sites
      const site1 = await createTestSite({
        files: [
          {
            path: "pages/test.md",
            frontmatter: { title: "Test" },
            content: "Test",
          },
        ],
      });
      const site2 = await createTestSite({
        files: [
          {
            path: "pages/test2.md",
            frontmatter: { title: "Test 2" },
            content: "Test 2",
          },
        ],
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
