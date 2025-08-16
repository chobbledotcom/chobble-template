const renderRecurringEvents = (events) => {
	if (!events || events.length === 0) {
		return '';
	}
	
	let html = '<ul class="recurring-events">\n';
	for (const event of events) {
		const eventData = event.data || event;
		html += `  <li>\n`;
		html += `    <strong>${eventData.title}</strong><br>\n`;
		html += `    <span class="event-time">${eventData.recurring_date}</span>`;
		if (eventData.event_location) {
			html += `<br>\n    <span class="event-location">${eventData.event_location}</span>`;
		}
		html += `\n  </li>\n`;
	}
	html += '</ul>';
	
	return html;
};

const recurringEventsShortcode = function(eleventyConfig) {
	// Access the events collection through Eleventy's collection API
	const events = this.ctx?.collections?.events || this.collections?.events || [];
	const recurringEvents = events.filter(event => event.data?.recurring_date);
	
	// Sort by title for consistent display
	recurringEvents.sort((a, b) => {
		const titleA = a.data?.title || '';
		const titleB = b.data?.title || '';
		return titleA.localeCompare(titleB);
	});
	
	return renderRecurringEvents(recurringEvents);
};

const configureRecurringEvents = (eleventyConfig) => {
	// Add the shortcode that can be used in templates
	eleventyConfig.addShortcode("recurring_events", recurringEventsShortcode);
	
	// Also add a filter version for more flexibility
	eleventyConfig.addFilter("format_recurring_events", renderRecurringEvents);
};

// Function to get recurring events HTML for direct use in file-utils
const getRecurringEventsHtml = () => {
	const fs = require('fs');
	const path = require('path');
	const matter = require('gray-matter');
	
	// Read all event files from the events directory
	const eventsDir = path.join(process.cwd(), 'src/events');
	const recurringEvents = [];
	
	try {
		const files = fs.readdirSync(eventsDir);
		
		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(eventsDir, file);
				const content = fs.readFileSync(filePath, 'utf8');
				const { data } = matter(content);
				
				// Check if this is a recurring event
				if (data.recurring_date) {
					recurringEvents.push({
						data: {
							title: data.title,
							recurring_date: data.recurring_date,
							event_location: data.event_location
						}
					});
				}
			}
		}
		
		// Sort by title for consistent display
		recurringEvents.sort((a, b) => {
			const titleA = a.data?.title || '';
			const titleB = b.data?.title || '';
			return titleA.localeCompare(titleB);
		});
		
		return renderRecurringEvents(recurringEvents);
	} catch (err) {
		console.error('Error reading events:', err);
		return '';
	}
};

module.exports = {
	configureRecurringEvents,
	renderRecurringEvents,
	getRecurringEventsHtml,
};