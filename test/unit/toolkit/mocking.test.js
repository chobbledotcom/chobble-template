/**
 * Tests for js-toolkit mocking utilities
 */
import { describe, expect, test } from "bun:test";
import { mockFetch } from "#toolkit/test-utils/mocking.js";

describe("mockFetch", () => {
  test("mocks fetch with object response and restores correctly", async () => {
    const originalFetch = globalThis.fetch;
    const testResponse = { data: "test" };

    const restore = mockFetch(testResponse);

    // Fetch should be mocked
    const response = await globalThis.fetch("http://example.com");
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(testResponse);

    // Restore original fetch
    restore();
    expect(globalThis.fetch).toBe(originalFetch);
  });

  test("mocks fetch with string response", async () => {
    const restore = mockFetch("plain text response");

    const response = await globalThis.fetch("http://example.com");
    expect(await response.text()).toBe("plain text response");

    restore();
  });

  test("mocks fetch with custom status and ok flag", async () => {
    const restore = mockFetch("Not Found", { ok: false, status: 404 });

    const response = await globalThis.fetch("http://example.com");
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");

    restore();
  });

  test("json() parses string response as JSON", async () => {
    const restore = mockFetch('{"key": "value"}');

    const response = await globalThis.fetch("http://example.com");
    expect(await response.json()).toEqual({ key: "value" });

    restore();
  });
});
