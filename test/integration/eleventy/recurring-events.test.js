import { describe, expect, test } from "bun:test";
import {
  configureRecurringEvents,
  recurringEventsShortcode,
  renderRecurringEvents,
} from "#eleventy/recurring-events.js";
import { withTestSite } from "#test/test-site-factory.js";
import { createMockEleventyConfig } from "#test/test-utils.js";
import { map } from "#utils/array-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create an event with nested data structure
 * @param {string} title - Event title
 * @param {string} recurring - Recurring date string
 * @param {Object} options - Additional options (url, location)
 */
const event = (title, recurring, { url, location } = {}) => ({
  ...(url && { url }),
  data: {
    title,
    recurring_date: recurring,
    ...(location && { event_location: location }),
  },
});

/**
 * Create events from an array of [title, recurring, options] tuples
 * Curried for use with pipe
 */
const events = map(([title, recurring, options]) =>
  event(title, recurring, options),
);

/**
 * Render events and return parsed document
 */
const renderAndParse = async (events) => {
  const html = await renderRecurringEvents(events);
  document.body.innerHTML = html;
  return document;
};

describe("recurring-events", () => {
  // renderRecurringEvents - empty/null inputs
  test("Returns empty string for empty events array", async () => {
    expect(await renderRecurringEvents([])).toBe("");
  });

  // renderRecurringEvents - single event
  test("Renders single event with URL as linked title", async () => {
    const doc = await renderAndParse([
      event("Farmers Market", "Every Saturday", { url: "/events/market-day/" }),
    ]);

    expect(doc.querySelector("ul") !== null).toBe(true);
    expect(doc.querySelector("li") !== null).toBe(true);

    const link = doc.querySelector("a");
    expect(link.getAttribute("href")).toBe("/events/market-day/");
    expect(link.textContent).toBe("Farmers Market");
    expect(doc.querySelector("li").textContent.includes("Every Saturday")).toBe(
      true,
    );
  });

  test("Renders event without URL as plain text title", async () => {
    const doc = await renderAndParse([
      event("Weekly Meeting", "Mondays at 9am"),
    ]);

    expect(doc.querySelector("a")).toBe(null);
    expect(doc.querySelector("strong").textContent).toBe("Weekly Meeting");
  });

  test("Renders event location when provided", async () => {
    const doc = await renderAndParse([
      event("Yoga Class", "Wednesdays 6pm", {
        url: "/events/yoga/",
        location: "Community Center",
      }),
    ]);

    expect(
      doc.querySelector("li").textContent.includes("Community Center"),
    ).toBe(true);
  });

  test("Does not render location span when not provided", async () => {
    const doc = await renderAndParse([
      event("Online Meetup", "First Friday of month"),
    ]);

    expect(
      !doc.querySelector("li").textContent.includes("event_location"),
    ).toBe(true);
  });

  // renderRecurringEvents - multiple events
  test("Renders multiple events as list items", async () => {
    const doc = await renderAndParse([
      event("Market", "Saturdays", { url: "/events/market/" }),
      event("Meetup", "Tuesdays", { url: "/events/meetup/" }),
      event("Class", "Daily"),
    ]);

    expect(doc.querySelectorAll("li").length).toBe(3);
    expect(doc.querySelectorAll("a").length).toBe(2);
  });

  // renderRecurringEvents - data structure variations
  test("Handles nested event objects (data in .data property)", async () => {
    const doc = await renderAndParse([
      event("Nested Event", "Monthly", { url: "/nested/" }),
    ]);

    expect(doc.querySelector("a").textContent).toBe("Nested Event");
  });

  test("Falls back to URL in data object if not at top level", async () => {
    const testEvents = [
      {
        data: {
          title: "Event With Data URL",
          recurring_date: "Weekly",
          url: "/data-url/",
        },
      },
    ];
    const doc = await renderAndParse(testEvents);

    expect(doc.querySelector("a").getAttribute("href")).toBe("/data-url/");
  });

  // renderRecurringEvents - HTML structure
  test("Generates correct HTML structure", async () => {
    const result = await renderRecurringEvents([
      event("Test Event", "Daily", { url: "/test/", location: "Here" }),
    ]);

    expect(result.startsWith("<ul>")).toBe(true);
    expect(result.endsWith("</ul>")).toBe(true);
    expect(result.includes("<li>")).toBe(true);
    expect(result.includes("<strong>")).toBe(true);
    expect(result.includes("Daily")).toBe(true);
    expect(result.includes("Here")).toBe(true);
  });

  // renderRecurringEvents - special characters
  test("Preserves special characters in event title", async () => {
    const result = await renderRecurringEvents([
      event("Music & Arts Festival", "Annually"),
    ]);
    expect(result.includes("Music & Arts Festival")).toBe(true);
  });

  test("Handles quotes in event title", async () => {
    const result = await renderRecurringEvents([
      event('"Open Mic" Night', "Fridays"),
    ]);
    expect(result.includes('"Open Mic" Night')).toBe(true);
  });

  test("Handles unicode characters in location", async () => {
    const doc = await renderAndParse([
      event("Café Meeting", "Tuesdays", { location: "Café René" }),
    ]);

    expect(doc.querySelector("li").textContent.includes("Café René")).toBe(
      true,
    );
  });

  // configureRecurringEvents
  test("Registers recurring_events shortcode", () => {
    const mockConfig = createMockEleventyConfig();
    configureRecurringEvents(mockConfig);

    expect("recurring_events" in mockConfig.shortcodes).toBe(true);
    expect(typeof mockConfig.shortcodes.recurring_events).toBe("function");
  });

  test("Registers format_recurring_events filter", () => {
    const mockConfig = createMockEleventyConfig();
    configureRecurringEvents(mockConfig);

    expect("format_recurring_events" in mockConfig.filters).toBe(true);
    expect(typeof mockConfig.filters.format_recurring_events).toBe("function");
  });

  test("The filter is the renderRecurringEvents function", () => {
    const mockConfig = createMockEleventyConfig();
    configureRecurringEvents(mockConfig);

    expect(mockConfig.filters.format_recurring_events).toBe(
      renderRecurringEvents,
    );
  });

  // recurringEventsShortcode tests
  test("recurringEventsShortcode returns HTML when passed events with recurring_date", async () => {
    const events = [
      {
        data: {
          title: "Weekly Meetup",
          recurring_date: "Every Tuesday",
          order: 1,
        },
        url: "/events/meetup/",
      },
    ];

    const result = await recurringEventsShortcode(events);

    expect(result.includes("Weekly Meetup")).toBe(true);
    expect(result.includes("Every Tuesday")).toBe(true);
  });

  test("recurringEventsShortcode returns empty string when no recurring events exist", async () => {
    const events = [
      {
        data: { title: "One-time Event", event_date: "2024-01-01" },
        url: "/events/one-time/",
      },
    ];

    const result = await recurringEventsShortcode(events);

    expect(result).toBe("");
  });

  test("recurringEventsShortcode handles empty array gracefully", async () => {
    const result = await recurringEventsShortcode([]);

    expect(result).toBe("");
  });

  test("recurringEventsShortcode handles undefined gracefully", async () => {
    const result = await recurringEventsShortcode();

    expect(result).toBe("");
  });

  // renderRecurringEvents - immutability
  test("Does not modify the input events array", async () => {
    const originalEvents = [event("Test", "Weekly", { url: "/test/" })];
    const eventsCopy = JSON.parse(JSON.stringify(originalEvents));

    await renderRecurringEvents(originalEvents);

    expect(JSON.stringify(originalEvents)).toBe(JSON.stringify(eventsCopy));
  });

  // ============================================
  // Integration Tests using Test Site Factory
  // ============================================

  /**
   * Create a recurring event file for test site
   */
  const eventFile = (slug, title, recurring, extras = {}) => ({
    path: `events/${slug}.md`,
    frontmatter: { title, recurring_date: recurring, ...extras },
  });

  /**
   * Create a one-time event file (no recurring_date)
   */
  const oneTimeEventFile = (slug, title, date) => ({
    path: `events/${slug}.md`,
    frontmatter: { title, event_date: date },
  });

  /**
   * Create a test page that renders recurring events
   */
  const testPage = (content = "{% recurring_events %}") => ({
    path: "pages/test.md",
    frontmatter: { title: "Test", layout: "page", permalink: "/test/" },
    content,
  });

  test("Recurring events are correctly rendered in Eleventy build", async () =>
    withTestSite(
      {
        files: [
          eventFile("weekly-meetup", "Weekly Meetup", "Every Tuesday at 7pm", {
            event_location: "Community Center",
          }),
          eventFile(
            "2024-03-15-monthly-workshop",
            "Monthly Workshop",
            "First Saturday of each month",
          ),
          oneTimeEventFile("one-time-event", "One Time Event", "2024-06-15"),
          testPage(),
        ],
      },
      (site) => {
        const html = site.getOutput("/test/index.html");
        const doc = site.getDoc("/test/index.html");

        expect(html.includes("Weekly Meetup")).toBe(true);
        expect(html.includes("Monthly Workshop")).toBe(true);
        expect(html.includes("Every Tuesday at 7pm")).toBe(true);
        expect(html.includes("Community Center")).toBe(true);
        expect(!html.includes("One Time Event")).toBe(true);
        expect(!html.includes("/events/2024-03-15-")).toBe(true);
        expect(doc.querySelectorAll("ul li a[href*='/events/']").length).toBe(
          2,
        );
      },
    ));

  test("Events with custom permalinks use that URL", async () =>
    withTestSite(
      {
        files: [
          eventFile("yoga-class", "Yoga Class", "Wednesdays at 6pm", {
            permalink: "/classes/yoga/",
          }),
          testPage(),
        ],
      },
      (site) => {
        const html = site.getOutput("/test/index.html");
        expect(html.includes('href="/classes/yoga/"')).toBe(true);
        expect(!html.includes('href="/events/yoga-class/"')).toBe(true);
      },
    ));

  test("Returns empty content when no recurring events exist", async () =>
    withTestSite(
      {
        files: [
          oneTimeEventFile("one-time", "One Time Only", "2024-12-25"),
          testPage("START{% recurring_events %}END"),
        ],
      },
      (site) => {
        const html = site.getOutput("/test/index.html");
        expect(!html.includes("<ul>") || !html.includes("One Time Only")).toBe(
          true,
        );
      },
    ));

  test("Recurring events render with correct HTML structure", async () =>
    withTestSite(
      {
        files: [eventFile("test-event", "Test Event", "Daily"), testPage()],
      },
      (site) => {
        const doc = site.getDoc("/test/index.html");
        expect(doc.querySelector("ul li strong a")?.textContent).toBe(
          "Test Event",
        );
      },
    ));
});
