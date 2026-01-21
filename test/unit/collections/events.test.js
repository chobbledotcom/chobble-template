import { describe, expect, test } from "bun:test";
import {
  categoriseEvents,
  configureEvents,
  getFeaturedEvents,
} from "#collections/events.js";
import {
  createMockEleventyConfig,
  expectResultTitles,
} from "#test/test-utils.js";
import {
  createEvent,
  createEvents,
  createOffsetDate,
  expectEventCounts,
  formatDateString,
} from "#test/unit/collections/events-utils.js";

describe("events", () => {
  test("Handles empty events array", () => {
    const result = categoriseEvents([]);

    expect(result.upcoming).toEqual([]);
    expect(result.past).toEqual([]);
    expect(result.regular).toEqual([]);
    expect(result.undated).toEqual([]);
  });

  test("Categorizes future events as upcoming", () => {
    const events = [createEvent()];

    const result = categoriseEvents(events);

    expectEventCounts(result, { upcoming: 1 });
  });

  test("Categorizes past events correctly", () => {
    const events = [createEvent({ daysOffset: -30 })];

    const result = categoriseEvents(events);

    expectEventCounts(result, { past: 1 });
  });

  test("Events today are categorized as upcoming", () => {
    const events = [createEvent({ title: "Today Event", date: new Date() })];

    const result = categoriseEvents(events);

    expectEventCounts(result, { upcoming: 1 });
  });

  test("Categorizes recurring events correctly", () => {
    const events = createEvents([
      { title: "Weekly Meeting", recurring: "Every Monday at 10 AM" },
      { title: "Monthly Review", recurring: "First Friday of each month" },
    ]);

    const result = categoriseEvents(events);

    expectEventCounts(result, { regular: 2 });
  });

  test("Handles mix of upcoming, past, and recurring events", () => {
    const events = createEvents([
      {},
      { daysOffset: -30 },
      { title: "Weekly Meeting", recurring: "Every Monday" },
    ]);

    const result = categoriseEvents(events);

    expectEventCounts(result, { upcoming: 1, past: 1, regular: 1 });
  });

  test("Sorts upcoming events by date (earliest first)", () => {
    const events = createEvents([
      { title: "Latest Event", daysOffset: 60 },
      { title: "Earliest Event", daysOffset: 30 },
      { title: "Middle Event", daysOffset: 45 },
    ]);

    const result = categoriseEvents(events);

    expectResultTitles(result.upcoming, [
      "Earliest Event",
      "Middle Event",
      "Latest Event",
    ]);
  });

  test("Sorts past events by date (most recent first)", () => {
    const events = createEvents([
      { title: "Oldest Event", daysOffset: -60 },
      { title: "Most Recent Event", daysOffset: -30 },
      { title: "Middle Event", daysOffset: -45 },
    ]);

    const result = categoriseEvents(events);

    expectResultTitles(result.past, [
      "Most Recent Event",
      "Middle Event",
      "Oldest Event",
    ]);
  });

  test("Sorts regular events alphabetically by title", () => {
    const events = createEvents([
      { title: "Zumba Class", recurring: "Every Thursday" },
      { title: "Book Club", recurring: "First Wednesday" },
      { title: "Monthly Meeting", recurring: "Last Friday" },
    ]);

    const result = categoriseEvents(events);

    expectResultTitles(result.regular, [
      "Book Club",
      "Monthly Meeting",
      "Zumba Class",
    ]);
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

    expectEventCounts(result, { regular: 1 });
    expectResultTitles(result.regular, ["Hybrid Event"]);
  });

  test("Handles events without titles gracefully", () => {
    const events = [
      { data: { recurring_date: "Every Monday" } },
      ...createEvents([{ title: "Named Event", recurring: "Every Tuesday" }]),
    ];

    const result = categoriseEvents(events);

    expectResultTitles(result.regular, [undefined, "Named Event"]);
  });

  test("Categorizes events without dates as undated", () => {
    const events = createEvents([
      { title: "No Date Event 1", undated: true },
      { title: "No Date Event 2", undated: true },
    ]);

    const result = categoriseEvents(events);

    expectEventCounts(result, { undated: 2 });
  });

  test("Sorts undated events alphabetically by title", () => {
    const events = createEvents([
      { title: "Zulu Event", undated: true },
      { title: "Alpha Event", undated: true },
      { title: "Mike Event", undated: true },
    ]);

    const result = categoriseEvents(events);

    expectResultTitles(result.undated, [
      "Alpha Event",
      "Mike Event",
      "Zulu Event",
    ]);
  });

  test("Handles mix of all event types including undated", () => {
    const events = createEvents([
      { title: "Future Event" },
      { title: "Past Event", daysOffset: -30 },
      { title: "Weekly Meeting", recurring: "Every Monday" },
      { title: "Undated Event", undated: true },
    ]);

    const result = categoriseEvents(events);

    expectEventCounts(result, { upcoming: 1, past: 1, regular: 1, undated: 1 });
  });
});

describe("configureEvents", () => {
  test("registers getFeaturedEvents filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureEvents(mockConfig);

    expect(typeof mockConfig.filters.getFeaturedEvents).toBe("function");
  });
});

describe("getFeaturedEvents", () => {
  test("returns only featured events", () => {
    const events = createEvents([
      { title: "Featured Event", featured: true },
      { title: "Normal Event" },
      { title: "Another Featured", featured: true },
    ]);

    const result = getFeaturedEvents(events);

    expectResultTitles(result, ["Featured Event", "Another Featured"]);
  });

  test("returns empty array when no events are featured", () => {
    const events = createEvents([{ title: "Event 1" }, { title: "Event 2" }]);

    const result = getFeaturedEvents(events);

    expect(result).toEqual([]);
  });

  test("returns empty array for empty input", () => {
    const result = getFeaturedEvents([]);

    expect(result).toEqual([]);
  });
});
