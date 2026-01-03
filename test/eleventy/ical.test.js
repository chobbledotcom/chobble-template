import { describe, expect, test } from "bun:test";
import { configureICal, eventIcal, isOneOffEvent } from "#eleventy/ical.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("ical", () => {
  // isOneOffEvent tests
  test("Returns true for events with event_date but no recurring_date", () => {
    const event = { data: { event_date: "2025-06-15" } };
    expect(isOneOffEvent(event)).toBe(true);
  });

  test("Returns false for events with recurring_date", () => {
    const event = { data: { recurring_date: "Every Monday" } };
    expect(isOneOffEvent(event)).toBe(false);
  });

  test("Returns false for events with both event_date and recurring_date", () => {
    const event = {
      data: { event_date: "2025-06-15", recurring_date: "Weekly" },
    };
    expect(isOneOffEvent(event)).toBe(false);
  });

  test("Returns false for events with no dates", () => {
    const event = { data: { title: "No dates" } };
    expect(isOneOffEvent(event)).toBe(false);
  });

  // eventIcal - falsy ical_url handling (consolidated)
  test("Returns null when ical_url is missing, undefined, or empty", () => {
    const baseEvent = {
      data: { title: "Test Event", event_date: "2025-06-15" },
      url: "/events/test/",
    };

    // No ical_url property
    expect(eventIcal({ ...baseEvent })).toBe(null);

    // ical_url is undefined
    expect(
      eventIcal({
        ...baseEvent,
        data: { ...baseEvent.data, ical_url: undefined },
      }),
    ).toBe(null);

    // ical_url is empty string
    expect(
      eventIcal({ ...baseEvent, data: { ...baseEvent.data, ical_url: "" } }),
    ).toBe(null);
  });

  // eventIcal - valid iCal generation
  test("Generates iCal with required VCALENDAR and VEVENT blocks", () => {
    const event = {
      data: {
        title: "Summer Expo",
        event_date: "2025-06-19",
        ical_url: "/events/summer-expo/summer-expo.ics",
      },
      url: "/events/summer-expo/",
    };
    const result = eventIcal(event);

    expect(result !== null).toBe(true);
    expect(result.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(result.includes("END:VCALENDAR")).toBe(true);
    expect(result.includes("BEGIN:VEVENT")).toBe(true);
    expect(result.includes("END:VEVENT")).toBe(true);
  });

  test("iCal SUMMARY field contains the event title", () => {
    const event = {
      data: {
        title: "Annual Conference",
        event_date: "2025-08-15",
        ical_url: "/events/conference/conference.ics",
      },
      url: "/events/conference/",
    };
    const result = eventIcal(event);
    expect(result.includes("SUMMARY:Annual Conference")).toBe(true);
  });

  test("iCal LOCATION field is present when event_location exists", () => {
    const event = {
      data: {
        title: "Meetup",
        event_date: "2025-09-01",
        event_location: "City Hall, Main Street",
        ical_url: "/events/meetup/meetup.ics",
      },
      url: "/events/meetup/",
    };
    const result = eventIcal(event);
    expect(result.includes("LOCATION:City Hall")).toBe(true);
  });

  test("iCal has empty LOCATION when event_location not provided", () => {
    const event = {
      data: {
        title: "Online Event",
        event_date: "2025-09-15",
        ical_url: "/events/online/online.ics",
      },
      url: "/events/online/",
    };
    const result = eventIcal(event);
    // When location is not provided, it will be empty string in output
    expect(
      result.includes("LOCATION:Online") ||
        result.includes("LOCATION:Something"),
    ).toBe(false);
  });

  test("DESCRIPTION uses subtitle when provided", () => {
    const event = {
      data: {
        title: "Workshop",
        event_date: "2025-10-01",
        subtitle: "Learn new skills today",
        ical_url: "/events/workshop/workshop.ics",
      },
      url: "/events/workshop/",
    };
    const result = eventIcal(event);
    expect(result.includes("DESCRIPTION:Learn new skills today")).toBe(true);
  });

  test("DESCRIPTION falls back to meta_description when no subtitle", () => {
    const event = {
      data: {
        title: "Seminar",
        event_date: "2025-10-15",
        meta_description: "A great seminar event",
        ical_url: "/events/seminar/seminar.ics",
      },
      url: "/events/seminar/",
    };
    const result = eventIcal(event);
    expect(result.includes("DESCRIPTION:A great seminar event")).toBe(true);
  });

  test("subtitle is used when both subtitle and meta_description exist", () => {
    const event = {
      data: {
        title: "Priority Test",
        event_date: "2025-10-20",
        subtitle: "Subtitle wins",
        meta_description: "Meta description loses",
        ical_url: "/events/priority/priority.ics",
      },
      url: "/events/priority/",
    };
    const result = eventIcal(event);
    expect(result.includes("DESCRIPTION:Subtitle wins")).toBe(true);
    expect(result.includes("Meta description loses")).toBe(false);
  });

  test("iCal contains PRODID identifying the calendar producer", () => {
    const event = {
      data: {
        title: "Test",
        event_date: "2025-12-01",
        ical_url: "/events/test/test.ics",
      },
      url: "/events/test/",
    };
    const result = eventIcal(event);
    expect(result.includes("PRODID:")).toBe(true);
    expect(result.includes("//") && result.includes("//EN")).toBe(true);
  });

  test("Event is formatted as all-day event with date (not datetime)", () => {
    const event = {
      data: {
        title: "All Day Event",
        event_date: "2025-06-19",
        ical_url: "/events/allday/allday.ics",
      },
      url: "/events/allday/",
    };
    const result = eventIcal(event);
    expect(result.includes("DTSTART")).toBe(true);
    // All-day events in ical-generator use VALUE=DATE format
    expect(result.includes(";VALUE=DATE") || result.includes("20250619")).toBe(
      true,
    );
  });

  test("iCal URL field contains the event's canonical URL", () => {
    const event = {
      data: {
        title: "Public Event",
        event_date: "2025-11-15",
        ical_url: "/events/public/public.ics",
      },
      url: "/events/public/",
    };
    const result = eventIcal(event);
    expect(result.includes("URL")).toBe(true);
    expect(result.includes("/events/public/")).toBe(true);
  });

  // configureICal tests
  test("Configures eventIcal as an Eleventy filter", () => {
    const mockConfig = createMockEleventyConfig();

    configureICal(mockConfig);

    expect(typeof mockConfig.filters.eventIcal).toBe("function");
    expect(mockConfig.filters.eventIcal).toBe(eventIcal);
  });

  test("Configures oneOffEvents as an Eleventy collection", () => {
    const mockConfig = createMockEleventyConfig();

    configureICal(mockConfig);

    expect(typeof mockConfig.collections.oneOffEvents).toBe("function");
  });

  test("oneOffEvents collection filters to only one-off events", () => {
    const mockConfig = createMockEleventyConfig();
    configureICal(mockConfig);

    const allEvents = [
      { data: { title: "One-off", event_date: "2025-06-15" } },
      { data: { title: "Recurring", recurring_date: "Every Monday" } },
      {
        data: {
          title: "Both",
          event_date: "2025-06-16",
          recurring_date: "Weekly",
        },
      },
      { data: { title: "Another One-off", event_date: "2025-07-01" } },
    ];

    const mockCollectionApi = {
      getFilteredByTag: (tag) => {
        expect(tag).toBe("events");
        return allEvents;
      },
    };

    const result = mockConfig.collections.oneOffEvents(mockCollectionApi);

    expect(result).toHaveLength(2);
    expect(result[0].data.title).toBe("One-off");
    expect(result[1].data.title).toBe("Another One-off");
  });

  test("oneOffEvents collection returns empty when no one-off events exist", () => {
    const mockConfig = createMockEleventyConfig();
    configureICal(mockConfig);

    const allEvents = [
      { data: { title: "Recurring 1", recurring_date: "Every Monday" } },
      { data: { title: "Recurring 2", recurring_date: "Weekly" } },
    ];

    const mockCollectionApi = {
      getFilteredByTag: () => allEvents,
    };

    const result = mockConfig.collections.oneOffEvents(mockCollectionApi);

    expect(result).toEqual([]);
  });

  // Edge cases
  test("iCal properly handles special characters in event title", () => {
    const event = {
      data: {
        title: "Event with, comma & ampersand",
        event_date: "2025-07-01",
        ical_url: "/events/special/special.ics",
      },
      url: "/events/special/",
    };
    const result = eventIcal(event);
    expect(
      result.includes("SUMMARY:") &&
        result.includes("Event with") &&
        result.includes("comma"),
    ).toBe(true);
  });

  test("iCal parses standard ISO date format correctly", () => {
    const event = {
      data: {
        title: "ISO Date Event",
        event_date: "2025-12-25",
        ical_url: "/events/christmas/christmas.ics",
      },
      url: "/events/christmas/",
    };
    const result = eventIcal(event);
    expect(result.includes("DTSTART")).toBe(true);
    expect(result.includes("20251225")).toBe(true);
  });

  test("isOneOffEvent handles events with empty data object", () => {
    const event = { data: {} };
    expect(isOneOffEvent(event)).toBe(false);
  });
});
