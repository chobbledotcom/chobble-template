import { describe, expect, test } from "bun:test";
import { getViewports } from "#media/screenshot.js";

describe("screenshot", () => {
  describe("getViewports", () => {
    test("Returns viewport definitions for standard sizes", () => {
      const viewports = getViewports();
      expect(viewports.mobile).toBeDefined();
      expect(viewports.tablet).toBeDefined();
      expect(viewports.desktop).toBeDefined();
      expect(viewports["full-page"]).toBeDefined();
    });

    test("Viewport definitions include width and height", () => {
      const viewports = getViewports();
      expect(typeof viewports.desktop.width).toBe("number");
      expect(typeof viewports.desktop.height).toBe("number");
    });

    test("Returns independent copy that does not affect internal state", () => {
      const viewports1 = getViewports();
      viewports1.custom = { width: 100, height: 100 };
      const viewports2 = getViewports();
      expect(viewports2.custom).toBeUndefined();
    });
  });
});
