import { describe, test, expect } from "bun:test";
import {
  configureInlineAsset,
  getAssetPath,
  inlineAsset,
  isAllowedExtension,
  isImageFile,
  isSvgFile,
} from "#media/inline-asset.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  fs,
  path,
} from "#test/test-utils.js";

describe("inline-asset", () => {
  test("Constructs correct path to asset file", () => {
    const result = getAssetPath("icons/email.svg", "/project");
    expect(result).toBe("/project/src/assets/icons/email.svg");
  });

  test("Handles nested asset paths", () => {
    const result = getAssetPath("images/photos/test.png", "/base");
    expect(result).toBe("/base/src/assets/images/photos/test.png");
  });

  test("Allows SVG extension", () => {
    expect(isAllowedExtension("test.svg")).toBe(true);
    expect(isAllowedExtension("test.SVG")).toBe(true);
  });

  test("Allows image extensions", () => {
    expect(isAllowedExtension("test.webp")).toBe(true);
    expect(isAllowedExtension("test.jpeg")).toBe(true);
    expect(isAllowedExtension("test.jpg")).toBe(true);
    expect(isAllowedExtension("test.png")).toBe(true);
    expect(isAllowedExtension("test.gif")).toBe(true);
  });

  test("Rejects disallowed extensions", () => {
    expect(isAllowedExtension("test.txt")).toBe(false);
    expect(isAllowedExtension("test.js")).toBe(false);
    expect(isAllowedExtension("test.html")).toBe(false);
    expect(isAllowedExtension("test.css")).toBe(false);
    expect(isAllowedExtension("test.pdf")).toBe(false);
  });

  test("Identifies SVG files correctly", () => {
    expect(isSvgFile("icon.svg")).toBe(true);
    expect(isSvgFile("path/to/icon.SVG")).toBe(true);
  });

  test("Returns false for non-SVG files", () => {
    expect(isSvgFile("image.png")).toBe(false);
    expect(isSvgFile("image.webp")).toBe(false);
  });

  test("Identifies image files correctly", () => {
    expect(isImageFile("photo.webp")).toBe(true);
    expect(isImageFile("photo.jpeg")).toBe(true);
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("photo.png")).toBe(true);
    expect(isImageFile("photo.gif")).toBe(true);
  });

  test("Returns false for non-image files", () => {
    expect(isImageFile("icon.svg")).toBe(false);
    expect(isImageFile("doc.txt")).toBe(false);
  });

  test("Inlines SVG file content", () => {
    const tempDir = createTempDir("inline-asset-svg");
    const assetsDir = path.join(tempDir, "src", "assets", "icons");
    fs.mkdirSync(assetsDir, { recursive: true });

    const svgContent =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    fs.writeFileSync(path.join(assetsDir, "test.svg"), svgContent);

    const result = inlineAsset("icons/test.svg", tempDir);
    expect(result).toBe(svgContent);
    cleanupTempDir(tempDir);
  });

  test("Inlines multiline SVG file content", () => {
    const tempDir = createTempDir("inline-asset-svg-multiline");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <g fill="none" stroke="currentColor">
    <path d="M2 5l6.913 3.925"/>
  </g>
</svg>`;
    fs.writeFileSync(path.join(assetsDir, "multiline.svg"), svgContent);

    const result = inlineAsset("multiline.svg", tempDir);
    expect(result).toBe(svgContent);
    cleanupTempDir(tempDir);
  });

  test("Throws error when file not found", () => {
    const tempDir = createTempDir("inline-asset-not-found");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    expect(() => inlineAsset("nonexistent.svg", tempDir)).toThrow(
      /Asset file not found/,
    );
    cleanupTempDir(tempDir);
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
    const tempDir = createTempDir("inline-asset-filter");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    const svgContent = '<svg><rect width="100" height="100"/></svg>';
    fs.writeFileSync(path.join(assetsDir, "rect.svg"), svgContent);

    const mockConfig = createMockEleventyConfig();
    configureInlineAsset(mockConfig);

    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    const result = mockConfig.filters.inline_asset("rect.svg");
    expect(result).toBe(svgContent);
    process.cwd = originalCwd;
    cleanupTempDir(tempDir);
  });

  test("Inlines actual SVG from project assets", () => {
    // Test against actual project file
    const result = inlineAsset("icons/email.svg");
    expect(result.includes("<svg")).toBe(true);
    expect(result.includes("</svg>")).toBe(true);
    expect(result.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  test("Inlines PNG file as base64 data URI", () => {
    const tempDir = createTempDir("inline-asset-png");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    // Create a minimal valid 1x1 PNG (smallest valid PNG possible)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
      0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(path.join(assetsDir, "test.png"), pngBuffer);

    const result = inlineAsset("test.png", tempDir);
    expect(result.startsWith("data:image/png;base64,")).toBe(true);
    const base64Part = result.replace("data:image/png;base64,", "");
    const decoded = Buffer.from(base64Part, "base64");
    expect(decoded.equals(pngBuffer)).toBe(true);
    cleanupTempDir(tempDir);
  });

  test("Inlines JPG file with correct MIME type (jpeg)", () => {
    const tempDir = createTempDir("inline-asset-jpg");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    // Create a minimal JPEG header (not valid but enough for testing)
    const jpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    ]);
    fs.writeFileSync(path.join(assetsDir, "test.jpg"), jpgBuffer);

    const result = inlineAsset("test.jpg", tempDir);
    expect(result.startsWith("data:image/jpeg;base64,")).toBe(true);
    cleanupTempDir(tempDir);
  });

  test("Inlines WebP file as base64 data URI", () => {
    const tempDir = createTempDir("inline-asset-webp");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    // Create minimal WebP header
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    fs.writeFileSync(path.join(assetsDir, "test.webp"), webpBuffer);

    const result = inlineAsset("test.webp", tempDir);
    expect(result.startsWith("data:image/webp;base64,")).toBe(true);
    cleanupTempDir(tempDir);
  });

  test("Inlines GIF file as base64 data URI", () => {
    const tempDir = createTempDir("inline-asset-gif");
    const assetsDir = path.join(tempDir, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    // GIF89a header
    const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    fs.writeFileSync(path.join(assetsDir, "test.gif"), gifBuffer);

    const result = inlineAsset("test.gif", tempDir);
    expect(result.startsWith("data:image/gif;base64,")).toBe(true);
    cleanupTempDir(tempDir);
  });
});
