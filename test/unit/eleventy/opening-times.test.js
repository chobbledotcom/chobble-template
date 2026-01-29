import { describe, expect, test } from "bun:test";
import {
  configureOpeningTimes,
  renderOpeningTimes,
} from "#eleventy/opening-times.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("opening-times", () => {
  test("Returns empty string for empty array", async () => {
    const result = await renderOpeningTimes([]);
    expect(result).toBe("");
  });

  test("Returns empty string for null input", async () => {
    const result = await renderOpeningTimes(null);
    expect(result).toBe("");
  });

  test("Returns empty string for undefined input", async () => {
    const result = await renderOpeningTimes(undefined);
    expect(result).toBe("");
  });

  test("Renders single opening time entry correctly", async () => {
    const input = [{ day: "Monday", hours: "9am - 5pm" }];
    const result = await renderOpeningTimes(input);

    expect(result.includes("<ul>")).toBe(true);
    expect(result.includes("<strong>Monday:</strong> 9am - 5pm")).toBe(true);
    expect(result.includes("<li>")).toBe(true);
  });

  test("Renders multiple opening time entries correctly", async () => {
    const input = [
      { day: "Monday", hours: "9am - 5pm" },
      { day: "Tuesday", hours: "10am - 6pm" },
      { day: "Wednesday", hours: "Closed" },
    ];
    const result = await renderOpeningTimes(input);

    expect(result.includes("<strong>Monday:</strong> 9am - 5pm")).toBe(true);
    expect(result.includes("<strong>Tuesday:</strong> 10am - 6pm")).toBe(true);
    expect(result.includes("<strong>Wednesday:</strong> Closed")).toBe(true);

    const liCount = (result.match(/<li>/g) || []).length;
    expect(liCount).toBe(3);
  });

  test("Generates correct HTML structure", async () => {
    const input = [{ day: "Friday", hours: "8am - 4pm" }];
    const result = await renderOpeningTimes(input);

    expect(result.includes("<ul>")).toBe(true);
    expect(result.includes("</ul>")).toBe(true);
    expect(result.includes("</li>")).toBe(true);
  });

  test("Registers opening_times shortcode", () => {
    const mockConfig = createMockEleventyConfig();
    configureOpeningTimes(mockConfig);

    expect(typeof mockConfig.asyncShortcodes.opening_times).toBe("function");
  });
});
