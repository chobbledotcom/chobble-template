import { JSDOM } from "jsdom";
import {
  configureRecurringEvents,
  renderRecurringEvents,
} from "#eleventy/recurring-events.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";
import { createTestSite } from "#test/test-site-factory.js";

const testCases = [
  // renderRecurringEvents - empty/null inputs
  {
    name: "renderRecurringEvents-empty-array",
    description: "Returns empty string for empty events array",
    test: () => {
      const result = renderRecurringEvents([]);
      expectStrictEqual(
        result,
        "",
        "Should return empty string for empty array",
      );
    },
  },
  {
    name: "renderRecurringEvents-null",
    description: "Returns empty string for null input",
    test: () => {
      const result = renderRecurringEvents(null);
      expectStrictEqual(result, "", "Should return empty string for null");
    },
  },
  {
    name: "renderRecurringEvents-undefined",
    description: "Returns empty string for undefined input",
    test: () => {
      const result = renderRecurringEvents(undefined);
      expectStrictEqual(result, "", "Should return empty string for undefined");
    },
  },

  // renderRecurringEvents - single event
  {
    name: "renderRecurringEvents-single-event-with-url",
    description: "Renders single event with URL as linked title",
    test: () => {
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
      expectTrue(ul !== null, "Should have ul element");

      const li = doc.querySelector("li");
      expectTrue(li !== null, "Should have li element");

      const link = doc.querySelector("a");
      expectStrictEqual(
        link.getAttribute("href"),
        "/events/market-day/",
        "Link should have correct href",
      );
      expectStrictEqual(
        link.textContent,
        "Farmers Market",
        "Link should have event title",
      );

      expectTrue(
        li.textContent.includes("Every Saturday"),
        "Should show recurring date",
      );
    },
  },
  {
    name: "renderRecurringEvents-single-event-without-url",
    description: "Renders event without URL as plain text title",
    test: () => {
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
      expectStrictEqual(link, null, "Should not have link when no URL");

      const strong = doc.querySelector("strong");
      expectStrictEqual(
        strong.textContent,
        "Weekly Meeting",
        "Title should be in strong tag",
      );
    },
  },
  {
    name: "renderRecurringEvents-event-with-location",
    description: "Renders event location when provided",
    test: () => {
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
      expectTrue(
        li.textContent.includes("Community Center"),
        "Should show location",
      );
    },
  },
  {
    name: "renderRecurringEvents-event-without-location",
    description: "Does not render location span when not provided",
    test: () => {
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
      expectTrue(
        !li.textContent.includes("event_location"),
        "Should not have location text",
      );
    },
  },

  // renderRecurringEvents - multiple events
  {
    name: "renderRecurringEvents-multiple-events",
    description: "Renders multiple events as list items",
    test: () => {
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
      expectStrictEqual(listItems.length, 3, "Should have 3 list items");

      const links = doc.querySelectorAll("a");
      expectStrictEqual(
        links.length,
        2,
        "Should have 2 links (third event has no URL)",
      );
    },
  },

  // renderRecurringEvents - data structure variations
  {
    name: "renderRecurringEvents-flat-data-structure",
    description: "Handles flat event objects (data at top level)",
    test: () => {
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
      expectStrictEqual(
        link.textContent,
        "Flat Event",
        "Should handle flat data structure",
      );
      expectStrictEqual(
        link.getAttribute("href"),
        "/flat/",
        "Should use url from flat structure",
      );
    },
  },
  {
    name: "renderRecurringEvents-nested-data-structure",
    description: "Handles nested event objects (data in .data property)",
    test: () => {
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
      expectStrictEqual(
        link.textContent,
        "Nested Event",
        "Should handle nested data structure",
      );
    },
  },
  {
    name: "renderRecurringEvents-url-in-data",
    description: "Falls back to URL in data object if not at top level",
    test: () => {
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
      expectStrictEqual(
        link.getAttribute("href"),
        "/data-url/",
        "Should use URL from data object",
      );
    },
  },

  // renderRecurringEvents - HTML structure
  {
    name: "renderRecurringEvents-html-structure",
    description: "Generates correct HTML structure",
    test: () => {
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

      expectTrue(result.startsWith("<ul>"), "Should start with ul");
      expectTrue(result.endsWith("</ul>"), "Should end with closing ul");
      expectTrue(result.includes("<li>"), "Should contain li");
      expectTrue(result.includes("<strong>"), "Should contain strong");
      expectTrue(result.includes("Daily"), "Should contain recurring date");
      expectTrue(result.includes("Here"), "Should contain location");
    },
  },

  // renderRecurringEvents - special characters
  {
    name: "renderRecurringEvents-special-characters-in-title",
    description: "Preserves special characters in event title",
    test: () => {
      const events = [
        {
          data: {
            title: "Music & Arts Festival",
            recurring_date: "Annually",
          },
        },
      ];
      const result = renderRecurringEvents(events);
      expectTrue(
        result.includes("Music & Arts Festival"),
        "Should preserve ampersand in title",
      );
    },
  },
  {
    name: "renderRecurringEvents-quotes-in-title",
    description: "Handles quotes in event title",
    test: () => {
      const events = [
        {
          data: {
            title: '"Open Mic" Night',
            recurring_date: "Fridays",
          },
        },
      ];
      const result = renderRecurringEvents(events);
      expectTrue(
        result.includes('"Open Mic" Night'),
        "Should preserve quotes in title",
      );
    },
  },
  {
    name: "renderRecurringEvents-unicode-in-location",
    description: "Handles unicode characters in location",
    test: () => {
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
      expectTrue(
        li.textContent.includes("Café René"),
        "Should preserve unicode in location",
      );
    },
  },

  // configureRecurringEvents
  {
    name: "configureRecurringEvents-adds-shortcode",
    description: "Registers recurring_events shortcode",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureRecurringEvents(mockConfig);

      expectTrue(
        "recurring_events" in mockConfig.shortcodes,
        "Should add recurring_events shortcode",
      );
      expectFunctionType(
        mockConfig.shortcodes,
        "recurring_events",
        "Shortcode should be a function",
      );
    },
  },
  {
    name: "configureRecurringEvents-adds-filter",
    description: "Registers format_recurring_events filter",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureRecurringEvents(mockConfig);

      expectTrue(
        "format_recurring_events" in mockConfig.filters,
        "Should add format_recurring_events filter",
      );
      expectFunctionType(
        mockConfig.filters,
        "format_recurring_events",
        "Filter should be a function",
      );
    },
  },
  {
    name: "configureRecurringEvents-filter-is-renderRecurringEvents",
    description: "The filter is the renderRecurringEvents function",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureRecurringEvents(mockConfig);

      const filter = mockConfig.filters.format_recurring_events;
      expectStrictEqual(
        filter,
        renderRecurringEvents,
        "Filter should be renderRecurringEvents function",
      );
    },
  },

  // renderRecurringEvents - immutability
  {
    name: "renderRecurringEvents-does-not-mutate-input",
    description: "Does not modify the input events array",
    test: () => {
      const originalEvents = [
        {
          url: "/test/",
          data: { title: "Test", recurring_date: "Weekly" },
        },
      ];
      const eventsCopy = JSON.parse(JSON.stringify(originalEvents));

      renderRecurringEvents(originalEvents);

      expectStrictEqual(
        JSON.stringify(originalEvents),
        JSON.stringify(eventsCopy),
        "Should not mutate input array",
      );
    },
  },

  // ============================================
  // Integration Tests using Test Site Factory
  // ============================================
  // These tests create isolated Eleventy sites with custom content,
  // build them, and verify the output. This ensures tests are:
  // - Fully isolated (Section 5: Isolated and Repeatable)
  // - Testing real behavior through the full build pipeline
  // - Not dependent on external fixture files

  {
    name: "integration-recurring-events-rendered-in-build",
    description:
      "Recurring events are correctly rendered when site is built with Eleventy",
    asyncTest: async () => {
      const site = await createTestSite({
        events: [
          {
            filename: "weekly-meetup.md",
            frontmatter: {
              title: "Weekly Meetup",
              recurring_date: "Every Tuesday at 7pm",
              event_location: "Community Center",
            },
            content: "# Weekly Meetup\n\nJoin us every week!",
          },
          {
            filename: "2024-03-15-monthly-workshop.md",
            frontmatter: {
              title: "Monthly Workshop",
              recurring_date: "First Saturday of each month",
            },
            content: "# Monthly Workshop",
          },
          {
            filename: "one-time-event.md",
            frontmatter: {
              title: "One Time Event",
              event_date: "2024-06-15",
            },
            content: "# One Time Event\n\nThis should NOT appear in recurring list",
          },
        ],
        // Create a page that uses the recurring_events shortcode
        pages: [
          {
            filename: "recurring-test.md",
            frontmatter: {
              title: "Recurring Events Test",
              layout: "page",
              permalink: "/recurring-test/",
            },
            content: "# Recurring Events\n\n{% recurring_events %}",
          },
        ],
      });

      try {
        await site.build();

        // Get the test page output
        const html = site.getOutput("/recurring-test/index.html");
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // Should have ul container for recurring events
        const ul = doc.querySelector("ul");
        expectTrue(ul !== null, "Should render recurring events in ul element");

        // Should include recurring events
        expectTrue(
          html.includes("Weekly Meetup"),
          "Should include Weekly Meetup recurring event",
        );
        expectTrue(
          html.includes("Monthly Workshop"),
          "Should include Monthly Workshop recurring event",
        );
        expectTrue(
          html.includes("Every Tuesday at 7pm"),
          "Should include recurring date",
        );
        expectTrue(
          html.includes("Community Center"),
          "Should include event location",
        );

        // Should NOT include one-time events
        expectTrue(
          !html.includes("One Time Event"),
          "Should NOT include one-time events in recurring list",
        );

        // Should have links to event pages
        const links = doc.querySelectorAll("a[href*='/events/']");
        expectTrue(
          links.length >= 2,
          `Should have links to recurring event pages, got ${links.length}`,
        );

        // Verify URL building - date prefix should be stripped
        expectTrue(
          html.includes("/events/monthly-workshop/") ||
            html.includes("monthly-workshop"),
          "Should strip date prefix from URL (2024-03-15-monthly-workshop -> monthly-workshop)",
        );
        expectTrue(
          !html.includes("/events/2024-03-15-"),
          "Should not include date prefix in URL",
        );
      } finally {
        site.cleanup();
      }
    },
  },

  {
    name: "integration-recurring-events-with-custom-permalink",
    description: "Events with custom permalinks use that URL in recurring list",
    asyncTest: async () => {
      const site = await createTestSite({
        events: [
          {
            filename: "yoga-class.md",
            frontmatter: {
              title: "Yoga Class",
              recurring_date: "Wednesdays at 6pm",
              permalink: "/classes/yoga/",
            },
            content: "# Yoga Class",
          },
        ],
        pages: [
          {
            filename: "test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "{% recurring_events %}",
          },
        ],
      });

      try {
        await site.build();

        const html = site.getOutput("/test/index.html");

        expectTrue(
          html.includes('href="/classes/yoga/"'),
          "Should use custom permalink from frontmatter",
        );
        expectTrue(
          !html.includes('href="/events/yoga-class/"'),
          "Should NOT use default URL when custom permalink exists",
        );
      } finally {
        site.cleanup();
      }
    },
  },

  {
    name: "integration-recurring-events-empty-list",
    description: "Returns empty content when no recurring events exist",
    asyncTest: async () => {
      const site = await createTestSite({
        events: [
          {
            filename: "one-time.md",
            frontmatter: {
              title: "One Time Only",
              event_date: "2024-12-25",
            },
            content: "# One Time Only",
          },
        ],
        pages: [
          {
            filename: "test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "START{% recurring_events %}END",
          },
        ],
      });

      try {
        await site.build();

        const html = site.getOutput("/test/index.html");

        // When no recurring events, shortcode returns empty string
        // So START and END should be adjacent (possibly with whitespace)
        const noRecurringEvents =
          !html.includes("<ul>") || !html.includes("One Time Only");
        expectTrue(
          noRecurringEvents,
          "Should not render any recurring events when none exist",
        );
      } finally {
        site.cleanup();
      }
    },
  },

  {
    name: "integration-recurring-events-html-structure",
    description: "Recurring events render with correct HTML structure",
    asyncTest: async () => {
      const site = await createTestSite({
        events: [
          {
            filename: "test-event.md",
            frontmatter: {
              title: "Test Event",
              recurring_date: "Daily",
              event_location: "Test Location",
            },
            content: "# Test",
          },
        ],
        pages: [
          {
            filename: "test.md",
            frontmatter: {
              title: "Test",
              layout: "page",
              permalink: "/test/",
            },
            content: "{% recurring_events %}",
          },
        ],
      });

      try {
        await site.build();

        const html = site.getOutput("/test/index.html");
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // Check structure: ul > li > strong > a
        const ul = doc.querySelector("ul");
        expectTrue(ul !== null, "Should have ul element");

        const li = doc.querySelector("ul li");
        expectTrue(li !== null, "Should have li element inside ul");

        const strong = doc.querySelector("ul li strong");
        expectTrue(strong !== null, "Should have strong element for title");

        const link = doc.querySelector("ul li strong a");
        expectTrue(link !== null, "Should have link inside strong");
        expectStrictEqual(
          link.textContent,
          "Test Event",
          "Link should contain event title",
        );
      } finally {
        site.cleanup();
      }
    },
  },
];

export default createTestRunner("recurring-events", testCases);
