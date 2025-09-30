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
			founders: (() => {
				const original = metaData.organization?.founders;
				fs.appendFileSync('/tmp/meta-debug.log', `ORIGINAL founders length: ${original?.length}\n`);
				fs.appendFileSync('/tmp/meta-debug.log', `ORIGINAL founders: ${JSON.stringify(original)}\n`);
				const cloned = original ? JSON.parse(JSON.stringify(original)) : undefined;
				fs.appendFileSync('/tmp/meta-debug.log', `CLONED founders length: ${cloned?.length}\n`);
				return cloned;
			})(),
			address: metaData.organization?.address,
			contactPoint: metaData.organization?.contactPoint ? JSON.parse(JSON.stringify(metaData.organization.contactPoint)) : undefined,
			sameAs: sameAs
		}
	};

	fs.appendFileSync('/tmp/meta-return.log', `RETURNING: founders.length = ${meta.organization.founders?.length}\n`);
	fs.appendFileSync('/tmp/meta-return.log', `RETURNING: founders = ${JSON.stringify(meta.organization.founders)}\n`);

	// Add a check after a tiny delay to see if it gets mutated
	setTimeout(() => {
		fs.appendFileSync('/tmp/meta-mutation.log', `AFTER DELAY: founders.length = ${meta.organization.founders?.length}\n`);
		fs.appendFileSync('/tmp/meta-mutation.log', `AFTER DELAY: founders = ${JSON.stringify(meta.organization.founders)}\n`);
	}, 100);

	return meta;
}