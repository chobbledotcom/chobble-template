import { describe, expect, test } from "bun:test";
import { renderSnippet } from "#eleventy/file-utils.js";
import {
  cleanupTempDir,
  createFrontmatter,
  createTempSnippetsDir,
  fs,
} from "#test/test-utils.js";
import path from "node:path";

/**
 * Targeted tests for recurring events HTML generation.
 * Tests HTML structure validation, special character handling,
 * sorting behavior, and edge cases.
 */

describe("recurring events HTML generation", () => {
  test("Generates correct HTML structure with escaped title", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-structure",
    );

    try {
      // Create events directory with a recurring event
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: "Weekly Yoga Class",
          recurring_date: "Every Monday 6pm",
          event_location: "Community Hall",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/yoga.md`, eventContent);

      // Create snippet that uses recurring_events shortcode
      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

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
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Escapes HTML special characters in event title", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-xss-title",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: 'Test <script>alert("XSS")</script> Event',
          recurring_date: "Weekly",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/test.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // HTML should be escaped, not executed
      expect(result.includes("<script>")).toBe(false);
      expect(result.includes("&lt;script&gt;")).toBe(true);
      expect(result.includes("&lt;/script&gt;")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Escapes HTML special characters in location", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-xss-location",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: "Safe Event",
          recurring_date: "Weekly",
          event_location: '<img src=x onerror="alert(1)">',
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/test.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // HTML should be escaped
      expect(result.includes("<img src=x")).toBe(false);
      expect(result.includes("&lt;img")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Escapes HTML special characters in recurring_date", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-xss-date",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: "Event",
          recurring_date: 'Monday <b onclick="alert(1)">6pm</b>',
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/test.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // HTML should be escaped
      expect(result.includes('onclick="')).toBe(false);
      expect(result.includes("&lt;b")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles quotes and ampersands correctly", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-quotes",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: 'Coffee & Chat "Weekly"',
          recurring_date: "Thursdays @ 3pm",
          event_location: "Joe's & Jane's Café",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/coffee.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Ampersands and quotes should be escaped in attributes
      expect(result.includes("&amp;")).toBe(true);
      expect(result.includes("&quot;") || result.includes("&#39;")).toBe(true);
      // Text content should also be escaped
      expect(result.includes("Coffee &amp; Chat")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Returns empty string when no recurring events exist", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-none",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      // Create an event without recurring_date
      const eventContent = createFrontmatter(
        {
          title: "One-time Event",
          date: "2026-03-15",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/onetime.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Should not render any HTML
      expect(result.includes("<ul>")).toBe(false);
      expect(result.trim()).toBe("");
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Returns empty string when events directory does not exist", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-no-dir",
    );

    try {
      // Don't create events directory
      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      expect(result.trim()).toBe("");
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles event without location (no location HTML)", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-no-location",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: "Online Meeting",
          recurring_date: "Daily",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/online.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      expect(result.includes("Online Meeting")).toBe(true);
      expect(result.includes("Daily")).toBe(true);
      // Should not have extra <br> for missing location
      const brCount = (result.match(/<br>/g) || []).length;
      expect(brCount).toBe(1); // Only one <br> after title
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Sorts events correctly by title", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-sorting",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      // Create events in non-alphabetical order
      fs.writeFileSync(
        `${eventsDir}/zzz.md`,
        createFrontmatter(
          { title: "Yoga", recurring_date: "Monday", order: 3 },
          "",
        ),
      );
      fs.writeFileSync(
        `${eventsDir}/aaa.md`,
        createFrontmatter(
          { title: "Art Class", recurring_date: "Tuesday", order: 1 },
          "",
        ),
      );
      fs.writeFileSync(
        `${eventsDir}/mmm.md`,
        createFrontmatter(
          { title: "Music Lesson", recurring_date: "Wednesday", order: 2 },
          "",
        ),
      );

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Extract event titles in order they appear
      const artIndex = result.indexOf("Art Class");
      const musicIndex = result.indexOf("Music Lesson");
      const yogaIndex = result.indexOf("Yoga");

      // Should be sorted by order field (via sortItems)
      expect(artIndex).toBeLessThan(musicIndex);
      expect(musicIndex).toBeLessThan(yogaIndex);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("URL includes #content anchor for accessibility", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-anchor",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: "Test Event",
          recurring_date: "Weekly",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/test-event.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Check that URL has #content anchor
      expect(result).toMatch(/href="[^"]*#content"/);
      expect(result.includes("#content")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles multiple recurring events", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-multiple",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      // Create multiple recurring events
      fs.writeFileSync(
        `${eventsDir}/event1.md`,
        createFrontmatter({ title: "Event 1", recurring_date: "Mon" }, ""),
      );
      fs.writeFileSync(
        `${eventsDir}/event2.md`,
        createFrontmatter({ title: "Event 2", recurring_date: "Tue" }, ""),
      );
      fs.writeFileSync(
        `${eventsDir}/event3.md`,
        createFrontmatter({ title: "Event 3", recurring_date: "Wed" }, ""),
      );

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Should have 3 list items
      const liCount = (result.match(/<li>/g) || []).length;
      expect(liCount).toBe(3);
      expect(result.includes("Event 1")).toBe(true);
      expect(result.includes("Event 2")).toBe(true);
      expect(result.includes("Event 3")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Filters out non-markdown files from events directory", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-filter",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      // Create a markdown event
      fs.writeFileSync(
        `${eventsDir}/valid.md`,
        createFrontmatter({ title: "Valid Event", recurring_date: "Mon" }, ""),
      );

      // Create non-markdown files that should be ignored
      fs.writeFileSync(`${eventsDir}/readme.txt`, "Not an event");
      fs.writeFileSync(`${eventsDir}/config.json`, "{}");

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Should only have 1 event
      const liCount = (result.match(/<li>/g) || []).length;
      expect(liCount).toBe(1);
      expect(result.includes("Valid Event")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Handles date-prefixed event filenames correctly", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-date-prefix",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      // Create event with date prefix (common Eleventy pattern)
      fs.writeFileSync(
        `${eventsDir}/2026-01-15-yoga-class.md`,
        createFrontmatter({ title: "Yoga", recurring_date: "Weekly" }, ""),
      );

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // URL should be generated without the date prefix
      expect(result).toMatch(/href="[^"]*\/yoga-class\//);
      expect(result.includes("Yoga")).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("Uses custom permalink when provided", async () => {
    const { tempDir, snippetsDir } = createTempSnippetsDir(
      "recurring-events-permalink",
    );

    try {
      const eventsDir = path.join(tempDir, "src/events");
      fs.mkdirSync(eventsDir, { recursive: true });

      const eventContent = createFrontmatter(
        {
          title: "Custom Event",
          recurring_date: "Weekly",
          permalink: "/custom/path/to/event/",
        },
        "",
      );
      fs.writeFileSync(`${eventsDir}/custom.md`, eventContent);

      const snippetContent = "{% recurring_events %}";
      fs.writeFileSync(`${snippetsDir}/events.md`, snippetContent);

      const result = await renderSnippet("events", "", tempDir);

      // Should use custom permalink
      expect(result).toMatch(/href="\/custom\/path\/to\/event\/#content"/);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
