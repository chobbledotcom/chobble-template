export default {
	eleventyComputed: {
		dietaryKeys: (data) => {
			const dietaryIndicators = data.dietaryIndicators || {};
			const keys = [];

			// Check each dietary indicator configuration
			for (const [key, indicator] of Object.entries(dietaryIndicators)) {
				if (data[indicator.field]) {
					keys.push({
						symbol: indicator.symbol,
						label: indicator.label,
					});
				}
			}

			return keys;
		},
	},
};
