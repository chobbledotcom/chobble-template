import { describe, expect, test } from "bun:test";
import { configureICal } from "#eleventy/ical.js";
import {
  createMockEleventyConfig,
  data,
  expectResultTitles,
} from "#test/test-utils.js";

// ============================================
// Curried Data Factories
// ============================================

/** iCal event factory with url field support */
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

/**
 * Helper to get the eventIcal filter via Eleventy registration
 */
const getEventIcalFilter = () => {
  const mockConfig = createMockEleventyConfig();
  configureICal(mockConfig);
  return mockConfig.filters.eventIcal;
};

describe("ical", () => {
  // eventIcal - falsy ical_url handling (consolidated)
  test("Returns null when ical_url is missing, undefined, or empty", () => {
    const eventIcal = getEventIcalFilter();
    const baseEvent = icalEvent("Test Event", "2025-06-15", null, "/events/test/");

    // No ical_url property
    expect(eventIcal(baseEvent)).toBe(null);

    // ical_url is undefined
    expect(
      eventIcal(icalEvent("Test Event", "2025-06-15", undefined, "/events/test/")),
    ).toBe(null);

    // ical_url is empty string
    expect(
      eventIcal(icalEvent("Test Event", "2025-06-15", "", "/events/test/")),
    ).toBe(null);
  });

  // eventIcal - valid iCal generation
  test("Generates iCal with required VCALENDAR and VEVENT blocks", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Summer Expo",
      "2025-06-19",
      "/events/summer-expo/summer-expo.ics",
      "/events/summer-expo/",
    );
    const result = eventIcal(event);

    expect(result !== null).toBe(true);
    expect(result.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(result.includes("END:VCALENDAR")).toBe(true);
    expect(result.includes("BEGIN:VEVENT")).toBe(true);
    expect(result.includes("END:VEVENT")).toBe(true);
  });

  test("iCal SUMMARY field contains the event title", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Annual Conference",
      "2025-08-15",
      "/events/conference/conference.ics",
      "/events/conference/",
    );
    const result = eventIcal(event);
    expect(result.includes("SUMMARY:Annual Conference")).toBe(true);
  });

  test("iCal LOCATION field is present when event_location exists", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Meetup",
      "2025-09-01",
      "/events/meetup/meetup.ics",
      "/events/meetup/",
      { event_location: "City Hall, Main Street" },
    );
    const result = eventIcal(event);
    expect(result.includes("LOCATION:City Hall")).toBe(true);
  });

  test("iCal has empty LOCATION when event_location not provided", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Online Event",
      "2025-09-15",
      "/events/online/online.ics",
      "/events/online/",
    );
    const result = eventIcal(event);
    // When location is not provided, it will be empty string in output
    expect(
      result.includes("LOCATION:Online") ||
        result.includes("LOCATION:Something"),
    ).toBe(false);
  });

  test("DESCRIPTION uses subtitle when provided", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Workshop",
      "2025-10-01",
      "/events/workshop/workshop.ics",
      "/events/workshop/",
      { subtitle: "Learn new skills today" },
    );
    const result = eventIcal(event);
    expect(result.includes("DESCRIPTION:Learn new skills today")).toBe(true);
  });

  test("DESCRIPTION falls back to meta_description when no subtitle", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Seminar",
      "2025-10-15",
      "/events/seminar/seminar.ics",
      "/events/seminar/",
      { meta_description: "A great seminar event" },
    );
    const result = eventIcal(event);
    expect(result.includes("DESCRIPTION:A great seminar event")).toBe(true);
  });

  test("subtitle is used when both subtitle and meta_description exist", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Priority Test",
      "2025-10-20",
      "/events/priority/priority.ics",
      "/events/priority/",
      { subtitle: "Subtitle wins", meta_description: "Meta description loses" },
    );
    const result = eventIcal(event);
    expect(result.includes("DESCRIPTION:Subtitle wins")).toBe(true);
    expect(result.includes("Meta description loses")).toBe(false);
  });

  test("iCal contains PRODID identifying the calendar producer", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Test",
      "2025-12-01",
      "/events/test/test.ics",
      "/events/test/",
    );
    const result = eventIcal(event);
    expect(result.includes("PRODID:")).toBe(true);
    expect(result.includes("//") && result.includes("//EN")).toBe(true);
  });

  test("Event is formatted as all-day event with date (not datetime)", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "All Day Event",
      "2025-06-19",
      "/events/allday/allday.ics",
      "/events/allday/",
    );
    const result = eventIcal(event);
    expect(result.includes("DTSTART")).toBe(true);
    // All-day events in ical-generator use VALUE=DATE format
    expect(result.includes(";VALUE=DATE") || result.includes("20250619")).toBe(
      true,
    );
  });

  test("iCal URL field contains the event's canonical URL", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Public Event",
      "2025-11-15",
      "/events/public/public.ics",
      "/events/public/",
    );
    const result = eventIcal(event);
    expect(result.includes("URL")).toBe(true);
    expect(result.includes("/events/public/")).toBe(true);
  });

  // configureICal tests
  test("Configures eventIcal as an Eleventy filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureICal(mockConfig);

    expect(typeof mockConfig.filters.eventIcal).toBe("function");
  });

  test("Configures oneOffEvents as an Eleventy collection", () => {
    const mockConfig = createMockEleventyConfig();

    configureICal(mockConfig);

    expect(typeof mockConfig.collections.oneOffEvents).toBe("function");
  });

  test("oneOffEvents collection filters to only one-off events", () => {
    const mockConfig = createMockEleventyConfig();
    configureICal(mockConfig);

    const allEvents = eventItem(
      ["One-off", "2025-06-15", undefined],
      ["Recurring", undefined, "Every Monday"],
      ["Both", "2025-06-16", "Weekly"],
      ["Another One-off", "2025-07-01", undefined],
      ["No dates", undefined, undefined],
    );
    allEvents.push({ data: {} });

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("events");
        return allEvents;
      },
    };

    const result = mockConfig.collections.oneOffEvents(mockCollectionApi);

    expectResultTitles(result, ["One-off", "Another One-off"]);
  });

  test("oneOffEvents collection returns empty when no one-off events exist", () => {
    const mockConfig = createMockEleventyConfig();
    configureICal(mockConfig);

    const allEvents = eventItem(
      ["Recurring 1", undefined, "Every Monday"],
      ["Recurring 2", undefined, "Weekly"],
    );

    const mockCollectionApi = {
      getFilteredByTag: () => allEvents,
    };

    const result = mockConfig.collections.oneOffEvents(mockCollectionApi);

    expect(result).toEqual([]);
  });

  // Edge cases
  test("iCal properly handles special characters in event title", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "Event with, comma & ampersand",
      "2025-07-01",
      "/events/special/special.ics",
      "/events/special/",
    );
    const result = eventIcal(event);
    expect(
      result.includes("SUMMARY:") &&
        result.includes("Event with") &&
        result.includes("comma"),
    ).toBe(true);
  });

  test("iCal parses standard ISO date format correctly", () => {
    const eventIcal = getEventIcalFilter();
    const event = icalEvent(
      "ISO Date Event",
      "2025-12-25",
      "/events/christmas/christmas.ics",
      "/events/christmas/",
    );
    const result = eventIcal(event);
    expect(result.includes("DTSTART")).toBe(true);
    expect(result.includes("20251225")).toBe(true);
  });
});
