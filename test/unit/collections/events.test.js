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
      createEvent({ title: "Today Event", date: new Date() }),
    ]);
    expect(result).toHaveLength(1);
  });

  test("excludes past events", () => {
    const result = fromEvents(getUpcoming)([createEvent({ daysOffset: -30 })]);
    expect(result).toHaveLength(0);
  });

  test("sorts by date (earliest first)", () => {
    const events = createEvents([
      { title: "Latest Event", daysOffset: 60 },
      { title: "Earliest Event", daysOffset: 30 },
      { title: "Middle Event", daysOffset: 45 },
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
      { title: "Oldest Event", daysOffset: -60 },
      { title: "Most Recent Event", daysOffset: -30 },
      { title: "Middle Event", daysOffset: -45 },
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
      { title: "Weekly Meeting", recurring: "Every Monday at 10 AM" },
      { title: "Monthly Review", recurring: "First Friday of each month" },
    ]);
    expect(fromEvents(getRegular)(events)).toHaveLength(2);
  });

  test("recurring takes precedence over event_date", () => {
    const events = [
      {
        data: {
          title: "Hybrid Event",
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
      { title: "Zumba Class", recurring: "Every Thursday" },
      { title: "Book Club", recurring: "First Wednesday" },
      { title: "Monthly Meeting", recurring: "Last Friday" },
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
      { title: "No Date Event 1", undated: true },
      { title: "No Date Event 2", undated: true },
    ]);
    expect(fromEvents(getUndated)(events)).toHaveLength(2);
  });

  test("sorts alphabetically by title", () => {
    const events = createEvents([
      { title: "Zulu Event", undated: true },
      { title: "Alpha Event", undated: true },
      { title: "Mike Event", undated: true },
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
      { title: "Future Event" },
      { title: "Past Event", daysOffset: -30 },
      { title: "Weekly Meeting", recurring: "Every Monday" },
      { title: "Undated Event", undated: true },
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
  data: { title: `Event ${slug}`, ...data },
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

describe("featuredEvents collection", () => {
  test("returns only featured events", () => {
    const events = [
      eventItem("featured-event", { title: "Featured", featured: true }),
      eventItem("normal-event", { title: "Normal" }),
    ];
    const result = getFeatured({ events, products: [] });
    expect(result).toHaveLength(1);
    expect(result[0].data.title).toBe("Featured");
  });

  test("returns empty when no featured events", () => {
    const events = [eventItem("normal-event", { title: "Normal" })];
    expect(getFeatured({ events, products: [] })).toHaveLength(0);
  });

  test("inherits thumbnails from products", () => {
    const events = [
      eventItem("featured-event", { title: "Featured", featured: true }),
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
      createEvent({ title: "Weekly Class", recurring_date: "Every Monday" }),
      createEvent({ title: "One-off Gig", event_date: createOffsetDate(5) }),
    ];
    const result = getRecurring({ events, products: [] });
    expect(result).toHaveLength(1);
    expectResultTitles(result, ["Weekly Class"]);
  });

  test("returns empty when no recurring events", () => {
    const events = [
      createEvent({ title: "One-off", event_date: createOffsetDate(5) }),
    ];
    expect(getRecurring({ events, products: [] })).toHaveLength(0);
  });
});
