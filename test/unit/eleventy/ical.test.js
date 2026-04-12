import { describe, expect, test } from "bun:test";
import { configureICal } from "#eleventy/ical.js";
import {
  collectionApi,
  data,
  expectResultTitles,
  withConfiguredMock,
} from "#test/test-utils.js";

/** iCal event factory matching EventCollectionItem shape */
const icalEvent = (title, eventDate, icalUrl, url, extra = {}) => ({
  data: {
    title,
    event_date: eventDate,
    ...(icalUrl && { ical_url: icalUrl }),
    ...extra,
  },
  url,
});

/** Event for oneOffEvents collection tests */
const eventItem = data({})("title", "event_date", "recurring_date");

// =============================================================================
// eventIcal filter
// =============================================================================

describe("eventIcal filter", () => {
  const { filters } = withConfiguredMock(configureICal)();
  const eventIcal = filters.eventIcal;

  test("returns null when ical_url is falsy", () => {
    const noUrl = icalEvent("Test", "2025-06-15", null, "/events/test/");
    expect(eventIcal(noUrl)).toBe(null);

    const emptyUrl = icalEvent("Test", "2025-06-15", "", "/events/test/");
    expect(eventIcal(emptyUrl)).toBe(null);
  });

  test("produces valid VCALENDAR wrapping a VEVENT", () => {
    const result = eventIcal(
      icalEvent("Expo", "2025-06-19", "/events/expo/expo.ics", "/events/expo/"),
    );

    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("BEGIN:VEVENT");
    expect(result).toContain("END:VEVENT");
    expect(result).toContain("END:VCALENDAR");
  });

  test("sets SUMMARY to the event title", () => {
    const result = eventIcal(
      icalEvent(
        "Annual Conference",
        "2025-08-15",
        "/events/conf/conf.ics",
        "/events/conf/",
      ),
    );

    expect(result).toContain("SUMMARY:Annual Conference");
  });

  test("includes LOCATION when event_location is provided", () => {
    const result = eventIcal(
      icalEvent("Meetup", "2025-09-01", "/events/m/m.ics", "/events/m/", {
        event_location: "City Hall",
      }),
    );

    expect(result).toContain("LOCATION:City Hall");
  });

  test("omits LOCATION line entirely when event_location is absent", () => {
    const result = eventIcal(
      icalEvent(
        "Online Event",
        "2025-09-15",
        "/events/online/online.ics",
        "/events/online/",
      ),
    );

    expect(result).not.toContain("LOCATION:");
  });

  test("uses subtitle for DESCRIPTION when provided", () => {
    const result = eventIcal(
      icalEvent("Workshop", "2025-10-01", "/events/w/w.ics", "/events/w/", {
        subtitle: "Learn new skills",
      }),
    );

    expect(result).toContain("DESCRIPTION:Learn new skills");
  });

  test("falls back to meta_description when subtitle is absent", () => {
    const result = eventIcal(
      icalEvent("Seminar", "2025-10-15", "/events/s/s.ics", "/events/s/", {
        meta_description: "A great seminar",
      }),
    );

    expect(result).toContain("DESCRIPTION:A great seminar");
  });

  test("prefers subtitle over meta_description", () => {
    const result = eventIcal(
      icalEvent("Priority", "2025-10-20", "/events/p/p.ics", "/events/p/", {
        subtitle: "Subtitle wins",
        meta_description: "Meta loses",
      }),
    );

    expect(result).toContain("DESCRIPTION:Subtitle wins");
    expect(result).not.toContain("Meta loses");
  });

  test("formats as all-day event with VALUE=DATE", () => {
    const result = eventIcal(
      icalEvent(
        "All Day",
        "2025-06-19",
        "/events/allday/allday.ics",
        "/events/allday/",
      ),
    );

    expect(result).toContain("DTSTART;VALUE=DATE:20250619");
  });

  test("includes the event URL as a URI value", () => {
    const result = eventIcal(
      icalEvent(
        "Public Event",
        "2025-11-15",
        "/events/public/public.ics",
        "/events/public/",
      ),
    );

    expect(result).toContain("URL;VALUE=URI:");
    expect(result).toContain("/events/public/");
  });

  test("handles special characters in title", () => {
    const result = eventIcal(
      icalEvent(
        "Event with, comma & ampersand",
        "2025-07-01",
        "/events/special/special.ics",
        "/events/special/",
      ),
    );

    expect(result).toContain("comma");
    expect(result).toContain("ampersand");
  });
});

// =============================================================================
// oneOffEvents collection
// =============================================================================

describe("oneOffEvents collection", () => {
  const { collections } = withConfiguredMock(configureICal)();
  const oneOffEvents = collections.oneOffEvents;

  test("includes events with event_date and no recurring_date", () => {
    const events = eventItem(
      ["One-off", "2025-06-15", undefined],
      ["Another One-off", "2025-07-01", undefined],
    );

    const result = oneOffEvents(collectionApi(events));
    expectResultTitles(result, ["One-off", "Another One-off"]);
  });

  test("excludes recurring events", () => {
    const events = eventItem(
      ["One-off", "2025-06-15", undefined],
      ["Recurring", undefined, "Every Monday"],
      ["Both dates", "2025-06-16", "Weekly"],
    );

    const result = oneOffEvents(collectionApi(events));
    expectResultTitles(result, ["One-off"]);
  });

  test("excludes events with no dates at all", () => {
    const events = eventItem(
      ["Has date", "2025-06-15", undefined],
      ["No dates", undefined, undefined],
    );

    const result = oneOffEvents(collectionApi(events));
    expectResultTitles(result, ["Has date"]);
  });

  test("returns empty array when no one-off events exist", () => {
    const events = eventItem(["Recurring", undefined, "Every Monday"]);

    const result = oneOffEvents(collectionApi(events));
    expect(result).toEqual([]);
  });
});
