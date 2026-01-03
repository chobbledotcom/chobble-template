import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  configureRecurringEvents,
  renderRecurringEvents,
} from "#eleventy/recurring-events.js";
import { withTestSite } from "#test/test-site-factory.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("recurring-events", () => {
  // renderRecurringEvents - empty/null inputs
  test("Returns empty string for empty events array", () => {
    const result = renderRecurringEvents([]);
    expect(result).toBe("");
  });

  test("Returns empty string for null input", () => {
    const result = renderRecurringEvents(null);
    expect(result).toBe("");
  });

  test("Returns empty string for undefined input", () => {
    const result = renderRecurringEvents(undefined);
    expect(result).toBe("");
  });

  // renderRecurringEvents - single event
  test("Renders single event with URL as linked title", () => {
    const events = [
      {
        url: "/events/market-day/",
        data: {
          title: "Farmers Market",
          recurring_date: "Every Saturday",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const ul = doc.querySelector("ul");
    expect(ul !== null).toBe(true);

    const li = doc.querySelector("li");
    expect(li !== null).toBe(true);

    const link = doc.querySelector("a");
    expect(link.getAttribute("href")).toBe("/events/market-day/");
    expect(link.textContent).toBe("Farmers Market");

    expect(li.textContent.includes("Every Saturday")).toBe(true);
  });

  test("Renders event without URL as plain text title", () => {
    const events = [
      {
        data: {
          title: "Weekly Meeting",
          recurring_date: "Mondays at 9am",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const link = doc.querySelector("a");
    expect(link).toBe(null);

    const strong = doc.querySelector("strong");
    expect(strong.textContent).toBe("Weekly Meeting");
  });

  test("Renders event location when provided", () => {
    const events = [
      {
        url: "/events/yoga/",
        data: {
          title: "Yoga Class",
          recurring_date: "Wednesdays 6pm",
          event_location: "Community Center",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const li = doc.querySelector("li");
    expect(li.textContent.includes("Community Center")).toBe(true);
  });

  test("Does not render location span when not provided", () => {
    const events = [
      {
        data: {
          title: "Online Meetup",
          recurring_date: "First Friday of month",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const li = doc.querySelector("li");
    expect(!li.textContent.includes("event_location")).toBe(true);
  });

  // renderRecurringEvents - multiple events
  test("Renders multiple events as list items", () => {
    const events = [
      {
        url: "/events/market/",
        data: { title: "Market", recurring_date: "Saturdays" },
      },
      {
        url: "/events/meetup/",
        data: { title: "Meetup", recurring_date: "Tuesdays" },
      },
      {
        data: { title: "Class", recurring_date: "Daily" },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const listItems = doc.querySelectorAll("li");
    expect(listItems.length).toBe(3);

    const links = doc.querySelectorAll("a");
    expect(links.length).toBe(2);
  });

  // renderRecurringEvents - data structure variations
  test("Handles flat event objects (data at top level)", () => {
    const events = [
      {
        title: "Flat Event",
        recurring_date: "Weekly",
        url: "/flat/",
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const link = doc.querySelector("a");
    expect(link.textContent).toBe("Flat Event");
    expect(link.getAttribute("href")).toBe("/flat/");
  });

  test("Handles nested event objects (data in .data property)", () => {
    const events = [
      {
        url: "/nested/",
        data: {
          title: "Nested Event",
          recurring_date: "Monthly",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const link = doc.querySelector("a");
    expect(link.textContent).toBe("Nested Event");
  });

  test("Falls back to URL in data object if not at top level", () => {
    const events = [
      {
        data: {
          title: "Event With Data URL",
          recurring_date: "Weekly",
          url: "/data-url/",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const link = doc.querySelector("a");
    expect(link.getAttribute("href")).toBe("/data-url/");
  });

  // renderRecurringEvents - HTML structure
  test("Generates correct HTML structure", () => {
    const events = [
      {
        url: "/test/",
        data: {
          title: "Test Event",
          recurring_date: "Daily",
          event_location: "Here",
        },
      },
    ];
    const result = renderRecurringEvents(events);

    expect(result.startsWith("<ul>")).toBe(true);
    expect(result.endsWith("</ul>")).toBe(true);
    expect(result.includes("<li>")).toBe(true);
    expect(result.includes("<strong>")).toBe(true);
    expect(result.includes("Daily")).toBe(true);
    expect(result.includes("Here")).toBe(true);
  });

  // renderRecurringEvents - special characters
  test("Preserves special characters in event title", () => {
    const events = [
      {
        data: {
          title: "Music & Arts Festival",
          recurring_date: "Annually",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    expect(result.includes("Music & Arts Festival")).toBe(true);
  });

  test("Handles quotes in event title", () => {
    const events = [
      {
        data: {
          title: '"Open Mic" Night',
          recurring_date: "Fridays",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    expect(result.includes('"Open Mic" Night')).toBe(true);
  });

  test("Handles unicode characters in location", () => {
    const events = [
      {
        data: {
          title: "Café Meeting",
          recurring_date: "Tuesdays",
          event_location: "Café René",
        },
      },
    ];
    const result = renderRecurringEvents(events);
    const dom = new JSDOM(result);
    const doc = dom.window.document;

    const li = doc.querySelector("li");
    expect(li.textContent.includes("Café René")).toBe(true);
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

    const filter = mockConfig.filters.format_recurring_events;
    expect(filter).toBe(renderRecurringEvents);
  });

  // renderRecurringEvents - immutability
  test("Does not modify the input events array", () => {
    const originalEvents = [
      {
        url: "/test/",
        data: { title: "Test", recurring_date: "Weekly" },
      },
    ];
    const eventsCopy = JSON.parse(JSON.stringify(originalEvents));

    renderRecurringEvents(originalEvents);

    expect(JSON.stringify(originalEvents)).toBe(JSON.stringify(eventsCopy));
  });

  // ============================================
  // Integration Tests using Test Site Factory
  // ============================================
  // These tests create isolated Eleventy sites with custom content,
  // build them, and verify the output. This ensures tests are:
  // - Fully isolated (Section 5: Isolated and Repeatable)
  // - Testing real behavior through the full build pipeline
  // - Not dependent on external fixture files

  test("Recurring events are correctly rendered in Eleventy build", async () =>
    withTestSite(
      {
        files: [
          {
            path: "events/weekly-meetup.md",
            frontmatter: {
              title: "Weekly Meetup",
              recurring_date: "Every Tuesday at 7pm",
              event_location: "Community Center",
            },
          },
          {
            path: "events/2024-03-15-monthly-workshop.md",
            frontmatter: {
              title: "Monthly Workshop",
              recurring_date: "First Saturday of each month",
            },
          },
          {
            path: "events/one-time-event.md",
            frontmatter: {
              title: "One Time Event",
              event_date: "2024-06-15",
            },
          },
          {
            path: "pages/test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "{% recurring_events %}",
          },
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
          {
            path: "events/yoga-class.md",
            frontmatter: {
              title: "Yoga Class",
              recurring_date: "Wednesdays at 6pm",
              permalink: "/classes/yoga/",
            },
          },
          {
            path: "pages/test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "{% recurring_events %}",
          },
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
          {
            path: "events/one-time.md",
            frontmatter: { title: "One Time Only", event_date: "2024-12-25" },
          },
          {
            path: "pages/test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "START{% recurring_events %}END",
          },
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
        files: [
          {
            path: "events/test-event.md",
            frontmatter: { title: "Test Event", recurring_date: "Daily" },
          },
          {
            path: "pages/test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "{% recurring_events %}",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/test/index.html");
        const link = doc.querySelector("ul li strong a");
        expect(link?.textContent).toBe("Test Event");
      },
    ));
});
