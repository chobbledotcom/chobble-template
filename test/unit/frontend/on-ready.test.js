import { describe, expect, test, vi } from "vitest";
import { onReady } from "#public/utils/on-ready.js";

describe("onReady", () => {
  test("runs the callback immediately when the DOM is already ready", () => {
    const callback = vi.fn();

    onReady(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("waits for DOMContentLoaded while the document is loading", () => {
    const callback = vi.fn();
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(document),
      "readyState",
    );
    Object.defineProperty(document, "readyState", {
      value: "loading",
      configurable: true,
    });

    try {
      onReady(callback);
      expect(callback).not.toHaveBeenCalled();

      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(callback).toHaveBeenCalledTimes(1);
    } finally {
      delete document.readyState;
      if (descriptor) {
        Object.defineProperty(
          Object.getPrototypeOf(document),
          "readyState",
          descriptor,
        );
      }
    }
  });
});
