#!/usr/bin/env node

/**
 * Fetch the site's reviews from Google, Facebook and Trustpilot.
 *
 * Reads the `review_sources` setting from src/_data/config.json, asks an
 * Apify actor for each configured source's reviews, and writes every review
 * not already stored to src/reviews/ as `YYYY-MM-DD-reviewer-source.md`,
 * with the reviewer's photo beside it in src/images/reviewers/ when the
 * source has one.
 * Stored reviews are never rewritten or removed, so hiding one by hand
 * (`hidden: true`) survives the next run.
 *
 * A review that appears on more than one source is stored once, from the
 * first source in SOURCES that has it.
 *
 * Needs an Apify API token in the APIFY_API_TOKEN environment variable.
 *
 * Usage:
 *   npm run fetch-reviews
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import getConfig from "#data/config.js";
import { ROOT_DIR } from "#lib/paths.js";
import { runIfMain } from "#scripts/lib/is-main-module.js";
import { slugify } from "#utils/slug-utils.js";

const APIFY_ACTORS = "https://api.apify.com/v2/acts";
const MAX_REVIEWS = 9999;
const TWENTY_MINUTES = 20 * 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;
/** Avatars show at 48px at most; storing twice that keeps them sharp. */
const AVATAR_SIZE = 96;
const AVATAR_URL = "/images/reviewers";

/**
 * A review already stored: its file, who wrote it, where, and what they said.
 * @typedef {{ file: string, name: string, source: string, content: string }} StoredReview
 */

/**
 * A Trustpilot review is a title and a body. The title is dropped when the
 * body already opens with it - in full, or up to where the title was cut
 * short with an ellipsis - and otherwise leads the body as its own sentence.
 * @param {string} heading
 * @param {string} text
 * @returns {string}
 */
const trustpilotContent = (heading, text) => {
  const opening = heading.replace(/(\.{3}|…\.?)$/, "").trim();
  if (heading === "" || text.toLowerCase().startsWith(opening.toLowerCase())) {
    return text;
  }
  const sentence = /[.!?]$/.test(heading) ? heading : `${heading}.`;
  return text === "" ? sentence : `${sentence}\n\n${text}`;
};

/**
 * Actor rows are outside input: a field may be missing or null, and counts
 * as empty text unless it is a string.
 * @param {unknown} value
 * @returns {string}
 */
const textOf = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * A review built from the fields of an actor's row.
 * @param {unknown} name - Reviewer; "Anonymous" when the row has none
 * @param {string} content
 * @param {number} rating
 * @param {unknown} url - Where the review can be read, if the row says
 * @param {string} date
 * @param {unknown} photo - URL of the reviewer's photo, if the row has one
 */
const reviewOf = (name, content, rating, url, date, photo) => ({
  name: textOf(name) === "" ? "Anonymous" : textOf(name),
  content,
  rating,
  url: textOf(url),
  date: new Date(date),
  photo: textOf(photo),
});

/**
 * A source whose setting is already the page its actor starts from, and
 * whose actor returns one row per review.
 * @param {string} name
 * @param {string} setting
 * @param {string} actor
 * @param {(row: any) => ReturnType<typeof reviewOf>} review
 */
const pageSource = (name, setting, actor, review) => ({
  name,
  setting,
  actor,
  /** @param {string} url */
  startUrl: (url) => url,
  /** @param {any[]} items */
  rows: (items) => items,
  review,
});

/**
 * Where reviews come from, most trusted first. Each source names the
 * `review_sources` setting that switches it on, the Apify actor that reads
 * it, the page that actor starts from, and how the actor's rows become
 * reviews.
 */
const SOURCES = [
  pageSource("trustpilot", "trustpilot_url", "4AQb7n4pXPxFQQ2w5", (row) =>
    reviewOf(
      row.name,
      trustpilotContent(textOf(row.reviewTitle), textOf(row.reviewText)),
      Number.parseInt(row.ratingValue, 10),
      row.url,
      row.date,
      row.avatar,
    ),
  ),
  {
    name: "google",
    setting: "google_business_id",
    actor: "nwua9Gu5YrADL7ZDj",
    /** @param {string} placeId */
    startUrl: (placeId) =>
      `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    /**
     * The actor returns places, each holding its reviews if it has any.
     * @param {any[]} items
     */
    rows: (items) =>
      items.flatMap((item) =>
        Array.isArray(item.reviews) ? item.reviews : [],
      ),
    /** @param {any} row */
    review: (row) =>
      reviewOf(
        row.name,
        textOf(row.text),
        row.stars,
        row.reviewerUrl,
        row.publishedAtDate,
        row.reviewerPhotoUrl,
      ),
  },
  // Facebook has no star rating: a recommendation counts as five stars.
  pageSource("facebook", "facebook_page_url", "dX3d80hsNMilEwjXG", (row) =>
    reviewOf(
      row.user?.name,
      textOf(row.text),
      row.isRecommended ? 5 : 1,
      row.url,
      row.date,
      row.user?.profilePic,
    ),
  ),
];

/**
 * Run a source's Apify actor and return the rows it produced.
 * @param {typeof SOURCES[number]} source
 * @param {string} value - The source's `review_sources` setting
 * @param {string | undefined} since - Only ask for reviews from this date on
 * @param {string} token
 * @returns {Promise<any[]>}
 */
const actorItems = async (source, value, since, token) => {
  const response = await fetch(
    `${APIFY_ACTORS}/${source.actor}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: source.startUrl(value) }],
        maxReviews: MAX_REVIEWS,
        reviewsSort: "newest",
        language: "en",
        ...(since && { reviewsStartDate: since }),
      }),
      signal: AbortSignal.timeout(TWENTY_MINUTES),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Apify actor ${source.actor} failed with HTTP ${response.status}: ${await response.text()}`,
    );
  }
  const items = await response.json();
  if (!Array.isArray(items)) {
    throw new Error(
      `Apify actor ${source.actor} did not return a list of items`,
    );
  }
  return items;
};

/**
 * The reviews already in a directory.
 * @param {string} reviewsDir
 * @returns {StoredReview[]}
 */
const storedReviews = (reviewsDir) =>
  readdirSync(reviewsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const parsed = matter(readFileSync(path.join(reviewsDir, file), "utf8"));
      return {
        file,
        name: parsed.data.name,
        source: parsed.data.source,
        content: parsed.content,
      };
    });

/**
 * What makes two reviews the same review: the reviewer and the start of
 * what they wrote, ignoring case and spacing.
 * @param {{ name: string, content: string }} review
 */
const sameReviewKey = (review) =>
  [review.name, review.content.slice(0, 200)]
    .map((text) => text.toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");

/**
 * Whether two reviews are the same review: stored under the same file name,
 * or the same reviewer saying the same thing on another source or date.
 * @param {{ file: string, name: string, content: string }} review
 * @returns {(other: { file: string, name: string, content: string }) => boolean}
 */
const isSameReview = (review) => (other) =>
  other.file === review.file || sameReviewKey(other) === sameReviewKey(review);

/**
 * Fetch the reviews of one source that are not stored yet, asking from its
 * newest stored review on so a daily run only fetches what could be new.
 * @param {typeof SOURCES[number]} source
 * @param {string} value - The source's `review_sources` setting
 * @param {StoredReview[]} stored
 * @param {string} token
 */
const sourceReviews = async (source, value, stored, token) => {
  const newest = stored
    .filter((review) => review.source === source.name)
    .map((review) => review.file.slice(0, 10))
    .toSorted()
    .at(-1);
  const items = await actorItems(source, value, newest, token);
  return source
    .rows(items)
    .map((row) => ({ ...source.review(row), source: source.name }))
    .filter(
      (review) =>
        review.content.length > 5 && !Number.isNaN(review.date.getTime()),
    )
    .map((review) => ({
      ...review,
      file: `${review.date.toISOString().slice(0, 10)}-${slugify(review.name)}-${review.source}.md`,
    }))
    .filter((review) => !stored.some(isSameReview(review)));
};

/**
 * Download a review's photo as a small square avatar named after the review.
 * A reviewer without a photo, or whose photo is no longer served as an image,
 * simply has no avatar: the review is worth storing either way.
 * @param {{ file: string, photo: string }} review
 * @param {string} avatarsDir
 * @returns {Promise<string>} Site path of the avatar, or "" without one
 */
const storeAvatar = async (review, avatarsDir) => {
  if (review.photo === "") return "";
  const response = await fetch(review.photo, {
    signal: AbortSignal.timeout(THIRTY_SECONDS),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  ) {
    return "";
  }
  const name = review.file.replace(/\.md$/, ".webp");
  await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(path.join(avatarsDir, name));
  return `${AVATAR_URL}/${name}`;
};

/**
 * Fetch every configured source and store the reviews that are new.
 * @param {Record<string, string>} settings - The `review_sources` setting
 * @param {{ reviews: string, avatars: string }} dirs - Where reviews and reviewer avatars are stored
 * @param {string} [token] - Apify API token
 * @returns {Promise<string[]>} File names of the reviews stored
 */
export const fetchReviews = async (settings, dirs, token) => {
  const configured = SOURCES.filter((source) => settings[source.setting]);
  if (configured.length === 0) return [];
  if (!token) throw new Error("Set APIFY_API_TOKEN to fetch reviews");

  for (const dir of Object.values(dirs)) mkdirSync(dir, { recursive: true });
  const stored = storedReviews(dirs.reviews);
  const fetched = await Promise.all(
    configured.map((source) =>
      sourceReviews(source, settings[source.setting], stored, token),
    ),
  );
  const unstored = fetched.flat();
  const added = unstored.filter(
    (review, index) => unstored.findIndex(isSameReview(review)) === index,
  );
  for (const review of added) {
    const avatar = await storeAvatar(review, dirs.avatars);
    writeFileSync(
      path.join(dirs.reviews, review.file),
      matter.stringify(`\n${review.content}\n`, {
        name: review.name,
        rating: review.rating,
        source: review.source,
        ...(review.url && { url: review.url }),
        ...(avatar && { avatar }),
      }),
    );
  }
  return added.map((review) => review.file);
};

/**
 * Command-line entry: fetch the site's reviews and print what was stored.
 * @param {Record<string, string>} [settings]
 * @param {string} [srcDir] - The site's src/ directory
 */
export const main = async (
  settings = getConfig().review_sources,
  srcDir = path.join(ROOT_DIR, "src"),
) => {
  const files = await fetchReviews(
    settings,
    {
      reviews: path.join(srcDir, "reviews"),
      avatars: path.join(srcDir, "images", "reviewers"),
    },
    process.env.APIFY_API_TOKEN,
  );
  console.log(`Stored ${files.length} new reviews`);
  for (const file of files) console.log(`  ${file}`);
};

await runIfMain(import.meta.url, main);
