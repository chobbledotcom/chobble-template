import { describe, expect, test } from "bun:test";
import {
  categoriseEvents,
  configureEvents,
  getFeaturedEvents,
} from "#collections/events.js";
import {
  createEvent,
  createEvents,
  createOffsetDate,
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
      upcoming: false,
      regular: false,
      past: false,
    });
  });

  test("Categorizes future events as upcoming", () => {
    const events = [createEvent()];

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
    const events = [createEvent({ daysOffset: -30 })];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(0);
    expect(result.past.length).toBe(1);
    expect(result.regular.length).toBe(0);
    expect(result.show).toEqual({
      upcoming: false,
      regular: false,
      past: true,
    });
  });

  test("Events today are categorized as upcoming", () => {
    const events = [createEvent({ title: "Today Event", date: new Date() })];

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(1);
    expect(result.past.length).toBe(0);
    expect(result.regular.length).toBe(0);
  });

  test("Categorizes recurring events correctly", () => {
    const events = createEvents([
      { title: "Weekly Meeting", recurring: "Every Monday at 10 AM" },
      { title: "Monthly Review", recurring: "First Friday of each month" },
    ]);

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
    const events = createEvents([
      {},
      { daysOffset: -30 },
      { title: "Weekly Meeting", recurring: "Every Monday" },
    ]);

    const result = categoriseEvents(events);

    expect(result.upcoming.length).toBe(1);
    expect(result.past.length).toBe(1);
    expect(result.regular.length).toBe(1);
    expect(result.show).toEqual({
      upcoming: true,
      regular: true,
      past: true,
    });
  });

  test("Sorts upcoming events by date (earliest first)", () => {
    const events = createEvents([
      { title: "Latest Event", daysOffset: 60 },
      { title: "Earliest Event", daysOffset: 30 },
      { title: "Middle Event", daysOffset: 45 },
    ]);

    const result = categoriseEvents(events);

    expect(result.upcoming[0].data.title).toBe("Earliest Event");
    expect(result.upcoming[1].data.title).toBe("Middle Event");
    expect(result.upcoming[2].data.title).toBe("Latest Event");
  });

  test("Sorts past events by date (most recent first)", () => {
    const events = createEvents([
      { title: "Oldest Event", daysOffset: -60 },
      { title: "Most Recent Event", daysOffset: -30 },
      { title: "Middle Event", daysOffset: -45 },
    ]);

    const result = categoriseEvents(events);

    expect(result.past[0].data.title).toBe("Most Recent Event");
    expect(result.past[1].data.title).toBe("Middle Event");
    expect(result.past[2].data.title).toBe("Oldest Event");
  });

  test("Sorts regular events alphabetically by title", () => {
    const events = createEvents([
      { title: "Zumba Class", recurring: "Every Thursday" },
      { title: "Book Club", recurring: "First Wednesday" },
      { title: "Monthly Meeting", recurring: "Last Friday" },
    ]);

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
          event_date: formatDateString(createOffsetDate()),
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
      ...createEvents([{ title: "Named Event", recurring: "Every Tuesday" }]),
    ];

    const result = categoriseEvents(events);

    expect(result.regular.length).toBe(2);
    expect(result.regular[0].data.title).toBe(undefined);
    expect(result.regular[1].data.title).toBe("Named Event");
  });

  test("Show logic with no events shows nothing", () => {
    const result = categoriseEvents([]);

    expect(result.show.upcoming).toBe(false);
    expect(result.show.regular).toBe(false);
    expect(result.show.past).toBe(false);
  });

  test("Show logic with only upcoming events", () => {
    const events = [createEvent()];

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(true);
    expect(result.show.regular).toBe(false);
    expect(result.show.past).toBe(false);
  });

  test("Show logic shows both upcoming and regular when both exist", () => {
    const events = createEvents([
      {},
      { title: "Weekly Meeting", recurring: "Every Monday" },
    ]);

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(true);
    expect(result.show.regular).toBe(true);
    expect(result.show.past).toBe(false);
  });

  test("Show logic shows past and regular but not upcoming when no upcoming", () => {
    const events = createEvents([
      { daysOffset: -30 },
      { title: "Weekly Meeting", recurring: "Every Monday" },
    ]);

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(false);
    expect(result.show.regular).toBe(true);
    expect(result.show.past).toBe(true);
  });

  test("Show logic shows only past when only past events exist", () => {
    const events = [createEvent({ daysOffset: -30 })];

    const result = categoriseEvents(events);

    expect(result.show.upcoming).toBe(false);
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
