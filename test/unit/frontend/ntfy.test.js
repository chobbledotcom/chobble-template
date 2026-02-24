import { describe, expect, mock, test } from "bun:test";

mock.module("#public/utils/config.js", () => ({
  default: { ntfy_channel: "test-channel" },
}));

const { sendNtfyNotification } = await import("#public/utils/ntfy.js");

const withCapturingFetch = async (fn) => {
  const origFetch = globalThis.fetch;
  const fetchMock = mock(() => Promise.resolve({ ok: true }));
  globalThis.fetch = fetchMock;
  try {
    return await fn(fetchMock);
  } finally {
    globalThis.fetch = origFetch;
  }
};

describe("ntfy", () => {
  test("sends POST to ntfy.sh with channel and message", async () => {
    await withCapturingFetch((fetchMock) => {
      sendNtfyNotification("Checkout failed");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/test-channel");
      expect(options.method).toBe("POST");
      expect(options.body).toContain("Checkout failed");
    });
  });

  test("includes hostname in message body", async () => {
    await withCapturingFetch((fetchMock) => {
      sendNtfyNotification("API error");

      const [, options] = fetchMock.mock.calls[0];
      expect(options.body).toBe(`[${window.location.hostname}] API error`);
    });
  });

  test("does not throw when fetch rejects", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.reject(new Error("Network down")));
    try {
      // Should not throw
      sendNtfyNotification("test message");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
