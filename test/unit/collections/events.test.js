import { describe, expect, test } from "bun:test";
import { configureEvents } from "#collections/events.js";
import { expectResultTitles, getCollectionFrom } from "#test/test-utils.js";
import {
  createEvent,
  createEvents,
  createOffsetDate,
  formatDateString,
} from "#test/unit/collections/events-utils.js";

// ============================================
// Collection helpers
// ============================================

const getCollection = getCollectionFrom("events")(configureEvents);
const getUpcoming = getCollectionFrom("upcomingEvents")(configureEvents);
const getPast = getCollectionFrom("pastEvents")(configureEvents);
const getRegular = getCollectionFrom("regularEvents")(configureEvents);
const getUndated = getCollectionFrom("undatedEvents")(configureEvents);
const getFeatured = getCollectionFrom("featuredEvents")(configureEvents);
const getRecurring = getCollectionFrom("recurringEvents")(configureEvents);

/** Shorthand: pass events through a category collection with no products. */
const fromEvents = (getter) => (events) => getter({ events, products: [] });

// ============================================
// Event categorisation (via collections)
// ============================================

describe("upcomingEvents collection", () => {
  test("includes future events", () => {
    const result = fromEvents(getUpcoming)([createEvent()]);
    expect(result).toHaveLength(1);
  });

  test("includes events happening today", () => {
    const result = fromEvents(getUpcoming)([
      createEvent({ name: "Today Event", date: new Date() }),
    ]);
    expect(result).toHaveLength(1);
  });

  test("excludes past events", () => {
    const result = fromEvents(getUpcoming)([createEvent({ daysOffset: -30 })]);
    expect(result).toHaveLength(0);
  });

  test("sorts by date (earliest first)", () => {
    const events = createEvents([
      { name: "Latest Event", daysOffset: 60 },
      { name: "Earliest Event", daysOffset: 30 },
      { name: "Middle Event", daysOffset: 45 },
    ]);
    expectResultTitles(fromEvents(getUpcoming)(events), [
      "Earliest Event",
      "Middle Event",
      "Latest Event",
    ]);
  });
});

describe("pastEvents collection", () => {
  test("includes past events", () => {
    const result = fromEvents(getPast)([createEvent({ daysOffset: -30 })]);
    expect(result).toHaveLength(1);
  });

  test("excludes future events", () => {
    const result = fromEvents(getPast)([createEvent()]);
    expect(result).toHaveLength(0);
  });

  test("sorts by date (most recent first)", () => {
    const events = createEvents([
      { name: "Oldest Event", daysOffset: -60 },
      { name: "Most Recent Event", daysOffset: -30 },
      { name: "Middle Event", daysOffset: -45 },
    ]);
    expectResultTitles(fromEvents(getPast)(events), [
      "Most Recent Event",
      "Middle Event",
      "Oldest Event",
    ]);
  });
});

describe("regularEvents collection", () => {
  test("includes recurring events", () => {
    const events = createEvents([
      { name: "Weekly Meeting", recurring: "Every Monday at 10 AM" },
      { name: "Monthly Review", recurring: "First Friday of each month" },
    ]);
    expect(fromEvents(getRegular)(events)).toHaveLength(2);
  });

  test("recurring takes precedence over event_date", () => {
    const events = [
      {
        data: {
          name: "Hybrid Event",
          recurring_date: "Every Friday",
          event_date: formatDateString(createOffsetDate()),
          order: 9999,
        },
      },
    ];
    const result = fromEvents(getRegular)(events);
    expect(result).toHaveLength(1);
    expectResultTitles(result, ["Hybrid Event"]);
  });

  test("sorts alphabetically by title", () => {
    const events = createEvents([
      { name: "Zumba Class", recurring: "Every Thursday" },
      { name: "Book Club", recurring: "First Wednesday" },
      { name: "Monthly Meeting", recurring: "Last Friday" },
    ]);
    expectResultTitles(fromEvents(getRegular)(events), [
      "Book Club",
      "Monthly Meeting",
      "Zumba Class",
    ]);
  });
});

describe("undatedEvents collection", () => {
  test("includes events without dates", () => {
    const events = createEvents([
      { name: "No Date Event 1", undated: true },
      { name: "No Date Event 2", undated: true },
    ]);
    expect(fromEvents(getUndated)(events)).toHaveLength(2);
  });

  test("sorts alphabetically by title", () => {
    const events = createEvents([
      { name: "Zulu Event", undated: true },
      { name: "Alpha Event", undated: true },
      { name: "Mike Event", undated: true },
    ]);
    expectResultTitles(fromEvents(getUndated)(events), [
      "Alpha Event",
      "Mike Event",
      "Zulu Event",
    ]);
  });
});

describe("event categories are mutually exclusive", () => {
  test("mixed events land in correct collections", () => {
    const events = createEvents([
      { name: "Future Event" },
      { name: "Past Event", daysOffset: -30 },
      { name: "Weekly Meeting", recurring: "Every Monday" },
      { name: "Undated Event", undated: true },
    ]);
    const tagMap = { events, products: [] };
    expect(getUpcoming(tagMap)).toHaveLength(1);
    expect(getPast(tagMap)).toHaveLength(1);
    expect(getRegular(tagMap)).toHaveLength(1);
    expect(getUndated(tagMap)).toHaveLength(1);
  });

  test("empty events produce empty collections", () => {
    const tagMap = { events: [], products: [] };
    expect(getUpcoming(tagMap)).toEqual([]);
    expect(getPast(tagMap)).toEqual([]);
    expect(getRegular(tagMap)).toEqual([]);
    expect(getUndated(tagMap)).toEqual([]);
  });
});

// ============================================
// Events Collection Tests
// ============================================

/** Helper to create event items with fileSlug */
const eventItem = (slug, data = {}) => ({
  fileSlug: slug,
  data: { name: `Event ${slug}`, ...data },
});

/** Helper to create product items with events array */
const productItem = (slug, events = [], thumbnail, order = 0) => ({
  fileSlug: slug,
  data: { events, thumbnail, order },
});

describe("events collection", () => {
  test("returns empty array when no events exist", () => {
    const result = getCollection({ events: [], products: [] });
    expect(result).toEqual([]);
  });

  test("preserves event data when no products match", () => {
    const events = [eventItem("summer-fest", { name: "Summer Festival" })];
    const result = getCollection({ events, products: [] });
    expect(result[0].data.name).toBe("Summer Festival");
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

describe("featuredEvents collection", () => {
  test("returns only featured events", () => {
    const events = [
      eventItem("featured-event", { name: "Featured", featured: true }),
      eventItem("normal-event", { name: "Normal" }),
    ];
    const result = getFeatured({ events, products: [] });
    expect(result).toHaveLength(1);
    expect(result[0].data.name).toBe("Featured");
  });

  test("returns empty when no featured events", () => {
    const events = [eventItem("normal-event", { name: "Normal" })];
    expect(getFeatured({ events, products: [] })).toHaveLength(0);
  });

  test("inherits thumbnails from products", () => {
    const events = [
      eventItem("featured-event", { name: "Featured", featured: true }),
    ];
    const products = [productItem("p1", ["featured-event"], "thumb.jpg")];
    const result = getFeatured({ events, products });
    expect(result).toHaveLength(1);
    expect(result[0].data.thumbnail).toBe("thumb.jpg");
  });
});

describe("recurringEvents collection", () => {
  test("returns only recurring events", () => {
    const events = [
      createEvent({ name: "Weekly Class", recurring_date: "Every Monday" }),
      createEvent({ name: "One-off Gig", event_date: createOffsetDate(5) }),
    ];
    const result = getRecurring({ events, products: [] });
    expect(result).toHaveLength(1);
    expectResultTitles(result, ["Weekly Class"]);
  });

  test("returns empty when no recurring events", () => {
    const events = [
      createEvent({ name: "One-off", event_date: createOffsetDate(5) }),
    ];
    expect(getRecurring({ events, products: [] })).toHaveLength(0);
  });
});
