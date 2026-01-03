import { DATA_DIR, IMAGES_DIR, PAGES_DIR, SRC_DIR } from "#lib/paths.js";
import {
  createTestRunner,
  expectTrue,
  fs,
  path,
  rootDir,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "exports-are-strings",
    description: "All path exports are non-empty strings",
    test: () => {
      expectTrue(
        typeof SRC_DIR === "string" && SRC_DIR.length > 0,
        "SRC_DIR should be a non-empty string",
      );
      expectTrue(
        typeof IMAGES_DIR === "string" && IMAGES_DIR.length > 0,
        "IMAGES_DIR should be a non-empty string",
      );
      expectTrue(
        typeof PAGES_DIR === "string" && PAGES_DIR.length > 0,
        "PAGES_DIR should be a non-empty string",
      );
      expectTrue(
        typeof DATA_DIR === "string" && DATA_DIR.length > 0,
        "DATA_DIR should be a non-empty string",
      );
    },
  },
  {
    name: "directories-exist",
    description: "All exported directories exist on the filesystem",
    test: () => {
      expectTrue(fs.existsSync(SRC_DIR), `SRC_DIR should exist: ${SRC_DIR}`);
      expectTrue(
        fs.existsSync(IMAGES_DIR),
        `IMAGES_DIR should exist: ${IMAGES_DIR}`,
      );
      expectTrue(
        fs.existsSync(PAGES_DIR),
        `PAGES_DIR should exist: ${PAGES_DIR}`,
      );
      expectTrue(fs.existsSync(DATA_DIR), `DATA_DIR should exist: ${DATA_DIR}`);
    },
  },
  {
    name: "directories-are-directories",
    description: "All exported paths are actually directories",
    test: () => {
      expectTrue(
        fs.statSync(SRC_DIR).isDirectory(),
        "SRC_DIR should be a directory",
      );
      expectTrue(
        fs.statSync(IMAGES_DIR).isDirectory(),
        "IMAGES_DIR should be a directory",
      );
      expectTrue(
        fs.statSync(PAGES_DIR).isDirectory(),
        "PAGES_DIR should be a directory",
      );
      expectTrue(
        fs.statSync(DATA_DIR).isDirectory(),
        "DATA_DIR should be a directory",
      );
    },
  },
  {
    name: "path-structure-correct",
    description: "Paths have correct structure relative to project root",
    test: () => {
      const expectedSrc = path.join(rootDir, "src");
      const expectedImages = path.join(rootDir, "src/images");
      const expectedPages = path.join(rootDir, "src/pages");
      const expectedData = path.join(rootDir, "src/_data");

      expectTrue(
        SRC_DIR === expectedSrc,
        `SRC_DIR should be ${expectedSrc}, got ${SRC_DIR}`,
      );
      expectTrue(
        IMAGES_DIR === expectedImages,
        `IMAGES_DIR should be ${expectedImages}, got ${IMAGES_DIR}`,
      );
      expectTrue(
        PAGES_DIR === expectedPages,
        `PAGES_DIR should be ${expectedPages}, got ${PAGES_DIR}`,
      );
      expectTrue(
        DATA_DIR === expectedData,
        `DATA_DIR should be ${expectedData}, got ${DATA_DIR}`,
      );
    },
  },
  {
    name: "subdirectories-are-under-src",
    description: "IMAGES_DIR, PAGES_DIR, and DATA_DIR are under SRC_DIR",
    test: () => {
      expectTrue(
        IMAGES_DIR.startsWith(SRC_DIR),
        "IMAGES_DIR should be under SRC_DIR",
      );
      expectTrue(
        PAGES_DIR.startsWith(SRC_DIR),
        "PAGES_DIR should be under SRC_DIR",
      );
      expectTrue(
        DATA_DIR.startsWith(SRC_DIR),
        "DATA_DIR should be under SRC_DIR",
      );
    },
  },
];

createTestRunner("paths", testCases);
