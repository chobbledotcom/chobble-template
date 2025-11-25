import { buildBaseMeta } from "../_lib/schema-helper.mjs";
import { categoriseEvents } from "../_lib/events.mjs";
import strings from "../_data/strings.js";

export default {
	eleventyComputed: {
		meta: (data) => buildBaseMeta(data),
		navigationParent: () => strings.event_name,
		permalink: (data) => {
			if (data.permalink) return data.permalink;
			const dir = strings.event_permalink_dir;
			return `/${dir}/${data.page.fileSlug}/`;
		},
		ical_url: (data) => {
			// Only provide iCal URL for one-off events
			if (data.event_date && !data.recurring_date) {
				const dir = strings.event_permalink_dir;
				return `/${dir}/${data.page.fileSlug}.ics`;
			}
			return null;
		},
		categorisedEvents: (data) => {
			if (data.collections && data.collections.events) {
				return categoriseEvents(data.collections.events);
			}
			return {
				upcoming: [],
				past: [],
				regular: [],
				show: { upcoming: true, regular: false, past: false },
			};
		},
	},
};
