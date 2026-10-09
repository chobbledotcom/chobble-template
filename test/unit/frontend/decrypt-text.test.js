import { describe, expect, test, vi } from "vitest";
import { decodeBase64 } from "#utils/aes-base64.js";
import { encrypt, generateKeyText } from "#utils/aes-encrypt.js";

let readyCallback = null;

vi.mock("#public/utils/on-ready.js", () => ({
  onReady: (callback) => {
    readyCallback = callback;
  },
}));

await import("#public/ui/decrypt-text.js");

const fireReady = () => readyCallback();

/** Mount a decrypt-key script plus one encrypted mailto link per address. */
const mountEncrypted = (addresses) => {
  const keyText = generateKeyText();
  const keyBytes = decodeBase64(keyText);
  const anchors = addresses.map(
    (address) =>
      `<a data-decrypt-link href="#${encrypt(`mailto:${address}`, keyBytes)}">${encrypt(address, keyBytes)}</a>`,
  );
  document.body.innerHTML = `<script data-decrypt-key="${keyText}"></script>${anchors.join("\n")}`;
};

describe("decrypt-text", () => {
  test("round-trips a build-time encrypted mailto link back to plaintext", async () => {
    mountEncrypted(["hello@example.com"]);
    const link = document.querySelector("a");

    await fireReady();

    expect(link.getAttribute("href")).toBe("mailto:hello@example.com");
    expect(link.textContent).toBe("hello@example.com");
    expect(link.hasAttribute("data-decrypt-link")).toBe(false);
  });

  test("decrypts every marked link on the page with the same key", async () => {
    mountEncrypted(["a@example.com", "b@example.com"]);

    await fireReady();

    const hrefs = [...document.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(["mailto:a@example.com", "mailto:b@example.com"]);
  });

  test("leaves the page untouched when no decrypt key script exists", async () => {
    document.body.innerHTML = `<a data-decrypt-link href="#abc">abc</a>`;

    await fireReady();

    expect(document.querySelector("a").getAttribute("href")).toBe("#abc");
  });

  test("does nothing when the key attribute is empty", async () => {
    document.body.innerHTML = `
      <script data-decrypt-key=""></script>
      <a data-decrypt-link href="#abc">abc</a>
    `;

    await fireReady();

    expect(document.querySelector("a").getAttribute("href")).toBe("#abc");
  });

  test("does nothing when the page has no encrypted links", async () => {
    const keyText = generateKeyText();
    document.body.innerHTML = `<script data-decrypt-key="${keyText}"></script>`;

    await expect(fireReady()).resolves.toBeUndefined();
  });
});
