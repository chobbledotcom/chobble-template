const sortByEventDate = (events, descending = false) => {
  events.sort((a, b) => {
    const dateA = new Date(a.data.event_date);
    const dateB = new Date(b.data.event_date);
    return descending ? dateB - dateA : dateA - dateB;
  });
};

const getFeaturedEvents = (events) =>
  events?.filter((e) => e.data.featured) || [];

export function categoriseEvents(events) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = [];
  const past = [];
  const regular = [];

  events.forEach((event) => {
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

  sortByEventDate(upcoming);
  sortByEventDate(past, true);

  regular.sort((a, b) => {
    const titleA = a.data.title || "";
    const titleB = b.data.title || "";
    return titleA.localeCompare(titleB);
  });

  const hasRegular = regular.length > 0;
  const hasPast = past.length > 0;

  return {
    upcoming,
    past,
    regular,
    show: {
      upcoming: !hasRegular,
      regular: hasRegular,
      past: hasPast,
    },
  };
}

export { getFeaturedEvents };
