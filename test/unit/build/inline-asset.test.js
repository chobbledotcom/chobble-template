import { describe, expect, test } from "bun:test";
import { configureInlineAsset, inlineAsset } from "#media/inline-asset.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  fs,
  path,
} from "#test/test-utils.js";

// ============================================
// Test Fixtures
// ============================================

/** Minimal 1x1 PNG header bytes for testing */
const MINIMAL_PNG_HEADER = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
];

/** Complete minimal 1x1 PNG with IDAT and IEND chunks */
const MINIMAL_PNG_COMPLETE = [
  ...MINIMAL_PNG_HEADER,
  0x00,
  0x00,
  0x00,
  0x0c,
  0x49,
  0x44,
  0x41,
  0x54,
  0x08,
  0xd7,
  0x63,
  0xf8,
  0xff,
  0xff,
  0x3f,
  0x00,
  0x05,
  0xfe,
  0x02,
  0xfe,
  0xdc,
  0xcc,
  0x59,
  0xe7,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4e,
  0x44,
  0xae,
  0x42,
  0x60,
  0x82,
];

/** Create temp assets directory and return cleanup function */
const withAssetDir = (name, subPath = "") => {
  const tempDir = createTempDir(name);
  const assetsDir = path.join(tempDir, "src", "assets", subPath);
  fs.mkdirSync(assetsDir, { recursive: true });
  return { tempDir, assetsDir, cleanup: () => cleanupTempDir(tempDir) };
};

describe("inline-asset", () => {
  test("Finds asset in nested directory path", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir(
      "inline-asset-nested",
      "icons/social",
    );
    const svgContent = '<svg><circle r="5"/></svg>';
    fs.writeFileSync(path.join(assetsDir, "twitter.svg"), svgContent);

    expect(inlineAsset("icons/social/twitter.svg", tempDir)).toBe(svgContent);
    cleanup();
  });

  test("Rejects files with disallowed extensions", () => {
    const disallowed = [
      "test.txt",
      "test.js",
      "test.html",
      "test.css",
      "test.pdf",
    ];
    for (const file of disallowed) {
      expect(() => inlineAsset(file, "/tmp")).toThrow(
        /Unsupported file extension/,
      );
    }
  });

  test("Returns raw SVG content for SVG files", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir(
      "inline-asset-svg-type",
    );
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    fs.writeFileSync(path.join(assetsDir, "icon.svg"), svgContent);

    const result = inlineAsset("icon.svg", tempDir);
    expect(result).toBe(svgContent);
    expect(result.startsWith("<svg")).toBe(true);
    cleanup();
  });

  test("Returns base64 data URI for image files", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir(
      "inline-asset-image-type",
    );
    fs.writeFileSync(
      path.join(assetsDir, "test.png"),
      Buffer.from(MINIMAL_PNG_HEADER),
    );

    const result = inlineAsset("test.png", tempDir);
    expect(result.startsWith("data:image/png;base64,")).toBe(true);
    cleanup();
  });

  test("Inlines SVG file content", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir(
      "inline-asset-svg",
      "icons",
    );
    const svgContent =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    fs.writeFileSync(path.join(assetsDir, "test.svg"), svgContent);

    expect(inlineAsset("icons/test.svg", tempDir)).toBe(svgContent);
    cleanup();
  });

  test("Inlines multiline SVG file content", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir(
      "inline-asset-svg-multiline",
    );
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <g fill="none" stroke="currentColor">
    <path d="M2 5l6.913 3.925"/>
  </g>
</svg>`;
    fs.writeFileSync(path.join(assetsDir, "multiline.svg"), svgContent);

    expect(inlineAsset("multiline.svg", tempDir)).toBe(svgContent);
    cleanup();
  });

  test("Throws error when file not found", () => {
    const { tempDir, cleanup } = withAssetDir("inline-asset-not-found");
    expect(() => inlineAsset("nonexistent.svg", tempDir)).toThrow(
      /Asset file not found/,
    );
    cleanup();
  });

  test("Throws error for unsupported file extensions", () => {
    expect(() => inlineAsset("script.js", "/tmp")).toThrow(
      /Unsupported file extension/,
    );
    expect(() => inlineAsset("style.css", "/tmp")).toThrow(
      /Unsupported file extension/,
    );
    expect(() => inlineAsset("doc.txt", "/tmp")).toThrow(
      /Unsupported file extension/,
    );
  });

  test("Configures inline_asset filter", () => {
    const mockConfig = createMockEleventyConfig();
    configureInlineAsset(mockConfig);
    expect(typeof mockConfig.filters.inline_asset).toBe("function");
  });

  test("Configured filter works correctly", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir("inline-asset-filter");
    const svgContent = '<svg><rect width="100" height="100"/></svg>';
    fs.writeFileSync(path.join(assetsDir, "rect.svg"), svgContent);

    const mockConfig = createMockEleventyConfig();
    configureInlineAsset(mockConfig);

    expect(mockConfig.filters.inline_asset("rect.svg", tempDir)).toBe(
      svgContent,
    );
    cleanup();
  });

  test("Inlines actual SVG from project assets", () => {
    // Test against actual project file
    const result = inlineAsset("icons/email.svg");
    expect(result.includes("<svg")).toBe(true);
    expect(result.includes("</svg>")).toBe(true);
    expect(result.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  test("Inlines PNG file as base64 data URI with correct round-trip", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir("inline-asset-png");
    const pngBuffer = Buffer.from(MINIMAL_PNG_COMPLETE);
    fs.writeFileSync(path.join(assetsDir, "test.png"), pngBuffer);

    const result = inlineAsset("test.png", tempDir);
    expect(result.startsWith("data:image/png;base64,")).toBe(true);
    const decoded = Buffer.from(
      result.replace("data:image/png;base64,", ""),
      "base64",
    );
    expect(decoded.equals(pngBuffer)).toBe(true);
    cleanup();
  });

  test("Inlines JPG file with correct MIME type (jpeg)", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir("inline-asset-jpg");
    fs.writeFileSync(
      path.join(assetsDir, "test.jpg"),
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
    );

    expect(
      inlineAsset("test.jpg", tempDir).startsWith("data:image/jpeg;base64,"),
    ).toBe(true);
    cleanup();
  });

  test("Inlines WebP file as base64 data URI", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir("inline-asset-webp");
    fs.writeFileSync(
      path.join(assetsDir, "test.webp"),
      Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]),
    );

    expect(
      inlineAsset("test.webp", tempDir).startsWith("data:image/webp;base64,"),
    ).toBe(true);
    cleanup();
  });

  test("Inlines GIF file as base64 data URI", () => {
    const { tempDir, assetsDir, cleanup } = withAssetDir("inline-asset-gif");
    fs.writeFileSync(
      path.join(assetsDir, "test.gif"),
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    );

    expect(
      inlineAsset("test.gif", tempDir).startsWith("data:image/gif;base64,"),
    ).toBe(true);
    cleanup();
  });
});
