import { describe, expect, mock, test } from "bun:test";
import { withMockFetch } from "#test/test-utils.js";

mock.restore();
const { fetchJson, postJson, submitForm } = await import(
  "#public/utils/http.js"
);

const withRejectedFetch = async (fn) => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));
  try {
    return await fn();
  } finally {
    globalThis.fetch = origFetch;
  }
};

describe("fetchJson", () => {
  test("returns parsed JSON on success", async () => {
    await withMockFetch({ id: 1 }, {}, async () => {
      const result = await fetchJson("https://api.example.com/data");
      expect(result).toEqual({ id: 1 });
    });
  });

  test("returns null on non-OK response", async () => {
    await withMockFetch({}, { ok: false, status: 404 }, async () => {
      const result = await fetchJson("https://api.example.com/missing");
      expect(result).toBeNull();
    });
  });

  test("returns null on network error", async () => {
    await withRejectedFetch(async () => {
      const result = await fetchJson("https://api.example.com/down");
      expect(result).toBeNull();
    });
  });
});

describe("postJson", () => {
  test("posts JSON and returns parsed response", async () => {
    const origFetch = globalThis.fetch;
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: "https://checkout.stripe.com/x" }),
      }),
    );
    globalThis.fetch = fetchMock;
    try {
      const result = await postJson("https://api.example.com/checkout", {
        items: [{ sku: "ABC", quantity: 1 }],
      });

      expect(result).toEqual({ url: "https://checkout.stripe.com/x" });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.example.com/checkout");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body)).toEqual({
        items: [{ sku: "ABC", quantity: 1 }],
      });
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("returns null on non-OK response", async () => {
    await withMockFetch({}, { ok: false, status: 500 }, async () => {
      const result = await postJson("https://api.example.com/checkout", {});
      expect(result).toBeNull();
    });
  });

  test("returns null on network error", async () => {
    await withRejectedFetch(async () => {
      const result = await postJson("https://api.example.com/checkout", {});
      expect(result).toBeNull();
    });
  });
});

describe("submitForm", () => {
  const mockForm = document.createElement("form");
  mockForm.action = "https://forms.example.com/submit";
  mockForm.method = "POST";

  test("treats opaqueredirect as success with provided redirect URL", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve({
        type: "opaqueredirect",
        ok: false,
        status: 0,
        url: "https://forms.example.com/submit",
      }),
    );
    try {
      const result = await submitForm(
        mockForm,
        "https://example.com/thank-you/",
      );
      expect(result.ok).toBe(true);
      expect(result.url).toBe("https://example.com/thank-you/");
      expect(result.error).toBeNull();
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("passes redirect: manual to fetch", async () => {
    const origFetch = globalThis.fetch;
    const fetchMock = mock(() =>
      Promise.resolve({ type: "opaqueredirect", ok: false, status: 0 }),
    );
    globalThis.fetch = fetchMock;
    try {
      await submitForm(mockForm);
      const [, options] = fetchMock.mock.calls[0];
      expect(options.redirect).toBe("manual");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("returns ok with response url on 200 OK", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve({
        type: "basic",
        ok: true,
        url: "https://example.com/thank-you/",
      }),
    );
    try {
      const result = await submitForm(mockForm);
      expect(result.ok).toBe(true);
      expect(result.url).toBe("https://example.com/thank-you/");
      expect(result.error).toBeNull();
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("returns error with status on non-OK response", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve({
        type: "basic",
        ok: false,
        status: 422,
        url: "https://forms.example.com/submit",
      }),
    );
    try {
      const result = await submitForm(mockForm);
      expect(result.ok).toBe(false);
      expect(result.error.message).toBe("Server responded with 422");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("returns error on network failure", async () => {
    await withRejectedFetch(async () => {
      const result = await submitForm(mockForm);
      expect(result.ok).toBe(false);
      expect(result.url).toBe("");
      expect(result.error.message).toBe("Network error");
    });
  });
});
