---
name: Events
meta_description: Check out our upcoming and past events
meta_title: Events Listing Website | Chobble Template
permalink: /events/
layout: design-system-base.html
eleventyNavigation:
  key: Events
  order: 4
blocks:
  - type: markdown
    content: |
      ## Our Events

      If this was a real website you could list your events here! The system supports fixed date and recurring events, and will organise them into "Regular", "Past" and "Recurring" lists below.

      You can add galleries to events, and each one includes an optional contact form and map embed, too.

  - type: items
    collection: upcomingEvents
    intro_content: |
      ## Upcoming Events

  - type: items
    collection: regularEvents
    intro_content: |
      ## Regular Events

  - type: items
    collection: pastEvents
    intro_content: |
      ## Past Events

  - type: items
    collection: undatedEvents
---
