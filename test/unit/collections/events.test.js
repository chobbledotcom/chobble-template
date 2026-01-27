import { describe, expect, test } from "bun:test";
import { categoriseEvents, configureEvents } from "#collections/events.js";
import { expectResultTitles, getCollectionFrom } from "#test/test-utils.js";
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

// ============================================
// Events Collection Tests
// ============================================

/** Helper to create event items with fileSlug */
const eventItem = (slug, data = {}) => ({
  fileSlug: slug,
  data: { title: `Event ${slug}`, ...data },
});

/** Helper to create product items with events array */
const productItem = (slug, events = [], thumbnail, order = 0) => ({
  fileSlug: slug,
  data: { events, thumbnail, order },
});

/** Curried helper to get the events collection from a configured mock */
const getCollection = getCollectionFrom("events")(configureEvents);

describe("events collection", () => {
  test("returns empty array when no events exist", () => {
    const result = getCollection({ events: [], products: [] });
    expect(result).toEqual([]);
  });

  test("preserves event data when no products match", () => {
    const events = [eventItem("summer-fest", { title: "Summer Festival" })];
    const result = getCollection({ events, products: [] });
    expect(result[0].data.title).toBe("Summer Festival");
  });

  test("inherits thumbnail from product in event", () => {
    const events = [eventItem("summer-fest")];
    const products = [productItem("product-1", ["summer-fest"], "thumb.jpg")];
    const result = getCollection({ events, products });
    expect(result[0].data.thumbnail).toBe("thumb.jpg");
  });

  test("event keeps own thumbnail when set", () => {
    const events = [eventItem("summer-fest", { thumbnail: "event-thumb.jpg" })];
    const products = [productItem("product-1", ["summer-fest"], "product.jpg")];
    const result = getCollection({ events, products });
    expect(result[0].data.thumbnail).toBe("event-thumb.jpg");
  });

  test("selects thumbnail from lowest-order product", () => {
    const events = [eventItem("summer-fest")];
    const products = [
      productItem("product-1", ["summer-fest"], "high-order.jpg", 10),
      productItem("product-2", ["summer-fest"], "low-order.jpg", 1),
    ];
    const result = getCollection({ events, products });
    expect(result[0].data.thumbnail).toBe("low-order.jpg");
  });

  test("skips products without thumbnails", () => {
    const events = [eventItem("summer-fest")];
    const products = [
      productItem("product-1", ["summer-fest"], undefined, 1),
      productItem("product-2", ["summer-fest"], "has-thumb.jpg", 2),
    ];
    const result = getCollection({ events, products });
    expect(result[0].data.thumbnail).toBe("has-thumb.jpg");
  });

  test("handles multiple events with shared products", () => {
    const events = [eventItem("event-a"), eventItem("event-b")];
    const products = [
      productItem("product-1", ["event-a", "event-b"], "shared.jpg"),
    ];
    const result = getCollection({ events, products });
    expect(result[0].data.thumbnail).toBe("shared.jpg");
    expect(result[1].data.thumbnail).toBe("shared.jpg");
  });
});
