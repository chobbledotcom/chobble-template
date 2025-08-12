function categoriseEvents(events) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const upcoming = [];
  const past = [];
  const regular = [];
  
  events.forEach(event => {
    if (event.data.recurring_date) {
      regular.push(event);
    } else if (event.data.event_date) {
      const eventDate = new Date(event.data.event_date);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }
  });
  
  upcoming.sort((a, b) => {
    const dateA = new Date(a.data.event_date);
    const dateB = new Date(b.data.event_date);
    return dateA - dateB;
  });
  
  past.sort((a, b) => {
    const dateA = new Date(a.data.event_date);
    const dateB = new Date(b.data.event_date);
    return dateB - dateA;
  });
  
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
  categoriseEvents
};