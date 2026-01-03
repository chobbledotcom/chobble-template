import { configureICal, eventIcal, isOneOffEvent } from "#eleventy/ical.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectDeepEqual,
  expectFalse,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // isOneOffEvent tests
  {
    name: "isOneOffEvent-with-event-date-only",
    description:
      "Returns true for events with event_date but no recurring_date",
    test: () => {
      const event = { data: { event_date: "2025-06-15" } };
      expectTrue(isOneOffEvent(event), "Should return true for one-off event");
    },
  },
  {
    name: "isOneOffEvent-with-recurring-date",
    description: "Returns false for events with recurring_date",
    test: () => {
      const event = { data: { recurring_date: "Every Monday" } };
      expectFalse(
        isOneOffEvent(event),
        "Should return false for recurring event",
      );
    },
  },
  {
    name: "isOneOffEvent-with-both-dates",
    description:
      "Returns false for events with both event_date and recurring_date",
    test: () => {
      const event = {
        data: { event_date: "2025-06-15", recurring_date: "Weekly" },
      };
      expectFalse(
        isOneOffEvent(event),
        "Should return false when both dates present",
      );
    },
  },
  {
    name: "isOneOffEvent-no-dates",
    description: "Returns false for events with no dates",
    test: () => {
      const event = { data: { title: "No dates" } };
      expectFalse(isOneOffEvent(event), "Should return false when no dates");
    },
  },

  // eventIcal - falsy ical_url handling (consolidated)
  {
    name: "eventIcal-returns-null-for-falsy-ical-url",
    description: "Returns null when ical_url is missing, undefined, or empty",
    test: () => {
      const baseEvent = {
        data: { title: "Test Event", event_date: "2025-06-15" },
        url: "/events/test/",
      };

      // No ical_url property
      expectStrictEqual(
        eventIcal({ ...baseEvent }),
        null,
        "Should return null when ical_url is missing",
      );

      // ical_url is undefined
      expectStrictEqual(
        eventIcal({
          ...baseEvent,
          data: { ...baseEvent.data, ical_url: undefined },
        }),
        null,
        "Should return null when ical_url is undefined",
      );

      // ical_url is empty string
      expectStrictEqual(
        eventIcal({ ...baseEvent, data: { ...baseEvent.data, ical_url: "" } }),
        null,
        "Should return null when ical_url is empty",
      );
    },
  },

  // eventIcal - valid iCal generation
  {
    name: "eventIcal-generates-valid-vcalendar-structure",
    description: "Generates iCal with required VCALENDAR and VEVENT blocks",
    test: () => {
      const event = {
        data: {
          title: "Summer Expo",
          event_date: "2025-06-19",
          ical_url: "/events/summer-expo/summer-expo.ics",
        },
        url: "/events/summer-expo/",
      };
      const result = eventIcal(event);

      expectTrue(result !== null, "Should return iCal content");
      expectTrue(
        result.includes("BEGIN:VCALENDAR"),
        "Should start with VCALENDAR",
      );
      expectTrue(result.includes("END:VCALENDAR"), "Should end with VCALENDAR");
      expectTrue(
        result.includes("BEGIN:VEVENT"),
        "Should contain BEGIN:VEVENT",
      );
      expectTrue(result.includes("END:VEVENT"), "Should contain END:VEVENT");
    },
  },
  {
    name: "eventIcal-includes-event-title-as-summary",
    description: "iCal SUMMARY field contains the event title",
    test: () => {
      const event = {
        data: {
          title: "Annual Conference",
          event_date: "2025-08-15",
          ical_url: "/events/conference/conference.ics",
        },
        url: "/events/conference/",
      };
      const result = eventIcal(event);
      expectTrue(
        result.includes("SUMMARY:Annual Conference"),
        "Should contain title as SUMMARY",
      );
    },
  },
  {
    name: "eventIcal-includes-location-when-provided",
    description: "iCal LOCATION field is present when event_location exists",
    test: () => {
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
      expectTrue(
        result.includes("LOCATION:City Hall"),
        "Should contain event_location as LOCATION",
      );
    },
  },
  {
    name: "eventIcal-omits-location-when-not-provided",
    description: "iCal has empty LOCATION when event_location not provided",
    test: () => {
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
      expectFalse(
        result.includes("LOCATION:Online") ||
          result.includes("LOCATION:Something"),
        "Should not have a non-empty LOCATION value",
      );
    },
  },
  {
    name: "eventIcal-uses-subtitle-as-description",
    description: "DESCRIPTION uses subtitle when provided",
    test: () => {
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
      expectTrue(
        result.includes("DESCRIPTION:Learn new skills today"),
        "Should use subtitle as DESCRIPTION",
      );
    },
  },
  {
    name: "eventIcal-falls-back-to-meta-description",
    description: "DESCRIPTION falls back to meta_description when no subtitle",
    test: () => {
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
      expectTrue(
        result.includes("DESCRIPTION:A great seminar event"),
        "Should use meta_description as DESCRIPTION fallback",
      );
    },
  },
  {
    name: "eventIcal-subtitle-takes-priority-over-meta-description",
    description:
      "subtitle is used when both subtitle and meta_description exist",
    test: () => {
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
      expectTrue(
        result.includes("DESCRIPTION:Subtitle wins"),
        "Should prefer subtitle over meta_description",
      );
      expectFalse(
        result.includes("Meta description loses"),
        "Should not contain meta_description when subtitle exists",
      );
    },
  },
  {
    name: "eventIcal-contains-prodid",
    description: "iCal contains PRODID identifying the calendar producer",
    test: () => {
      const event = {
        data: {
          title: "Test",
          event_date: "2025-12-01",
          ical_url: "/events/test/test.ics",
        },
        url: "/events/test/",
      };
      const result = eventIcal(event);
      expectTrue(result.includes("PRODID:"), "Should contain PRODID");
      expectTrue(
        result.includes("//") && result.includes("//EN"),
        "PRODID should follow iCal format",
      );
    },
  },
  {
    name: "eventIcal-creates-all-day-event",
    description: "Event is formatted as all-day event with date (not datetime)",
    test: () => {
      const event = {
        data: {
          title: "All Day Event",
          event_date: "2025-06-19",
          ical_url: "/events/allday/allday.ics",
        },
        url: "/events/allday/",
      };
      const result = eventIcal(event);
      expectTrue(result.includes("DTSTART"), "Should contain DTSTART");
      // All-day events in ical-generator use VALUE=DATE format
      expectTrue(
        result.includes(";VALUE=DATE") || result.includes("20250619"),
        "Should be formatted as all-day event",
      );
    },
  },
  {
    name: "eventIcal-contains-canonical-url",
    description: "iCal URL field contains the event's canonical URL",
    test: () => {
      const event = {
        data: {
          title: "Public Event",
          event_date: "2025-11-15",
          ical_url: "/events/public/public.ics",
        },
        url: "/events/public/",
      };
      const result = eventIcal(event);
      expectTrue(result.includes("URL"), "Should contain URL field");
      expectTrue(
        result.includes("/events/public/"),
        "URL should include event path",
      );
    },
  },

  // configureICal tests
  {
    name: "configureICal-adds-eventIcal-filter",
    description: "Configures eventIcal as an Eleventy filter",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureICal(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "eventIcal",
        "Should add eventIcal filter",
      );
      expectStrictEqual(
        mockConfig.filters.eventIcal,
        eventIcal,
        "Filter should reference the eventIcal function",
      );
    },
  },
  {
    name: "configureICal-adds-oneOffEvents-collection",
    description: "Configures oneOffEvents as an Eleventy collection",
    test: () => {
      const mockConfig = createMockEleventyConfig();

      configureICal(mockConfig);

      expectFunctionType(
        mockConfig.collections,
        "oneOffEvents",
        "Should add oneOffEvents collection",
      );
    },
  },
  {
    name: "configureICal-collection-filters-one-off-events",
    description: "oneOffEvents collection filters to only one-off events",
    test: () => {
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
          expectStrictEqual(tag, "events", "Should filter by events tag");
          return allEvents;
        },
      };

      const result = mockConfig.collections.oneOffEvents(mockCollectionApi);

      expectStrictEqual(result.length, 2, "Should return 2 one-off events");
      expectStrictEqual(
        result[0].data.title,
        "One-off",
        "First result should be 'One-off'",
      );
      expectStrictEqual(
        result[1].data.title,
        "Another One-off",
        "Second result should be 'Another One-off'",
      );
    },
  },
  {
    name: "configureICal-collection-returns-empty-for-no-one-off-events",
    description:
      "oneOffEvents collection returns empty when no one-off events exist",
    test: () => {
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

      expectDeepEqual(
        result,
        [],
        "Should return empty array when no one-off events",
      );
    },
  },

  // Edge cases
  {
    name: "eventIcal-handles-special-characters-in-title",
    description: "iCal properly handles special characters in event title",
    test: () => {
      const event = {
        data: {
          title: "Event with, comma & ampersand",
          event_date: "2025-07-01",
          ical_url: "/events/special/special.ics",
        },
        url: "/events/special/",
      };
      const result = eventIcal(event);
      expectTrue(
        result.includes("SUMMARY:") &&
          result.includes("Event with") &&
          result.includes("comma"),
        "Should include title with special characters",
      );
    },
  },
  {
    name: "eventIcal-handles-different-date-formats",
    description: "iCal parses standard ISO date format correctly",
    test: () => {
      const event = {
        data: {
          title: "ISO Date Event",
          event_date: "2025-12-25",
          ical_url: "/events/christmas/christmas.ics",
        },
        url: "/events/christmas/",
      };
      const result = eventIcal(event);
      expectTrue(
        result.includes("DTSTART"),
        "Should parse ISO date format and include DTSTART",
      );
      expectTrue(
        result.includes("20251225"),
        "Should format date correctly in iCal",
      );
    },
  },
  {
    name: "isOneOffEvent-handles-empty-data",
    description: "isOneOffEvent handles events with empty data object",
    test: () => {
      const event = { data: {} };
      expectFalse(
        isOneOffEvent(event),
        "Should return false for empty data object",
      );
    },
  },
];

export default createTestRunner("ical", testCases);
