import ical from 'ical-generator';
import path from 'path';
import strings from '../_data/strings.js';

export function generateICalForEvent(event) {
  // Only generate iCal for one-off events (not recurring)
  if (!event.data.event_date || event.data.recurring_date) {
    return null;
  }

  const calendar = ical({
    prodId: '//Terragon Labs//Event Calendar//EN',
    name: strings.business_name || 'Events',
    timezone: 'UTC'
  });

  const eventDate = new Date(event.data.event_date);
  
  // Create a full day event
  const startDate = new Date(eventDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(eventDate);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(0, 0, 0, 0);

  const calendarEvent = calendar.createEvent({
    start: startDate,
    end: endDate,
    allDay: true,
    summary: event.data.title,
    description: event.data.subtitle || event.data.meta_description || '',
    location: event.data.event_location || '',
    url: event.url ? `${strings.domain || ''}${event.url}` : undefined
  });

  return calendar.toString();
}

export function configureICal(eleventyConfig) {
  // Add a filter to generate iCal content
  eleventyConfig.addFilter("generateICal", generateICalForEvent);
  
  // Add collection of one-off events
  eleventyConfig.addCollection("oneOffEvents", function(collectionApi) {
    return collectionApi.getFilteredByTag("events").filter(event => {
      return event.data.event_date && !event.data.recurring_date;
    });
  });
}