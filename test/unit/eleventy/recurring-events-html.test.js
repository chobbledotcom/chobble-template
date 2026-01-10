import { describe, expect, test } from "bun:test";
import path from "node:path";
import { renderSnippet } from "#eleventy/file-utils.js";
import {
  cleanupTempDir,
  createFrontmatter,
  createTempSnippetsDir,
  fs,
} from "#test/test-utils.js";

/**
 * Targeted tests for recurring events HTML generation.
 * Tests HTML structure validation, special character handling,
 * sorting behavior, and edge cases.
 */

/**
 * Test helper that creates event fixtures and renders recurring events snippet.
 * Follows bracket pattern for resource management.
 * Curried: (testName) => (eventFixtures, options?) => (testFn) => Promise<void>
 *
 * @param {string} testName - Unique name for temp directory
 * @returns {Function} (eventFixtures, options?) => (testFn) => Promise<void>
 *
 * @example
 * await withRecurringEventsTest("xss-title")(
 *   [{ title: '<script>alert("XSS")</script>', recurring_date: "Weekly" }]
 * )((result) => {
 *   expect(result.includes("<script>")).toBe(false);
 *   expect(result.includes("&lt;script&gt;")).toBe(true);
 * });
 *
 * @example
 * // Test without creating events directory
 * await withRecurringEventsTest("no-dir")([], { skipEventsDir: true })((result) => {
 *   expect(result.trim()).toBe("");
 * });
 *
 * @example
 * // Test with additional setup function
 * await withRecurringEventsTest("filter")(
 *   [{ title: "Valid Event", recurring_date: "Mon" }],
 *   { setup: (eventsDir) => {
 *     fs.writeFileSync(`${eventsDir}/readme.txt`, "Not an event");
 *   }}
 * )((result) => { ... });
 */
const withRecurringEventsTest =
  (testName) =>
  (eventFixtures, options = {}) =>
  async (testFn) => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      `recurring-events-${testName}`,
    );

    try {
      // Only create events directory if not skipped
      if (!options.skipEventsDir) {
        const eventsDir = path.join(tempDir, "src/events");
        fs.mkdirSync(eventsDir, { recursive: true });

        // Create event files from fixtures
        eventFixtures.forEach((fixture, index) => {
          const filename = fixture.filename || `event${index}.md`;
          const eventContent = createFrontmatter(fixture, "");
          fs.writeFileSync(`${eventsDir}/${filename}`, eventContent);
        });

        // Run optional setup function for additional files
        if (options.setup) {
          options.setup(eventsDir);
        }
      }

      // Create snippet that uses recurring_events shortcode
      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);
      await testFn(result);
    } finally {
      cleanupTempDir(tempDir);
    }
  };

describe("recurring events HTML generation", () => {
  test("Generates correct HTML structure with escaped title", async () => {
    await withRecurringEventsTest("structure")([
      {
        filename: "yoga.md",
        title: "Weekly Yoga Class",
        recurring_date: "Every Monday 6pm",
        event_location: "Community Hall",
      },
    ])((result) => {
      // Verify HTML structure
      expect(result.includes("<ul>")).toBe(true);
      expect(result.includes("<li>")).toBe(true);
      expect(result.includes("<strong>")).toBe(true);
      expect(result.includes("<a href=")).toBe(true);
      expect(result.includes("#content")).toBe(true);
      expect(result.includes("Weekly Yoga Class")).toBe(true);
      expect(result.includes("Every Monday 6pm")).toBe(true);
      expect(result.includes("Community Hall")).toBe(true);
      expect(result.includes("</ul>")).toBe(true);
    });
  });

  test("Escapes HTML special characters in event title", async () => {
    await withRecurringEventsTest("xss-title")([
      {
        title: 'Test <script>alert("XSS")</script> Event',
        recurring_date: "Weekly",
      },
    ])((result) => {
      // HTML should be escaped, not executed
      expect(result.includes("<script>")).toBe(false);
      expect(result.includes("&lt;script&gt;")).toBe(true);
      expect(result.includes("&lt;/script&gt;")).toBe(true);
    });
  });

  test("Escapes HTML special characters in location", async () => {
    await withRecurringEventsTest("xss-location")([
      {
        title: "Safe Event",
        recurring_date: "Weekly",
        event_location: '<img src=x onerror="alert(1)">',
      },
    ])((result) => {
      // HTML should be escaped
      expect(result.includes("<img src=x")).toBe(false);
      expect(result.includes("&lt;img")).toBe(true);
    });
  });

  test("Escapes HTML special characters in recurring_date", async () => {
    await withRecurringEventsTest("xss-date")([
      {
        title: "Event",
        recurring_date: 'Monday <b onclick="alert(1)">6pm</b>',
      },
    ])((result) => {
      // HTML should be escaped
      expect(result.includes('onclick="')).toBe(false);
      expect(result.includes("&lt;b")).toBe(true);
    });
  });

  test("Handles quotes and ampersands correctly", async () => {
    await withRecurringEventsTest("quotes")([
      {
        title: 'Coffee & Chat "Weekly"',
        recurring_date: "Thursdays @ 3pm",
        event_location: "Joe's & Jane's Café",
      },
    ])((result) => {
      // Ampersands and quotes should be escaped in attributes
      expect(result.includes("&amp;")).toBe(true);
      expect(result.includes("&quot;") || result.includes("&#39;")).toBe(true);
      // Text content should also be escaped
      expect(result.includes("Coffee &amp; Chat")).toBe(true);
    });
  });

  test("Returns empty string when no recurring events exist", async () => {
    await withRecurringEventsTest("none")([
      {
        // Create an event without recurring_date
        title: "One-time Event",
        date: "2026-03-15",
      },
    ])((result) => {
      // Should not render any HTML
      expect(result.includes("<ul>")).toBe(false);
      expect(result.trim()).toBe("");
    });
  });

  test("Returns empty string when events directory does not exist", async () => {
    // Don't create events directory
    await withRecurringEventsTest("no-dir")([], { skipEventsDir: true })(
      (result) => {
        expect(result.trim()).toBe("");
      },
    );
  });

  test("Handles event without location (no location HTML)", async () => {
    await withRecurringEventsTest("no-location")([
      {
        title: "Online Meeting",
        recurring_date: "Daily",
      },
    ])((result) => {
      expect(result.includes("Online Meeting")).toBe(true);
      expect(result.includes("Daily")).toBe(true);
      // Should not have extra <br> for missing location
      const brCount = (result.match(/<br>/g) || []).length;
      expect(brCount).toBe(1); // Only one <br> after title
    });
  });

  test("Sorts events correctly by title", async () => {
    // Create events in non-alphabetical order with custom filenames
    await withRecurringEventsTest("sorting")([
      {
        filename: "zzz.md",
        title: "Yoga",
        recurring_date: "Monday",
        order: 3,
      },
      {
        filename: "aaa.md",
        title: "Art Class",
        recurring_date: "Tuesday",
        order: 1,
      },
      {
        filename: "mmm.md",
        title: "Music Lesson",
        recurring_date: "Wednesday",
        order: 2,
      },
    ])((result) => {
      // Extract event titles in order they appear
      const artIndex = result.indexOf("Art Class");
      const musicIndex = result.indexOf("Music Lesson");
      const yogaIndex = result.indexOf("Yoga");

      // Should be sorted by order field (via sortItems)
      expect(artIndex).toBeLessThan(musicIndex);
      expect(musicIndex).toBeLessThan(yogaIndex);
    });
  });

  test("URL includes #content anchor for accessibility", async () => {
    await withRecurringEventsTest("anchor")([
      {
        filename: "test-event.md",
        title: "Test Event",
        recurring_date: "Weekly",
      },
    ])((result) => {
      // Check that URL has #content anchor
      expect(result).toMatch(/href="[^"]*#content"/);
      expect(result.includes("#content")).toBe(true);
    });
  });

  test("Handles multiple recurring events", async () => {
    // Create multiple recurring events
    await withRecurringEventsTest("multiple")([
      { filename: "event1.md", title: "Event 1", recurring_date: "Mon" },
      { filename: "event2.md", title: "Event 2", recurring_date: "Tue" },
      { filename: "event3.md", title: "Event 3", recurring_date: "Wed" },
    ])((result) => {
      // Should have 3 list items
      const liCount = (result.match(/<li>/g) || []).length;
      expect(liCount).toBe(3);
      expect(result.includes("Event 1")).toBe(true);
      expect(result.includes("Event 2")).toBe(true);
      expect(result.includes("Event 3")).toBe(true);
    });
  });

  test("Filters out non-markdown files from events directory", async () => {
    await withRecurringEventsTest("filter")(
      [{ filename: "valid.md", title: "Valid Event", recurring_date: "Mon" }],
      {
        setup: (eventsDir) => {
          // Create non-markdown files that should be ignored
          fs.writeFileSync(`${eventsDir}/readme.txt`, "Not an event");
          fs.writeFileSync(`${eventsDir}/config.json`, "{}");
        },
      },
    )((result) => {
      // Should only have 1 event
      const liCount = (result.match(/<li>/g) || []).length;
      expect(liCount).toBe(1);
      expect(result.includes("Valid Event")).toBe(true);
    });
  });

  test("Handles date-prefixed event filenames correctly", async () => {
    // Create event with date prefix (common Eleventy pattern)
    await withRecurringEventsTest("date-prefix")([
      {
        filename: "2026-01-15-yoga-class.md",
        title: "Yoga",
        recurring_date: "Weekly",
      },
    ])((result) => {
      // URL should be generated without the date prefix
      expect(result).toMatch(/href="[^"]*\/yoga-class\//);
      expect(result.includes("Yoga")).toBe(true);
    });
  });

  test("Uses custom permalink when provided", async () => {
    await withRecurringEventsTest("permalink")([
      {
        filename: "custom.md",
        title: "Custom Event",
        recurring_date: "Weekly",
        permalink: "/custom/path/to/event/",
      },
    ])((result) => {
      // Should use custom permalink
      expect(result).toMatch(/href="\/custom\/path\/to\/event\/#content"/);
    });
  });
});
