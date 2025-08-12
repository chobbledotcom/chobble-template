const assert = require('assert');
const { createTestRunner } = require('./test-utils');

const { categorizeEvents } = require('../src/_lib/events');

const testCases = [
  {
    name: 'categorizeEvents-empty-array',
    description: 'Handles empty events array',
    test: () => {
      const result = categorizeEvents([]);
      
      assert.deepStrictEqual(result, {
        upcoming: [],
        past: [],
        regular: [],
        hasOnlyRegular: false
      }, "Should return empty arrays for empty input");
    }
  },
  {
    name: 'categorizeEvents-upcoming-only',
    description: 'Categorizes future events as upcoming',
    test: () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const events = [
        {
          data: {
            title: 'Future Event',
            event_date: futureDate.toISOString().split('T')[0]
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming.length, 1, "Should have one upcoming event");
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(result.regular.length, 0, "Should have no regular events");
      assert.strictEqual(result.hasOnlyRegular, false, "hasOnlyRegular should be false");
    }
  },
  {
    name: 'categorizeEvents-past-only',
    description: 'Categorizes past events correctly',
    test: () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const events = [
        {
          data: {
            title: 'Past Event',
            event_date: pastDate.toISOString().split('T')[0]
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming.length, 0, "Should have no upcoming events");
      assert.strictEqual(result.past.length, 1, "Should have one past event");
      assert.strictEqual(result.regular.length, 0, "Should have no regular events");
      assert.strictEqual(result.hasOnlyRegular, false, "hasOnlyRegular should be false");
    }
  },
  {
    name: 'categorizeEvents-today-as-upcoming',
    description: 'Events today are categorized as upcoming',
    test: () => {
      const today = new Date();
      
      const events = [
        {
          data: {
            title: 'Today Event',
            event_date: today.toISOString().split('T')[0]
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming.length, 1, "Today's event should be upcoming");
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(result.regular.length, 0, "Should have no regular events");
    }
  },
  {
    name: 'categorizeEvents-recurring-only',
    description: 'Categorizes recurring events correctly',
    test: () => {
      const events = [
        {
          data: {
            title: 'Weekly Meeting',
            recurring_date: 'Every Monday at 10 AM'
          }
        },
        {
          data: {
            title: 'Monthly Review',
            recurring_date: 'First Friday of each month'
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming.length, 0, "Should have no upcoming events");
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(result.regular.length, 2, "Should have two regular events");
      assert.strictEqual(result.hasOnlyRegular, true, "hasOnlyRegular should be true");
    }
  },
  {
    name: 'categorizeEvents-mixed-events',
    description: 'Handles mix of upcoming, past, and recurring events',
    test: () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const events = [
        {
          data: {
            title: 'Future Event',
            event_date: futureDate.toISOString().split('T')[0]
          }
        },
        {
          data: {
            title: 'Past Event',
            event_date: pastDate.toISOString().split('T')[0]
          }
        },
        {
          data: {
            title: 'Weekly Meeting',
            recurring_date: 'Every Monday'
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming.length, 1, "Should have one upcoming event");
      assert.strictEqual(result.past.length, 1, "Should have one past event");
      assert.strictEqual(result.regular.length, 1, "Should have one regular event");
      assert.strictEqual(result.hasOnlyRegular, false, "hasOnlyRegular should be false");
    }
  },
  {
    name: 'categorizeEvents-upcoming-sort-order',
    description: 'Sorts upcoming events by date (earliest first)',
    test: () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() + 60);
      
      const date2 = new Date();
      date2.setDate(date2.getDate() + 30);
      
      const date3 = new Date();
      date3.setDate(date3.getDate() + 45);
      
      const events = [
        {
          data: {
            title: 'Latest Event',
            event_date: date1.toISOString().split('T')[0]
          }
        },
        {
          data: {
            title: 'Earliest Event',
            event_date: date2.toISOString().split('T')[0]
          }
        },
        {
          data: {
            title: 'Middle Event',
            event_date: date3.toISOString().split('T')[0]
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming[0].data.title, 'Earliest Event', "First should be earliest");
      assert.strictEqual(result.upcoming[1].data.title, 'Middle Event', "Second should be middle");
      assert.strictEqual(result.upcoming[2].data.title, 'Latest Event', "Third should be latest");
    }
  },
  {
    name: 'categorizeEvents-past-sort-order',
    description: 'Sorts past events by date (most recent first)',
    test: () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() - 60);
      
      const date2 = new Date();
      date2.setDate(date2.getDate() - 30);
      
      const date3 = new Date();
      date3.setDate(date3.getDate() - 45);
      
      const events = [
        {
          data: {
            title: 'Oldest Event',
            event_date: date1.toISOString().split('T')[0]
          }
        },
        {
          data: {
            title: 'Most Recent Event',
            event_date: date2.toISOString().split('T')[0]
          }
        },
        {
          data: {
            title: 'Middle Event',
            event_date: date3.toISOString().split('T')[0]
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.past[0].data.title, 'Most Recent Event', "First should be most recent");
      assert.strictEqual(result.past[1].data.title, 'Middle Event', "Second should be middle");
      assert.strictEqual(result.past[2].data.title, 'Oldest Event', "Third should be oldest");
    }
  },
  {
    name: 'categorizeEvents-regular-alphabetical-sort',
    description: 'Sorts regular events alphabetically by title',
    test: () => {
      const events = [
        {
          data: {
            title: 'Zumba Class',
            recurring_date: 'Every Thursday'
          }
        },
        {
          data: {
            title: 'Book Club',
            recurring_date: 'First Wednesday'
          }
        },
        {
          data: {
            title: 'Monthly Meeting',
            recurring_date: 'Last Friday'
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.regular[0].data.title, 'Book Club', "First should be Book Club");
      assert.strictEqual(result.regular[1].data.title, 'Monthly Meeting', "Second should be Monthly Meeting");
      assert.strictEqual(result.regular[2].data.title, 'Zumba Class', "Third should be Zumba Class");
    }
  },
  {
    name: 'categorizeEvents-prefers-recurring-over-fixed',
    description: 'If event has both recurring_date and event_date, recurring takes precedence',
    test: () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const events = [
        {
          data: {
            title: 'Hybrid Event',
            recurring_date: 'Every Friday',
            event_date: futureDate.toISOString().split('T')[0]
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.upcoming.length, 0, "Should have no upcoming events");
      assert.strictEqual(result.past.length, 0, "Should have no past events");
      assert.strictEqual(result.regular.length, 1, "Should have one regular event");
      assert.strictEqual(result.regular[0].data.title, 'Hybrid Event', "Event should be in regular");
    }
  },
  {
    name: 'categorizeEvents-handles-missing-title',
    description: 'Handles events without titles gracefully',
    test: () => {
      const events = [
        {
          data: {
            recurring_date: 'Every Monday'
          }
        },
        {
          data: {
            title: 'Named Event',
            recurring_date: 'Every Tuesday'
          }
        }
      ];
      
      const result = categorizeEvents(events);
      
      assert.strictEqual(result.regular.length, 2, "Should have two regular events");
      assert.strictEqual(result.regular[0].data.title, undefined, "First event should have no title");
      assert.strictEqual(result.regular[1].data.title, 'Named Event', "Second event should be Named Event");
    }
  }
];

createTestRunner('events', testCases);