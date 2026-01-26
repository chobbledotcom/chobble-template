import { describe, expect, test } from "bun:test";
import {
  configureInlineAsset,
  memoizedInlineAsset as inlineAsset,
} from "#media/inline-asset.js";
import {
  createMockEleventyConfig,
  fs,
  path,
  withSubDirAsync,
} from "#test/test-utils.js";

// ============================================
// Test Fixtures
// ============================================

const ASSETS_PATH = "src/assets";

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

describe("inline-asset", () => {
  test("Finds asset in nested directory path", () =>
    withSubDirAsync(
      "inline-asset-nested",
      `${ASSETS_PATH}/icons/social`,
      ({ tempDir, subDir }) => {
        const svgContent = '<svg><circle r="5"/></svg>';
        fs.writeFileSync(path.join(subDir, "twitter.svg"), svgContent);
        expect(inlineAsset("icons/social/twitter.svg", tempDir)).toBe(
          svgContent,
        );
      },
    ));

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

  test("Returns raw SVG content for SVG files", () =>
    withSubDirAsync(
      "inline-asset-svg-type",
      ASSETS_PATH,
      ({ tempDir, subDir }) => {
        const svgContent =
          '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
        fs.writeFileSync(path.join(subDir, "icon.svg"), svgContent);

        const result = inlineAsset("icon.svg", tempDir);
        expect(result).toBe(svgContent);
        expect(result.startsWith("<svg")).toBe(true);
      },
    ));

  test("Returns base64 data URI for image files", () =>
    withSubDirAsync(
      "inline-asset-image-type",
      ASSETS_PATH,
      ({ tempDir, subDir }) => {
        fs.writeFileSync(
          path.join(subDir, "test.png"),
          Buffer.from(MINIMAL_PNG_HEADER),
        );

        const result = inlineAsset("test.png", tempDir);
        expect(result.startsWith("data:image/png;base64,")).toBe(true);
      },
    ));

  test("Inlines SVG file content", () =>
    withSubDirAsync(
      "inline-asset-svg",
      `${ASSETS_PATH}/icons`,
      ({ tempDir, subDir }) => {
        const svgContent =
          '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
        fs.writeFileSync(path.join(subDir, "test.svg"), svgContent);

        expect(inlineAsset("icons/test.svg", tempDir)).toBe(svgContent);
      },
    ));

  test("Inlines multiline SVG file content", () =>
    withSubDirAsync(
      "inline-asset-svg-multiline",
      ASSETS_PATH,
      ({ tempDir, subDir }) => {
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <g fill="none" stroke="currentColor">
    <path d="M2 5l6.913 3.925"/>
  </g>
</svg>`;
        fs.writeFileSync(path.join(subDir, "multiline.svg"), svgContent);

        expect(inlineAsset("multiline.svg", tempDir)).toBe(svgContent);
      },
    ));

  test("Throws error when file not found", () =>
    withSubDirAsync("inline-asset-not-found", ASSETS_PATH, ({ tempDir }) => {
      expect(() => inlineAsset("nonexistent.svg", tempDir)).toThrow(
        /Asset file not found/,
      );
    }));

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

  test("Configured filter works correctly", () =>
    withSubDirAsync(
      "inline-asset-filter",
      ASSETS_PATH,
      ({ tempDir, subDir }) => {
        const svgContent = '<svg><rect width="100" height="100"/></svg>';
        fs.writeFileSync(path.join(subDir, "rect.svg"), svgContent);

        const mockConfig = createMockEleventyConfig();
        configureInlineAsset(mockConfig);

        expect(mockConfig.filters.inline_asset("rect.svg", tempDir)).toBe(
          svgContent,
        );
      },
    ));

  test("Inlines actual SVG from project assets", () => {
    const result = inlineAsset("icons/email.svg");
    expect(result.includes("<svg")).toBe(true);
    expect(result.includes("</svg>")).toBe(true);
    expect(result.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  test("Inlines PNG file as base64 data URI with correct round-trip", () =>
    withSubDirAsync("inline-asset-png", ASSETS_PATH, ({ tempDir, subDir }) => {
      const pngBuffer = Buffer.from(MINIMAL_PNG_COMPLETE);
      fs.writeFileSync(path.join(subDir, "test.png"), pngBuffer);

      const result = inlineAsset("test.png", tempDir);
      expect(result.startsWith("data:image/png;base64,")).toBe(true);
      const decoded = Buffer.from(
        result.replace("data:image/png;base64,", ""),
        "base64",
      );
      expect(decoded.equals(pngBuffer)).toBe(true);
    }));

  test("Inlines JPG file with correct MIME type (jpeg)", () =>
    withSubDirAsync("inline-asset-jpg", ASSETS_PATH, ({ tempDir, subDir }) => {
      fs.writeFileSync(
        path.join(subDir, "test.jpg"),
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
      );

      expect(
        inlineAsset("test.jpg", tempDir).startsWith("data:image/jpeg;base64,"),
      ).toBe(true);
    }));

  test("Inlines WebP file as base64 data URI", () =>
    withSubDirAsync("inline-asset-webp", ASSETS_PATH, ({ tempDir, subDir }) => {
      fs.writeFileSync(
        path.join(subDir, "test.webp"),
        Buffer.from([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      );

      expect(
        inlineAsset("test.webp", tempDir).startsWith("data:image/webp;base64,"),
      ).toBe(true);
    }));

  test("Inlines GIF file as base64 data URI", () =>
    withSubDirAsync("inline-asset-gif", ASSETS_PATH, ({ tempDir, subDir }) => {
      fs.writeFileSync(
        path.join(subDir, "test.gif"),
        Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
      );

      expect(
        inlineAsset("test.gif", tempDir).startsWith("data:image/gif;base64,"),
      ).toBe(true);
    }));
});
