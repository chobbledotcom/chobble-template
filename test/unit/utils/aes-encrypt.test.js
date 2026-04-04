import { describe, expect, test } from "bun:test";
import { decodeBase64, encodeBase64 } from "#utils/aes-base64.js";
import { encrypt, generateKeyText } from "#utils/aes-encrypt.js";

const roundTrip = (original) => [...decodeBase64(encodeBase64(original))];

describe("aes-encrypt", () => {
  describe("custom Base64", () => {
    test("round-trips arbitrary bytes", () => {
      expect(roundTrip(new Uint8Array([0, 1, 127, 128, 255, 42, 99]))).toEqual([
        0, 1, 127, 128, 255, 42, 99,
      ]);
    });

    test("round-trips edge cases (empty, 1 byte, 2 bytes)", () => {
      expect(roundTrip(new Uint8Array([]))).toEqual([]);
      expect(roundTrip(new Uint8Array([200]))).toEqual([200]);
      expect(roundTrip(new Uint8Array([100, 200]))).toEqual([100, 200]);
    });

    test("produces URL-safe characters only", () => {
      const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
      expect(encodeBase64(bytes)).toMatch(/^[0-9a-zA-Z_-]+$/);
    });
  });

  describe("generateKeyText", () => {
    test("decodes to 32 bytes (AES-256)", () => {
      expect(decodeBase64(generateKeyText()).length).toBe(32);
    });

    test("generates different keys each call", () => {
      expect(generateKeyText()).not.toBe(generateKeyText());
    });
  });

  describe("encrypt", () => {
    const makeKey = () => Buffer.from(decodeBase64(generateKeyText()));

    test("produces different ciphertext each call (random nonce)", () => {
      const keyBytes = makeKey();
      expect(encrypt("hello@example.com", keyBytes)).not.toBe(
        encrypt("hello@example.com", keyBytes),
      );
    });

    test("produces URL-safe output", () => {
      expect(encrypt("test@example.com", makeKey())).toMatch(
        /^[0-9a-zA-Z_-]+$/,
      );
    });
  });
});
