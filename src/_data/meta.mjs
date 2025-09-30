import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function () {
	// Deep clone to prevent mutations from affecting cached require data
	const metaData = structuredClone(require("./meta.json"));
	const siteData = structuredClone(require("./site.json"));
	
	// Check if logo.png exists
	const logoPath = path.join(__dirname, "../images/logo.png");
	const logoExists = fs.existsSync(logoPath);
	
	// Build sameAs array from socials, removing duplicates
	const sameAs = [...new Set(
		Object.values(siteData.socials || {}).filter(
			url => url && !url.startsWith("/") // Filter out relative URLs like /feed.xml
		)
	)];
	
	// Build the complete meta object
	const meta = {
		site: {
			name: siteData.name,
			description: siteData.description,
			url: siteData.url,
			...(logoExists && {
				logo: {
					src: `${siteData.url}/images/logo.png`,
					width: 512,
					height: 512
				}
			})
		},
		language: metaData.language || "en-GB",
		image: {
			src: `${siteData.url}/images/placeholder.jpg`
		},
		organization: {
			name: siteData.name,
			legalName: metaData.organization?.legalName,
			url: siteData.url,
			...(logoExists && {
				logo: `${siteData.url}/images/logo.png`
			}),
			description: metaData.organization?.description || siteData.description,
			foundingDate: metaData.organization?.foundingDate,
			founders: metaData.organization?.founders ? JSON.parse(JSON.stringify(metaData.organization.founders)) : undefined,
			address: metaData.organization?.address,
			contactPoint: metaData.organization?.contactPoint ? JSON.parse(JSON.stringify(metaData.organization.contactPoint)) : undefined,
			sameAs: sameAs
		}
	};

	return meta;
}