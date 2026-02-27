import { describe, expect, test } from "bun:test";
import {
  configureRecurringEvents,
  renderRecurringEvents,
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
    const html = await renderRecurringEvents([
      event("Farmers Market", "Every Saturday", { url: "/events/market-day/" }),
    ]);

    // Log actual output for CI debugging
    if (!html.includes("<ul>")) {
      throw new Error(`Expected HTML to contain <ul>, got: ${html}`);
    }

    document.body.innerHTML = html;
    const link = document.querySelector("a");

    if (!link) {
      throw new Error(`No <a> tag found in: ${html}`);
    }

    const actualHref = link.getAttribute("href");
    expect(actualHref).toBe("/events/market-day/");
    expect(link.textContent).toBe("Farmers Market");
  });

  test("Renders event location when provided", async () => {
    const html = await renderRecurringEvents([
      event("Yoga Class", "Wednesdays 6pm", {
        url: "/events/yoga/",
        location: "Community Center",
      }),
    ]);

    if (!html.includes("Community Center")) {
      throw new Error(
        `Expected HTML to contain "Community Center", got: ${html}`,
      );
    }

    document.body.innerHTML = html;
    expect(
      document.querySelector("li").textContent.includes("Community Center"),
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

    expect("recurring_events" in mockConfig.asyncShortcodes).toBe(true);
    expect(typeof mockConfig.asyncShortcodes.recurring_events).toBe("function");
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
  const eventsTestPage = (content = "{% recurring_events %}") => ({
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
          eventsTestPage(),
        ],
      },
      async (site) => {
        const html = site.getOutput("/test/index.html");
        const doc = await site.getDoc("/test/index.html");

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
