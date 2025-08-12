/**
 * Event utilities for handling regular and date-based events
 */

/**
 * Categorize events into upcoming, past, and regular (recurring) events
 * @param {Array} events - Collection of event objects
 * @returns {Object} Object with upcoming, past, and regular event arrays
 */
function categorizeEvents(events) {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  const upcoming = [];
  const past = [];
  const regular = [];
  
  events.forEach(event => {
    if (event.data.recurring_date) {
      // Event has a recurring date - add to regular events
      regular.push(event);
    } else if (event.data.event_date) {
      // Event has a fixed date - categorize as upcoming or past
      const eventDate = new Date(event.data.event_date);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }
  });
  
  // Sort upcoming events by date (earliest first)
  upcoming.sort((a, b) => {
    const dateA = new Date(a.data.event_date);
    const dateB = new Date(b.data.event_date);
    return dateA - dateB;
  });
  
  // Sort past events by date (most recent first)
  past.sort((a, b) => {
    const dateA = new Date(a.data.event_date);
    const dateB = new Date(b.data.event_date);
    return dateB - dateA;
  });
  
  // Sort regular events alphabetically by title
  regular.sort((a, b) => {
    const titleA = a.data.title || '';
    const titleB = b.data.title || '';
    return titleA.localeCompare(titleB);
  });
  
  return {
    upcoming,
    past,
    regular,
    hasOnlyRegular: regular.length > 0 && upcoming.length === 0 && past.length === 0
  };
}

module.exports = {
  categorizeEvents
};