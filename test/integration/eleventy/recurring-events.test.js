import { describe, expect, test } from "bun:test";
import {
  configureRecurringEvents,
  getEventUrl,
  renderRecurringEvents,
  stripDatePrefix,
} from "#eleventy/recurring-events.js";
import { withTestSite } from "#test/test-site-factory.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

// ============================================
// Functional Test Fixture Builders
// ============================================

/**
 * Create an event with nested data structure matching Eleventy collection format
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
 * Render events and return parsed document (async)
 */
const renderAndParse = async (events) => {
  const html = await renderRecurringEvents(events);
  // Debug: log rendered HTML to help diagnose CI failures
  if (!html || html.length === 0) {
    console.log("DEBUG: renderRecurringEvents returned empty:", { events, html });
  }
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
    expect(link.getAttribute("href")).toBe("/events/market-day/#content");
    expect(link.textContent).toBe("Farmers Market");
    expect(doc.querySelector("li").textContent.includes("Every Saturday")).toBe(
      true,
    );
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
      event("Online Meetup", "First Friday of month", {
        url: "/events/online/",
      }),
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
      event("Class", "Daily", { url: "/events/class/" }),
    ]);

    expect(doc.querySelectorAll("li").length).toBe(3);
    expect(doc.querySelectorAll("a").length).toBe(3);
  });

  // renderRecurringEvents - data structure variations
  test("Handles nested event objects (data in .data property)", async () => {
    const doc = await renderAndParse([
      event("Nested Event", "Monthly", { url: "/nested/" }),
    ]);

    expect(doc.querySelector("a").textContent).toBe("Nested Event");
  });

  // renderRecurringEvents - HTML structure
  test("Generates correct HTML structure", async () => {
    const result = await renderRecurringEvents([
      event("Test Event", "Daily", { url: "/test/", location: "Here" }),
    ]);

    expect(result.includes("<ul>")).toBe(true);
    expect(result.includes("</ul>")).toBe(true);
    expect(result.includes("<li>")).toBe(true);
    expect(result.includes("<strong>")).toBe(true);
    expect(result.includes("Daily")).toBe(true);
    expect(result.includes("Here")).toBe(true);
  });

  // renderRecurringEvents - special characters
  test("Preserves special characters in event title", async () => {
    const result = await renderRecurringEvents([
      event("Music & Arts Festival", "Annually", { url: "/events/arts/" }),
    ]);
    expect(result.includes("Music & Arts Festival")).toBe(true);
  });

  test("Handles unicode characters in location", async () => {
    const doc = await renderAndParse([
      event("Café Meeting", "Tuesdays", {
        url: "/events/cafe/",
        location: "Café René",
      }),
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

  // renderRecurringEvents - immutability
  test("Does not modify the input events array", async () => {
    const originalEvents = [event("Test", "Weekly", { url: "/test/" })];
    const eventsCopy = JSON.parse(JSON.stringify(originalEvents));

    await renderRecurringEvents(originalEvents);

    expect(JSON.stringify(originalEvents)).toBe(JSON.stringify(eventsCopy));
  });

  // ============================================
  // stripDatePrefix - filename slug extraction
  // ============================================

  test("stripDatePrefix removes date prefix from filename", () => {
    expect(stripDatePrefix("2024-03-15-my-event.md")).toBe("my-event");
  });

  test("stripDatePrefix handles filename without date prefix", () => {
    expect(stripDatePrefix("my-event.md")).toBe("my-event");
  });

  test("stripDatePrefix handles various date formats", () => {
    expect(stripDatePrefix("2024-01-01-new-years.md")).toBe("new-years");
    expect(stripDatePrefix("2025-12-31-end-of-year.md")).toBe("end-of-year");
  });

  test("stripDatePrefix preserves slug with numbers", () => {
    expect(stripDatePrefix("2024-03-15-event-2024.md")).toBe("event-2024");
  });

  // ============================================
  // getEventUrl - permalink resolution
  // ============================================

  test("getEventUrl uses custom permalink when provided", () => {
    const data = { permalink: "/custom/path/" };
    expect(getEventUrl(data, "my-event", "events")).toBe("/custom/path/");
  });

  test("getEventUrl falls back to default URL when no permalink", () => {
    expect(getEventUrl({}, "my-event", "events")).toBe("/events/my-event/");
  });

  test("getEventUrl constructs URL with provided permalink dir", () => {
    expect(getEventUrl({}, "concert", "gigs")).toBe("/gigs/concert/");
  });

  test("getEventUrl prefers explicit permalink over default", () => {
    const data = { permalink: "/special/" };
    expect(getEventUrl(data, "ignored-slug", "ignored-dir")).toBe("/special/");
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
});
