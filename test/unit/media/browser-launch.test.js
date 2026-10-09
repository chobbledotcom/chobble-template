import { afterEach, describe, expect, test, vi } from "vitest";
import {
  BROWSER_ARGS,
  ensureBrowserInstalled,
  launchChromeHeadless,
} from "#media/browser-utils.js";

const launchMock = vi.fn(() => Promise.resolve({ port: 9222 }));
// Points at a path that really exists (this node binary) or really
// doesn't, so ensureBrowserInstalled runs against genuine fs state.
const executablePathMock = vi.fn();

vi.mock("chrome-launcher", () => ({ launch: launchMock }));
vi.mock("playwright", () => ({
  chromium: { executablePath: (...args) => executablePathMock(...args) },
}));

describe("launchChromeHeadless", () => {
  test("launches chrome headless with the sandboxed flags", async () => {
    const chrome = await launchChromeHeadless("/fake/chromium");

    expect(chrome).toEqual({ port: 9222 });
    expect(launchMock).toHaveBeenCalledWith({
      chromePath: "/fake/chromium",
      chromeFlags: ["--headless", ...BROWSER_ARGS],
    });
  });
});

describe("ensureBrowserInstalled", () => {
  afterEach(() => {
    delete process.env.CHROME_PATH;
  });

  test("returns the executable path when it exists", async () => {
    executablePathMock.mockReturnValue(process.execPath);

    await expect(ensureBrowserInstalled()).resolves.toBe(process.execPath);
  });

  test("prefers a CHROME_PATH override over Playwright's browser", async () => {
    process.env.CHROME_PATH = process.execPath;
    executablePathMock.mockReturnValue("/definitely/missing/chromium");

    await expect(ensureBrowserInstalled()).resolves.toBe(process.execPath);
  });

  test("throws install guidance when the browser is missing", async () => {
    executablePathMock.mockReturnValue("/definitely/missing/chromium");
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(ensureBrowserInstalled()).rejects.toThrow(
      "npx playwright install chromium",
    );
    errorSpy.mockRestore();
  });
});
