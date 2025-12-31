import { eventIcal, isOneOffEvent } from "#eleventy/ical.js";
import {
  createTestRunner,
  expectFalse,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // eventIcal - returns null when no ical_url
  {
    name: "eventIcal-no-ical-url",
    description: "Returns null when event has no ical_url",
    test: () => {
      const event = {
        data: {
          title: "Test Event",
          event_date: "2025-06-15",
        },
        url: "/events/test/",
      };
      const result = eventIcal(event);
      expectStrictEqual(result, null, "Should return null when no ical_url");
    },
  },
  {
    name: "eventIcal-ical-url-undefined",
    description: "Returns null when ical_url is undefined",
    test: () => {
      const event = {
        data: {
          title: "Test Event",
          event_date: "2025-06-15",
          ical_url: undefined,
        },
        url: "/events/test/",
      };
      const result = eventIcal(event);
      expectStrictEqual(
        result,
        null,
        "Should return null when ical_url is undefined",
      );
    },
  },
  {
    name: "eventIcal-ical-url-empty",
    description: "Returns null when ical_url is empty string",
    test: () => {
      const event = {
        data: {
          title: "Test Event",
          event_date: "2025-06-15",
          ical_url: "",
        },
        url: "/events/test/",
      };
      const result = eventIcal(event);
      expectStrictEqual(
        result,
        null,
        "Should return null when ical_url is empty",
      );
    },
  },

  // eventIcal - generates valid iCal content
  {
    name: "eventIcal-generates-vcalendar",
    description: "Generates valid VCALENDAR content when ical_url exists",
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
    },
  },
  {
    name: "eventIcal-contains-vevent",
    description: "iCal content contains VEVENT block",
    test: () => {
      const event = {
        data: {
          title: "Test Event",
          event_date: "2025-07-01",
          ical_url: "/events/test/test.ics",
        },
        url: "/events/test/",
      };
      const result = eventIcal(event);
      expectTrue(
        result.includes("BEGIN:VEVENT"),
        "Should contain BEGIN:VEVENT",
      );
      expectTrue(result.includes("END:VEVENT"), "Should contain END:VEVENT");
    },
  },
  {
    name: "eventIcal-contains-summary",
    description: "iCal content contains event title as SUMMARY",
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
    name: "eventIcal-contains-location",
    description: "iCal content contains event location when provided",
    test: () => {
      const event = {
        data: {
          title: "Meetup",
          event_date: "2025-09-01",
          event_location: "City Hall",
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
    name: "eventIcal-no-location-when-not-provided",
    description: "iCal omits LOCATION when event_location not provided",
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
      expectTrue(
        !result.includes("LOCATION:"),
        "Should not have LOCATION field when not provided",
      );
    },
  },
  {
    name: "eventIcal-description-from-subtitle",
    description: "Uses subtitle as DESCRIPTION when provided",
    test: () => {
      const event = {
        data: {
          title: "Workshop",
          event_date: "2025-10-01",
          subtitle: "Learn new skills",
          ical_url: "/events/workshop/workshop.ics",
        },
        url: "/events/workshop/",
      };
      const result = eventIcal(event);
      expectTrue(
        result.includes("DESCRIPTION:Learn new skills"),
        "Should use subtitle as DESCRIPTION",
      );
    },
  },
  {
    name: "eventIcal-description-fallback-to-meta",
    description: "Falls back to meta_description when no subtitle",
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
        "Should use meta_description as DESCRIPTION",
      );
    },
  },
  {
    name: "eventIcal-empty-description-when-none",
    description: "Has empty DESCRIPTION when no subtitle or meta_description",
    test: () => {
      const event = {
        data: {
          title: "Simple Event",
          event_date: "2025-11-01",
          ical_url: "/events/simple/simple.ics",
        },
        url: "/events/simple/",
      };
      const result = eventIcal(event);
      expectTrue(
        result.includes("DESCRIPTION:"),
        "Should have DESCRIPTION field",
      );
    },
  },
  {
    name: "eventIcal-contains-url",
    description: "iCal content contains canonical URL",
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
      expectTrue(result.includes("URL;VALUE=URI:"), "Should contain URL field");
    },
  },
  {
    name: "eventIcal-contains-prodid",
    description: "iCal contains PRODID with site name",
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
    },
  },
  {
    name: "eventIcal-all-day-event",
    description: "iCal creates all-day event format",
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
      expectTrue(result.includes("DTSTART"), "Should contain DTSTART for date");
    },
  },

  // isOneOffEvent - tests the collection filter logic directly
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
];

export default createTestRunner("ical", testCases);
