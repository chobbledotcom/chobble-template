import { describe, expect, test } from "bun:test";
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
  expectResultTitles,
  formatDateString,
} from "#test/test-utils.js";

describe("events", () => {
  test("Handles empty events array", () => {
    const result = categoriseEvents([]);

    expect(result.upcoming).toEqual([]);
    expect(result.past).toEqual([]);
    expect(result.regular).toEqual([]);
    expect(result.show).toEqual({
      upcoming: true,
      regular: false,
      past: false,
    });
  });

  test("Categorizes future events as upcoming", () => {
    const events = [createFutureEvent()];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(1);
    expect(result.past.length).toBe(0);
    expect(result.regular.length).toBe(0);
    expect(result.show).toEqual({
      upcoming: true,
      regular: false,
      past: false,
    });
  });

  test("Categorizes past events correctly", () => {
    const events = [createPastEvent()];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(0);
    expect(result.past.length).toBe(1);
    expect(result.regular.length).toBe(0);
    expect(result.show).toEqual({
      upcoming: true,
      regular: false,
      past: true,
    });
  });

  test("Events today are categorized as upcoming", () => {
    const events = [createEvent("Today Event", new Date())];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(1);
    expect(result.past.length).toBe(0);
    expect(result.regular.length).toBe(0);
  });

  test("Categorizes recurring events correctly", () => {
    const events = [
      createRecurringEvent("Weekly Meeting", "Every Monday at 10 AM"),
      createRecurringEvent("Monthly Review", "First Friday of each month"),
    ];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(0);
    expect(result.past.length).toBe(0);
    expect(result.regular.length).toBe(2);
    expect(result.show).toEqual({
      upcoming: false,
      regular: true,
      past: false,
    });
  });

  test("Handles mix of upcoming, past, and recurring events", () => {
    const events = [
      createFutureEvent(),
      createPastEvent(),
      createRecurringEvent("Weekly Meeting"),
    ];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(1);
    expect(result.past.length).toBe(1);
    expect(result.regular.length).toBe(1);
    expect(result.show).toEqual({
      upcoming: false,
      regular: true,
      past: true,
    });
  });

  test("Sorts upcoming events by date (earliest first)", () => {
    const events = [
      createFutureEvent("Latest Event", 60),
      createFutureEvent("Earliest Event", 30),
      createFutureEvent("Middle Event", 45),
    ];

    const result = categoriseEvents(events);

    expect(result.upcoming[0].data.title).toBe("Earliest Event");
    expect(result.upcoming[1].data.title).toBe("Middle Event");
    expect(result.upcoming[2].data.title).toBe("Latest Event");
  });

  test("Sorts past events by date (most recent first)", () => {
    const events = [
      createPastEvent("Oldest Event", 60),
      createPastEvent("Most Recent Event", 30),
      createPastEvent("Middle Event", 45),
    ];

    const result = categoriseEvents(events);

    expect(result.past[0].data.title).toBe("Most Recent Event");
    expect(result.past[1].data.title).toBe("Middle Event");
    expect(result.past[2].data.title).toBe("Oldest Event");
  });

  test("Sorts regular events alphabetically by title", () => {
    const events = [
      createRecurringEvent("Zumba Class", "Every Thursday"),
      createRecurringEvent("Book Club", "First Wednesday"),
      createRecurringEvent("Monthly Meeting", "Last Friday"),
    ];

    const result = categoriseEvents(events);

    expect(result.regular[0].data.title).toBe("Book Club");
    expect(result.regular[1].data.title).toBe("Monthly Meeting");
    expect(result.regular[2].data.title).toBe("Zumba Class");
  });

  test("If event has both recurring_date and event_date, recurring takes precedence", () => {
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

    expect(result.upcoming.length).toBe(0);
    expect(result.past.length).toBe(0);
    expect(result.regular.length).toBe(1);
    expect(result.regular[0].data.title).toBe("Hybrid Event");
  });

  test("Handles events without titles gracefully", () => {
    const events = [
      { data: { recurring_date: "Every Monday" } },
      createRecurringEvent("Named Event", "Every Tuesday"),
    ];

    const result = categoriseEvents(events);

    expect(result.regular.length).toBe(2);
    expect(result.regular[0].data.title).toBe(undefined);
    expect(result.regular[1].data.title).toBe("Named Event");
  });

  test("Show logic with no events shows upcoming only", () => {
    const result = categoriseEvents([]);

    expect(result.show.upcoming).toBe(true);
    expect(result.show.regular).toBe(false);
    expect(result.show.past).toBe(false);
  });

  test("Show logic with only upcoming events", () => {
    const events = [createFutureEvent()];

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(true);
    expect(result.show.regular).toBe(false);
    expect(result.show.past).toBe(false);
  });

  test("Show logic hides upcoming when regular events exist", () => {
    const events = [
      createFutureEvent(),
      createRecurringEvent("Weekly Meeting"),
    ];

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(false);
    expect(result.show.regular).toBe(true);
    expect(result.show.past).toBe(false);
  });

  test("Show logic shows past events when regular events exist", () => {
    const events = [createPastEvent(), createRecurringEvent("Weekly Meeting")];

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(false);
    expect(result.show.regular).toBe(true);
    expect(result.show.past).toBe(true);
  });

  test("Show logic shows past events even without regular events", () => {
    const events = [createPastEvent()];

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(true);
    expect(result.show.regular).toBe(false);
    expect(result.show.past).toBe(true);
  });

  test("Filters events by featured flag", () => {
    const events = [
      { data: { title: "Event 1", featured: true } },
      { data: { title: "Event 2", featured: false } },
      { data: { title: "Event 3", featured: true } },
      { data: { title: "Event 4" } },
    ];

    const result = getFeaturedEvents(events);

    expectResultTitles(result, ["Event 1", "Event 3"]);
  });

  test("Returns empty array when no events are featured", () => {
    const events = [
      { data: { title: "Event 1", featured: false } },
      { data: { title: "Event 2" } },
    ];

    const result = getFeaturedEvents(events);

    expect(result.length).toBe(0);
  });

  test("Handles null/undefined events array", () => {
    expect(getFeaturedEvents(null)).toEqual([]);
    expect(getFeaturedEvents(undefined)).toEqual([]);
  });

  test("Registers getFeaturedEvents as an Eleventy filter", () => {
    const mockConfig = {
      filters: {},
      addFilter(name, fn) {
        this.filters[name] = fn;
      },
    };

    configureEvents(mockConfig);

    expect("getFeaturedEvents" in mockConfig.filters).toBe(true);
    expect(mockConfig.filters.getFeaturedEvents).toBe(getFeaturedEvents);
  });
});
