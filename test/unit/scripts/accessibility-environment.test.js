/**
 * axe binds to whatever document exists when it is imported, so in this
 * suite's happy-dom environment it would audit the test's own blank document
 * and report a missing title on every page it was given. The check refuses to
 * run rather than report that, and this is the test that holds it to it.
 *
 * The rest of the check's behaviour is covered by accessibility.test.js, which
 * runs in Node — the environment the check requires.
 */
import { describe, expect, test } from "vitest";
import { auditHtml } from "#scripts/accessibility.js";

describe("the accessibility check inside a realm that has its own document", () => {
  test("refuses to audit rather than report on the wrong document", async () => {
    await expect(
      auditHtml("<html lang='en'></html>", "index.html"),
    ).rejects.toThrow(/realm with no document of its own/);
  });
});
