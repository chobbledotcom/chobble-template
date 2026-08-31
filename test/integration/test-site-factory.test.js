import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupAllTestSites,
  createTestSite,
  FIXTURES_ROOT_ENV,
  withSetupTestSite,
} from "#test/test-site-factory.js";
import {
  expectAsyncThrows,
  rootDir,
  withTempDirAsync,
} from "#test/test-utils.js";

/** Minimal page file for tests that just need a valid site */
const MINIMAL_PAGE = {
  path: "pages/index.md",
  frontmatter: {
    name: "Home",
    permalink: "/",
    blocks: [{ type: "markdown", content: "Home" }],
  },
  content: "",
};

/** Common test file configuration */
const defaultTestFiles = [
  {
    path: "pages/test.md",
    frontmatter: {
      name: "Factory Test Page",
      blocks: [{ type: "markdown", content: "Factory test page" }],
    },
    content: "",
  },
];

const withFixtureRoot = async (fixturesRoot, fn) => {
  const previousValue = process.env[FIXTURES_ROOT_ENV];
  process.env[FIXTURES_ROOT_ENV] = fixturesRoot;
  try {
    await fn();
  } finally {
    if (previousValue === undefined) {
      delete process.env[FIXTURES_ROOT_ENV];
    } else {
      process.env[FIXTURES_ROOT_ENV] = previousValue;
    }
  }
};

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

    test(`sources template defaults from ${FIXTURES_ROOT_ENV} when set, not the live checkout`, async () => {
      await withTempDirAsync("fixtures-root-override", async (fixturesRoot) => {
        for (const entry of ["_data", "images"]) {
          fs.cpSync(
            path.join(rootDir, "src", entry),
            path.join(fixturesRoot, "src", entry),
            { recursive: true },
          );
        }

        const configPath = path.join(fixturesRoot, "src/_data/config.json");
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        config.hermetic_fixture_marker = "pristine-template-fixture";
        fs.writeFileSync(configPath, JSON.stringify(config));

        await withFixtureRoot(fixturesRoot, async () => {
          await withSetupTestSite({ files: defaultTestFiles }, (site) => {
            const generatedConfig = JSON.parse(
              fs.readFileSync(
                path.join(site.srcDir, "_data/config.json"),
                "utf-8",
              ),
            );
            expect(generatedConfig.hermetic_fixture_marker).toBe(
              "pristine-template-fixture",
            );
            expect(fs.realpathSync(path.join(site.srcDir, "_lib"))).toBe(
              path.join(rootDir, "src/_lib"),
            );
          });
        });
      });
    });

    test(`sources collection and index data from ${FIXTURES_ROOT_ENV}`, async () => {
      await withTempDirAsync(
        "fixture-collection-data",
        async (fixturesRoot) => {
          for (const collection of ["pages", "products"]) {
            const runtimeDir = path.join(rootDir, "src", collection);
            const fixtureDir = path.join(fixturesRoot, "src", collection);
            fs.cpSync(runtimeDir, fixtureDir, { recursive: true });

            const fixtureDataPath = path.join(fixtureDir, `${collection}.json`);
            const fixtureData = JSON.parse(
              fs.readFileSync(fixtureDataPath, "utf-8"),
            );
            fixtureData.hermetic_fixture_marker = `pristine-${collection}`;
            fs.writeFileSync(fixtureDataPath, JSON.stringify(fixtureData));
          }

          await withFixtureRoot(fixturesRoot, async () => {
            const productFiles = [
              { ...defaultTestFiles[0], path: "products/test.md" },
            ];
            await withSetupTestSite({ files: productFiles }, (site) => {
              for (const collection of ["pages", "products"]) {
                const generatedData = JSON.parse(
                  fs.readFileSync(
                    path.join(site.srcDir, collection, `${collection}.json`),
                    "utf-8",
                  ),
                );
                expect(generatedData.hermetic_fixture_marker).toBe(
                  `pristine-${collection}`,
                );
              }
            });
          });
        },
      );
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

    const withTempTestImage = async (filename, dest, fn) => {
      const testImagePath = path.join(rootDir, filename);
      fs.writeFileSync(testImagePath, "fake image content");
      try {
        await withSetupTestSite(
          { files: defaultTestFiles, images: [{ src: testImagePath, dest }] },
          fn,
        );
      } finally {
        fs.unlinkSync(testImagePath);
      }
    };

    test("creates test site with images from src/images", async () => {
      await withTempTestImage("test-image.jpg", "test-image.jpg", (site) => {
        // Verify image was copied to site
        const copiedImagePath = path.join(site.srcDir, "images/test-image.jpg");
        expect(fs.existsSync(copiedImagePath)).toBe(true);
      });
    });

    test("creates test site with images using object spec with absolute path", async () => {
      await withTempTestImage("test-custom-image.jpg", "custom.jpg", (site) => {
        // Verify image was copied with custom dest name
        const copiedImagePath = path.join(site.srcDir, "images/custom.jpg");
        expect(fs.existsSync(copiedImagePath)).toBe(true);
      });
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
        frontmatter: { name: "Added Page" },
        content: "# Added Content",
      });

      const filePath = path.join(site.srcDir, "pages/added.md");
      expect(fs.existsSync(filePath)).toBe(true);

      const fileContent = fs.readFileSync(filePath, "utf-8");
      expect(fileContent).toContain("name: Added Page");
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
            frontmatter: {
              name: "Test Page",
              permalink: "/test/",
              blocks: [{ type: "markdown", content: "# Hello World" }],
            },
            content: "",
          },
          {
            path: "pages/about.md",
            frontmatter: {
              name: "About",
              permalink: "/about/",
              blocks: [{ type: "markdown", content: "About" }],
            },
            content: "",
          },
        ],
      });
      await site.build();
    }, 30_000);

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
      // The H1 comes from the markdown content
      expect(doc.querySelector("h1").textContent).toContain("Hello World");
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

  // NOTE: cleanupAllTestSites has no in-suite test. It removes the shared
  // .test-sites root, so exercising it mid-run would delete sites belonging
  // to concurrently running tests. It runs in afterAll above, after every
  // test in this file has finished.
});
