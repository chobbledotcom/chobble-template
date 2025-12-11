import {
  configureInlineAsset,
  getAssetPath,
  inlineAsset,
  isAllowedExtension,
  isImageFile,
  isSvgFile,
} from "../src/_lib/inline-asset.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  createTestRunner,
  expectFalse,
  expectFunctionType,
  expectStrictEqual,
  expectThrows,
  expectTrue,
  fs,
  path,
} from "./test-utils.js";

const testCases = [
  {
    name: "getAssetPath-basic",
    description: "Constructs correct path to asset file",
    test: () => {
      const result = getAssetPath("icons/email.svg", "/project");
      expectStrictEqual(
        result,
        "/project/src/assets/icons/email.svg",
        "Should construct correct asset path",
      );
    },
  },
  {
    name: "getAssetPath-nested",
    description: "Handles nested asset paths",
    test: () => {
      const result = getAssetPath("images/photos/test.png", "/base");
      expectStrictEqual(
        result,
        "/base/src/assets/images/photos/test.png",
        "Should handle nested paths",
      );
    },
  },
  {
    name: "isAllowedExtension-svg",
    description: "Allows SVG extension",
    test: () => {
      expectTrue(isAllowedExtension("test.svg"), "Should allow .svg");
      expectTrue(
        isAllowedExtension("test.SVG"),
        "Should allow .SVG (uppercase)",
      );
    },
  },
  {
    name: "isAllowedExtension-images",
    description: "Allows image extensions",
    test: () => {
      expectTrue(isAllowedExtension("test.webp"), "Should allow .webp");
      expectTrue(isAllowedExtension("test.jpeg"), "Should allow .jpeg");
      expectTrue(isAllowedExtension("test.jpg"), "Should allow .jpg");
      expectTrue(isAllowedExtension("test.png"), "Should allow .png");
      expectTrue(isAllowedExtension("test.gif"), "Should allow .gif");
    },
  },
  {
    name: "isAllowedExtension-disallowed",
    description: "Rejects disallowed extensions",
    test: () => {
      expectFalse(isAllowedExtension("test.txt"), "Should reject .txt");
      expectFalse(isAllowedExtension("test.js"), "Should reject .js");
      expectFalse(isAllowedExtension("test.html"), "Should reject .html");
      expectFalse(isAllowedExtension("test.css"), "Should reject .css");
      expectFalse(isAllowedExtension("test.pdf"), "Should reject .pdf");
    },
  },
  {
    name: "isSvgFile-true",
    description: "Identifies SVG files correctly",
    test: () => {
      expectTrue(isSvgFile("icon.svg"), "Should identify .svg");
      expectTrue(isSvgFile("path/to/icon.SVG"), "Should identify .SVG");
    },
  },
  {
    name: "isSvgFile-false",
    description: "Returns false for non-SVG files",
    test: () => {
      expectFalse(isSvgFile("image.png"), "Should reject .png");
      expectFalse(isSvgFile("image.webp"), "Should reject .webp");
    },
  },
  {
    name: "isImageFile-true",
    description: "Identifies image files correctly",
    test: () => {
      expectTrue(isImageFile("photo.webp"), "Should identify .webp");
      expectTrue(isImageFile("photo.jpeg"), "Should identify .jpeg");
      expectTrue(isImageFile("photo.jpg"), "Should identify .jpg");
      expectTrue(isImageFile("photo.png"), "Should identify .png");
      expectTrue(isImageFile("photo.gif"), "Should identify .gif");
    },
  },
  {
    name: "isImageFile-false",
    description: "Returns false for non-image files",
    test: () => {
      expectFalse(isImageFile("icon.svg"), "Should reject .svg");
      expectFalse(isImageFile("doc.txt"), "Should reject .txt");
    },
  },
  {
    name: "inlineAsset-svg",
    description: "Inlines SVG file content",
    test: () => {
      const tempDir = createTempDir("inline-asset-svg");
      const assetsDir = path.join(tempDir, "src", "assets", "icons");
      fs.mkdirSync(assetsDir, { recursive: true });

      const svgContent =
        '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
      fs.writeFileSync(path.join(assetsDir, "test.svg"), svgContent);

      try {
        const result = inlineAsset("icons/test.svg", tempDir);
        expectStrictEqual(result, svgContent, "Should return SVG content");
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "inlineAsset-svg-multiline",
    description: "Inlines multiline SVG file content",
    test: () => {
      const tempDir = createTempDir("inline-asset-svg-multiline");
      const assetsDir = path.join(tempDir, "src", "assets");
      fs.mkdirSync(assetsDir, { recursive: true });

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <g fill="none" stroke="currentColor">
    <path d="M2 5l6.913 3.925"/>
  </g>
</svg>`;
      fs.writeFileSync(path.join(assetsDir, "multiline.svg"), svgContent);

      try {
        const result = inlineAsset("multiline.svg", tempDir);
        expectStrictEqual(
          result,
          svgContent,
          "Should return multiline SVG content",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "inlineAsset-file-not-found",
    description: "Throws error when file not found",
    test: () => {
      const tempDir = createTempDir("inline-asset-not-found");
      const assetsDir = path.join(tempDir, "src", "assets");
      fs.mkdirSync(assetsDir, { recursive: true });

      try {
        expectThrows(
          () => inlineAsset("nonexistent.svg", tempDir),
          /Asset file not found/,
          "Should throw for missing file",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "inlineAsset-unsupported-extension",
    description: "Throws error for unsupported file extensions",
    test: () => {
      expectThrows(
        () => inlineAsset("script.js", "/tmp"),
        /Unsupported file extension/,
        "Should throw for .js files",
      );
      expectThrows(
        () => inlineAsset("style.css", "/tmp"),
        /Unsupported file extension/,
        "Should throw for .css files",
      );
      expectThrows(
        () => inlineAsset("doc.txt", "/tmp"),
        /Unsupported file extension/,
        "Should throw for .txt files",
      );
    },
  },
  {
    name: "configureInlineAsset-basic",
    description: "Configures inline_asset filter",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureInlineAsset(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "inline_asset",
        "Should add inline_asset filter",
      );
    },
  },
  {
    name: "configureInlineAsset-filter-works",
    description: "Configured filter works correctly",
    test: () => {
      const tempDir = createTempDir("inline-asset-filter");
      const assetsDir = path.join(tempDir, "src", "assets");
      fs.mkdirSync(assetsDir, { recursive: true });

      const svgContent = '<svg><rect width="100" height="100"/></svg>';
      fs.writeFileSync(path.join(assetsDir, "rect.svg"), svgContent);

      const mockConfig = createMockEleventyConfig();
      configureInlineAsset(mockConfig);

      const originalCwd = process.cwd;
      process.cwd = () => tempDir;

      try {
        const result = mockConfig.filters.inline_asset("rect.svg");
        expectStrictEqual(
          result,
          svgContent,
          "Filter should return SVG content",
        );
      } finally {
        process.cwd = originalCwd;
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "inlineAsset-real-svg",
    description: "Inlines actual SVG from project assets",
    test: () => {
      // Test against actual project file
      const result = inlineAsset("icons/email.svg");
      expectTrue(result.includes("<svg"), "Should contain <svg tag");
      expectTrue(result.includes("</svg>"), "Should contain closing </svg>");
      expectTrue(
        result.includes('xmlns="http://www.w3.org/2000/svg"'),
        "Should contain xmlns attribute",
      );
    },
  },
];

export default createTestRunner("inline-asset", testCases);
