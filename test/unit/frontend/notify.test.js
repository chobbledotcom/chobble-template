import { afterEach, describe, expect, test } from "bun:test";
import { showNotification } from "#public/utils/notify.js";

const getContainer = () => document.getElementById("toast-notifications");
const getToasts = () => document.querySelectorAll(".toast-notification");

const cleanup = () => {
  const container = getContainer();
  if (container) container.remove();
};

describe("notify", () => {
  afterEach(cleanup);

  test("creates container on first call", () => {
    expect(getContainer()).toBeNull();
    showNotification("hello");
    const container = getContainer();
    expect(container).toBeTruthy();
    expect(container.getAttribute("aria-live")).toBe("polite");
  });

  test("reuses existing container on subsequent calls", () => {
    showNotification("first");
    showNotification("second");
    expect(document.querySelectorAll("#toast-notifications")).toHaveLength(1);
    expect(getToasts()).toHaveLength(2);
  });

  test("creates toast with correct class and message", () => {
    showNotification("item removed");
    const toast = getToasts()[0];
    expect(toast.className).toBe("toast-notification");
    expect(toast.textContent).toBe("item removed");
  });

  test("adds toast-visible class on next animation frame", () => {
    showNotification("visible test");
    const toast = getToasts()[0];
    // Before rAF fires, no visible class
    expect(toast.classList.contains("toast-visible")).toBe(false);
  });
});
