import assert from "node:assert";
import {
  categoriseEvents,
  configureEvents,
  getFeaturedEvents,
} from "#collections/events.js";
import {
  createEvent,
  createFutureDate,
  createFutureEvent,
  createPastEvent,
  createRecurringEvent,
  createTestRunner,
  formatDateString,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "categoriseEvents-empty-array",
    description: "Handles empty events array",
    test: () => {
      const result = categoriseEvents([]);

      assert.deepStrictEqual(
        result.upcoming,
        [],
        "Should have empty upcoming array",
      );
      assert.deepStrictEqual(result.past, [], "Should have empty past array");
      assert.deepStrictEqual(
        result.regular,
        [],
        "Should have empty regular array",
      );
      assert.deepStrictEqual(
        result.show,
        {
          upcoming: true,
          regular: false,
          past: false,
        },
        "Should show upcoming section only when no events",
      );
    },
  },
  {
    name: "categoriseEvents-upcoming-only",
    description: "Categorizes future events as upcoming",
    test: () => {
      const events = [createFutureEvent()];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming.length,
        1,
        "Should have one upcoming event",
      );
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(
        result.regular.length,
        0,
        "Should have no regular events",
      );
      assert.deepStrictEqual(
        result.show,
        {
          upcoming: true,
          regular: false,
          past: false,
        },
        "Should show upcoming section only",
      );
    },
  },
  {
    name: "categoriseEvents-past-only",
    description: "Categorizes past events correctly",
    test: () => {
      const events = [createPastEvent()];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming.length,
        0,
        "Should have no upcoming events",
      );
      assert.strictEqual(result.past.length, 1, "Should have one past event");
      assert.strictEqual(
        result.regular.length,
        0,
        "Should have no regular events",
      );
      assert.deepStrictEqual(
        result.show,
        {
          upcoming: true,
          regular: false,
          past: true,
        },
        "Should show upcoming and past sections",
      );
    },
  },
  {
    name: "categoriseEvents-today-as-upcoming",
    description: "Events today are categorized as upcoming",
    test: () => {
      const events = [createEvent("Today Event", new Date())];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming.length,
        1,
        "Today's event should be upcoming",
      );
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(
        result.regular.length,
        0,
        "Should have no regular events",
      );
    },
  },
  {
    name: "categoriseEvents-recurring-only",
    description: "Categorizes recurring events correctly",
    test: () => {
      const events = [
        createRecurringEvent("Weekly Meeting", "Every Monday at 10 AM"),
        createRecurringEvent("Monthly Review", "First Friday of each month"),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming.length,
        0,
        "Should have no upcoming events",
      );
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(
        result.regular.length,
        2,
        "Should have two regular events",
      );
      assert.deepStrictEqual(
        result.show,
        {
          upcoming: false,
          regular: true,
          past: false,
        },
        "Should show regular section only when only regular events",
      );
    },
  },
  {
    name: "categoriseEvents-mixed-events",
    description: "Handles mix of upcoming, past, and recurring events",
    test: () => {
      const events = [
        createFutureEvent(),
        createPastEvent(),
        createRecurringEvent("Weekly Meeting"),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming.length,
        1,
        "Should have one upcoming event",
      );
      assert.strictEqual(result.past.length, 1, "Should have one past event");
      assert.strictEqual(
        result.regular.length,
        1,
        "Should have one regular event",
      );
      assert.deepStrictEqual(
        result.show,
        {
          upcoming: false,
          regular: true,
          past: true,
        },
        "Should show regular and past when there are regular events",
      );
    },
  },
  {
    name: "categoriseEvents-upcoming-sort-order",
    description: "Sorts upcoming events by date (earliest first)",
    test: () => {
      const events = [
        createFutureEvent("Latest Event", 60),
        createFutureEvent("Earliest Event", 30),
        createFutureEvent("Middle Event", 45),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming[0].data.title,
        "Earliest Event",
        "First should be earliest",
      );
      assert.strictEqual(
        result.upcoming[1].data.title,
        "Middle Event",
        "Second should be middle",
      );
      assert.strictEqual(
        result.upcoming[2].data.title,
        "Latest Event",
        "Third should be latest",
      );
    },
  },
  {
    name: "categoriseEvents-past-sort-order",
    description: "Sorts past events by date (most recent first)",
    test: () => {
      const events = [
        createPastEvent("Oldest Event", 60),
        createPastEvent("Most Recent Event", 30),
        createPastEvent("Middle Event", 45),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.past[0].data.title,
        "Most Recent Event",
        "First should be most recent",
      );
      assert.strictEqual(
        result.past[1].data.title,
        "Middle Event",
        "Second should be middle",
      );
      assert.strictEqual(
        result.past[2].data.title,
        "Oldest Event",
        "Third should be oldest",
      );
    },
  },
  {
    name: "categoriseEvents-regular-alphabetical-sort",
    description: "Sorts regular events alphabetically by title",
    test: () => {
      const events = [
        createRecurringEvent("Zumba Class", "Every Thursday"),
        createRecurringEvent("Book Club", "First Wednesday"),
        createRecurringEvent("Monthly Meeting", "Last Friday"),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.regular[0].data.title,
        "Book Club",
        "First should be Book Club",
      );
      assert.strictEqual(
        result.regular[1].data.title,
        "Monthly Meeting",
        "Second should be Monthly Meeting",
      );
      assert.strictEqual(
        result.regular[2].data.title,
        "Zumba Class",
        "Third should be Zumba Class",
      );
    },
  },
  {
    name: "categoriseEvents-prefers-recurring-over-fixed",
    description:
      "If event has both recurring_date and event_date, recurring takes precedence",
    test: () => {
      const events = [
        {
          data: {
            title: "Hybrid Event",
            recurring_date: "Every Friday",
            event_date: formatDateString(createFutureDate()),
          },
        },
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.upcoming.length,
        0,
        "Should have no upcoming events",
      );
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(
        result.regular.length,
        1,
        "Should have one regular event",
      );
      assert.strictEqual(
        result.regular[0].data.title,
        "Hybrid Event",
        "Event should be in regular",
      );
    },
  },
  {
    name: "categoriseEvents-handles-missing-title",
    description: "Handles events without titles gracefully",
    test: () => {
      const events = [
        { data: { recurring_date: "Every Monday" } },
        createRecurringEvent("Named Event", "Every Tuesday"),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.regular.length,
        2,
        "Should have two regular events",
      );
      assert.strictEqual(
        result.regular[0].data.title,
        undefined,
        "First event should have no title",
      );
      assert.strictEqual(
        result.regular[1].data.title,
        "Named Event",
        "Second event should be Named Event",
      );
    },
  },
  {
    name: "show-logic-no-events",
    description: "Show logic with no events shows upcoming only",
    test: () => {
      const result = categoriseEvents([]);

      assert.strictEqual(
        result.show.upcoming,
        true,
        "Should show upcoming when no events",
      );
      assert.strictEqual(
        result.show.regular,
        false,
        "Should not show regular when no events",
      );
      assert.strictEqual(
        result.show.past,
        false,
        "Should not show past when no events",
      );
    },
  },
  {
    name: "show-logic-upcoming-only",
    description: "Show logic with only upcoming events",
    test: () => {
      const events = [createFutureEvent()];

      const result = categoriseEvents(events);

      assert.strictEqual(result.show.upcoming, true, "Should show upcoming");
      assert.strictEqual(result.show.regular, false, "Should not show regular");
      assert.strictEqual(
        result.show.past,
        false,
        "Should not show past when no past events",
      );
    },
  },
  {
    name: "show-logic-with-regular",
    description: "Show logic hides upcoming when regular events exist",
    test: () => {
      const events = [
        createFutureEvent(),
        createRecurringEvent("Weekly Meeting"),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.show.upcoming,
        false,
        "Should not show upcoming when regular events exist",
      );
      assert.strictEqual(result.show.regular, true, "Should show regular");
      assert.strictEqual(
        result.show.past,
        false,
        "Should not show past when no past events",
      );
    },
  },
  {
    name: "show-logic-past-with-regular",
    description: "Show logic shows past events when regular events exist",
    test: () => {
      const events = [
        createPastEvent(),
        createRecurringEvent("Weekly Meeting"),
      ];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.show.upcoming,
        false,
        "Should not show upcoming when regular events exist",
      );
      assert.strictEqual(result.show.regular, true, "Should show regular");
      assert.strictEqual(
        result.show.past,
        true,
        "Should show past when there are past events and regular events",
      );
    },
  },
  {
    name: "show-logic-past-without-regular",
    description: "Show logic shows past events even without regular events",
    test: () => {
      const events = [createPastEvent()];

      const result = categoriseEvents(events);

      assert.strictEqual(
        result.show.upcoming,
        true,
        "Should show upcoming when no regular events",
      );
      assert.strictEqual(result.show.regular, false, "Should not show regular");
      assert.strictEqual(
        result.show.past,
        true,
        "Should show past when there are past events",
      );
    },
  },
  {
    name: "getFeaturedEvents-basic",
    description: "Filters events by featured flag",
    test: () => {
      const events = [
        { data: { title: "Event 1", featured: true } },
        { data: { title: "Event 2", featured: false } },
        { data: { title: "Event 3", featured: true } },
        { data: { title: "Event 4" } },
      ];

      const result = getFeaturedEvents(events);

      assert.strictEqual(result.length, 2, "Should return 2 featured events");
      assert.strictEqual(
        result[0].data.title,
        "Event 1",
        "Should include first featured event",
      );
      assert.strictEqual(
        result[1].data.title,
        "Event 3",
        "Should include second featured event",
      );
    },
  },
  {
    name: "getFeaturedEvents-empty",
    description: "Returns empty array when no events are featured",
    test: () => {
      const events = [
        { data: { title: "Event 1", featured: false } },
        { data: { title: "Event 2" } },
      ];

      const result = getFeaturedEvents(events);

      assert.strictEqual(
        result.length,
        0,
        "Should return no events when none are featured",
      );
    },
  },
  {
    name: "getFeaturedEvents-null",
    description: "Handles null/undefined events array",
    test: () => {
      assert.deepStrictEqual(
        getFeaturedEvents(null),
        [],
        "Should return empty array for null",
      );
      assert.deepStrictEqual(
        getFeaturedEvents(undefined),
        [],
        "Should return empty array for undefined",
      );
    },
  },
  {
    name: "configureEvents-registers-filter",
    description: "Registers getFeaturedEvents as an Eleventy filter",
    test: () => {
      const mockConfig = {
        filters: {},
        addFilter(name, fn) {
          this.filters[name] = fn;
        },
      };

      configureEvents(mockConfig);

      assert.strictEqual(
        "getFeaturedEvents" in mockConfig.filters,
        true,
        "Should add getFeaturedEvents filter",
      );
      assert.strictEqual(
        mockConfig.filters.getFeaturedEvents,
        getFeaturedEvents,
        "Should use correct filter function",
      );
    },
  },
];

export default createTestRunner("events", testCases);
