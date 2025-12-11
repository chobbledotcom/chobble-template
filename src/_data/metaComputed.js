import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import metaData from "./meta.json" with { type: "json" };
import siteData from "./site.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function () {
  const logoPath = join(__dirname, "../images/logo.png");
  const logoUrl = fs.existsSync(logoPath)
    ? `${siteData.url}/images/logo.png`
    : null;

  const founders = metaData.organization?.founders || [];
  const uniqueFounders = [
    ...new Map(founders.map((f) => [f.name, f])).values(),
  ];

  return {
    site: {
      name: siteData.name,
      description: siteData.description,
      url: siteData.url,
      ...(logoUrl && { logo: { src: logoUrl, width: 512, height: 512 } }),
    },
    language: metaData.language || "en-GB",
    image: { src: `${siteData.url}/images/placeholder.jpg` },
    organization: {
      name: siteData.name,
      url: siteData.url,
      description: metaData.organization?.description || siteData.description,
      ...(logoUrl && { logo: logoUrl }),
      ...metaData.organization,
      founders: uniqueFounders,
      sameAs: [
        ...new Set(
          Object.values(siteData.socials || {}).filter(
            (url) => url && !url.startsWith("/"),
          ),
        ),
      ],
    },
  };
}
