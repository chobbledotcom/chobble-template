import matter from "gray-matter";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchReviews, main } from "#scripts/fetch-reviews.js";
import {
  captureConsoleLogAsync,
  fs,
  path,
  withTempDirAsync,
} from "#test/test-utils.js";

const GOOGLE = { google_business_id: "place-123" };
const FACEBOOK = { facebook_page_url: "https://facebook.example/page" };
const TRUSTPILOT = { trustpilot_url: "https://trustpilot.example/site" };

const googleRow = (overrides = {}) => ({
  name: "Ada Lovelace",
  text: "Built us a brilliant website.",
  stars: 5,
  reviewerUrl: "https://maps.example/ada",
  publishedAtDate: "2026-03-04T10:00:00.000Z",
  ...overrides,
});

const trustpilotRow = (overrides = {}) => ({
  name: "Grace Hopper",
  reviewTitle: "Fast and friendly",
  reviewText: "Sorted our hosting in a day.",
  ratingValue: "4",
  url: "https://trustpilot.example/reviews/1",
  date: "2026-02-01T09:00:00.000Z",
  ...overrides,
});

const facebookRow = (overrides = {}) => ({
  user: { name: "Alan Turing" },
  text: "Would recommend to anyone.",
  isRecommended: true,
  url: "https://facebook.example/posts/1",
  date: "2026-01-15T12:00:00.000Z",
  ...overrides,
});

/**
 * Answer Apify requests with each source's rows, recording what was asked.
 * @param {{ google?: object[], facebook?: object[], trustpilot?: object[] }} rows
 * @returns {() => { url: string, input: any }[]} Lists the requests made so far
 */
const mockApify = (rows) => {
  const bodies = {
    nwua9Gu5YrADL7ZDj: rows.google && [
      { title: "A place with no reviews" },
      { reviews: rows.google },
    ],
    dX3d80hsNMilEwjXG: rows.facebook,
    "4AQb7n4pXPxFQQ2w5": rows.trustpilot,
  };
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url) =>
      Response.json(bodies[String(url).split("/acts/")[1].split("/")[0]]),
    );
  return () =>
    spy.mock.calls.map(([url, init]) => ({
      url: String(url),
      input: JSON.parse(String(init.body)),
    }));
};

/** Read a stored review back as its front matter and body. */
const readReview = (dir, file) => {
  const parsed = matter(fs.readFileSync(path.join(dir, file), "utf8"));
  return { data: parsed.data, content: parsed.content.trim() };
};

describe("fetch-reviews", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("stores nothing and asks nothing when no source is configured", () =>
    withTempDirAsync("fetch-reviews-unconfigured", async (dir) => {
      const requests = mockApify({});
      expect(await fetchReviews({}, dir, "token")).toEqual([]);
      expect(requests()).toEqual([]);
    }));

  test("fails without an Apify token", () =>
    withTempDirAsync("fetch-reviews-no-token", (dir) =>
      expect(fetchReviews(GOOGLE, dir, undefined)).rejects.toThrow(
        "Set APIFY_API_TOKEN to fetch reviews",
      ),
    ));

  test("stores a Google review under its date, reviewer and source", () =>
    withTempDirAsync("fetch-reviews-google", async (dir) => {
      const requests = mockApify({ google: [googleRow()] });
      const files = await fetchReviews(GOOGLE, dir, "secret");
      expect(files).toEqual(["2026-03-04-ada-lovelace-google.md"]);
      expect(readReview(dir, files[0])).toEqual({
        data: {
          name: "Ada Lovelace",
          rating: 5,
          source: "google",
          url: "https://maps.example/ada",
        },
        content: "Built us a brilliant website.",
      });
      expect(requests()).toHaveLength(1);
      expect(requests()[0].url).toBe(
        "https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/run-sync-get-dataset-items?token=secret",
      );
      expect(requests()[0].input.startUrls).toEqual([
        { url: "https://www.google.com/maps/place/?q=place_id:place-123" },
      ]);
      expect(requests()[0].input).not.toHaveProperty("reviewsStartDate");
    }));

  test("creates the reviews directory when it does not exist", () =>
    withTempDirAsync("fetch-reviews-mkdir", async (dir) => {
      mockApify({ google: [googleRow()] });
      const reviewsDir = path.join(dir, "src", "reviews");
      const files = await fetchReviews(GOOGLE, reviewsDir, "token");
      expect(fs.readdirSync(reviewsDir)).toEqual(files);
    }));

  test.each([
    { isRecommended: true, rating: 5 },
    { isRecommended: false, rating: 1 },
  ])("rates a Facebook review $rating when isRecommended is $isRecommended", ({
    isRecommended,
    rating,
  }) =>
    withTempDirAsync("fetch-reviews-facebook", async (dir) => {
      const requests = mockApify({
        facebook: [facebookRow({ isRecommended })],
      });
      const files = await fetchReviews(FACEBOOK, dir, "token");
      expect(files).toEqual(["2026-01-15-alan-turing-facebook.md"]);
      expect(readReview(dir, files[0]).data).toEqual({
        name: "Alan Turing",
        rating,
        source: "facebook",
        url: "https://facebook.example/posts/1",
      });
      expect(requests()[0].input.startUrls).toEqual([
        { url: "https://facebook.example/page" },
      ]);
    }));

  test.each([
    {
      name: "leads with the title as its own sentence",
      row: {},
      content: "Fast and friendly.\n\nSorted our hosting in a day.",
    },
    {
      name: "keeps a title's own closing punctuation",
      row: { reviewTitle: "Fast and friendly!" },
      content: "Fast and friendly!\n\nSorted our hosting in a day.",
    },
    {
      name: "drops a title the text already opens with",
      row: { reviewTitle: "sorted our hosting" },
      content: "Sorted our hosting in a day.",
    },
    {
      name: "drops a title that is the text cut short with an ellipsis",
      row: { reviewTitle: "Sorted our hosting…" },
      content: "Sorted our hosting in a day.",
    },
    {
      name: "uses the text alone when there is no title",
      row: { reviewTitle: undefined },
      content: "Sorted our hosting in a day.",
    },
    {
      name: "uses the title alone when there is no text",
      row: { reviewText: undefined },
      content: "Fast and friendly.",
    },
  ])("a Trustpilot review $name", ({ row, content }) =>
    withTempDirAsync("fetch-reviews-trustpilot", async (dir) => {
      mockApify({ trustpilot: [trustpilotRow(row)] });
      const files = await fetchReviews(TRUSTPILOT, dir, "token");
      expect(files).toEqual(["2026-02-01-grace-hopper-trustpilot.md"]);
      const review = readReview(dir, files[0]);
      expect(review.content).toBe(content);
      expect(review.data.rating).toBe(4);
    }));

  test("names a reviewer Anonymous and omits the link when a row has neither", () =>
    withTempDirAsync("fetch-reviews-anonymous", async (dir) => {
      mockApify({
        google: [googleRow({ name: undefined, reviewerUrl: undefined })],
      });
      const files = await fetchReviews(GOOGLE, dir, "token");
      expect(files).toEqual(["2026-03-04-anonymous-google.md"]);
      expect(readReview(dir, files[0]).data).toEqual({
        name: "Anonymous",
        rating: 5,
        source: "google",
      });
    }));

  test("skips reviews with no real text or no usable date", () =>
    withTempDirAsync("fetch-reviews-skipped", async (dir) => {
      mockApify({
        google: [
          googleRow({ text: "Good" }),
          googleRow({ text: undefined }),
          googleRow({ publishedAtDate: "not a date" }),
        ],
      });
      expect(await fetchReviews(GOOGLE, dir, "token")).toEqual([]);
      expect(fs.readdirSync(dir)).toEqual([]);
    }));

  test("stores a review left on several sources once, preferring Trustpilot", () =>
    withTempDirAsync("fetch-reviews-duplicates", async (dir) => {
      const text = "Sorted   our hosting in a day.";
      mockApify({
        google: [googleRow({ name: "grace hopper", text })],
        facebook: [facebookRow({ user: { name: "Grace Hopper" }, text })],
        trustpilot: [trustpilotRow({ reviewTitle: undefined })],
      });
      const files = await fetchReviews(
        { ...GOOGLE, ...FACEBOOK, ...TRUSTPILOT },
        dir,
        "token",
      );
      expect(files).toEqual(["2026-02-01-grace-hopper-trustpilot.md"]);
    }));

  test("leaves stored reviews alone and asks only for newer ones", () =>
    withTempDirAsync("fetch-reviews-stored", async (dir) => {
      mockApify({ google: [googleRow()] });
      const [stored] = await fetchReviews(GOOGLE, dir, "token");
      const hidden = fs
        .readFileSync(path.join(dir, stored), "utf8")
        .replace("rating: 5", "rating: 5\nhidden: true");
      fs.writeFileSync(path.join(dir, stored), hidden);
      vi.restoreAllMocks();

      const newer = googleRow({
        name: "Katherine Johnson",
        text: "Calculated and delivered.",
        publishedAtDate: "2026-05-06T08:00:00.000Z",
      });
      const requests = mockApify({ google: [googleRow(), newer] });
      const files = await fetchReviews(GOOGLE, dir, "token");
      expect(files).toEqual(["2026-05-06-katherine-johnson-google.md"]);
      expect(requests()[0].input.reviewsStartDate).toBe("2026-03-04");
      expect(fs.readFileSync(path.join(dir, stored), "utf8")).toBe(hidden);
    }));

  test("does not store a review again when its date has shifted", () =>
    withTempDirAsync("fetch-reviews-shifted", async (dir) => {
      mockApify({ google: [googleRow()] });
      await fetchReviews(GOOGLE, dir, "token");
      vi.restoreAllMocks();
      mockApify({
        google: [googleRow({ publishedAtDate: "2026-03-05T10:00:00.000Z" })],
      });
      expect(await fetchReviews(GOOGLE, dir, "token")).toEqual([]);
    }));

  test("fails when Apify rejects the request", () =>
    withTempDirAsync("fetch-reviews-http-error", async (dir) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Actor not found", { status: 404 }),
      );
      await expect(fetchReviews(GOOGLE, dir, "token")).rejects.toThrow(
        "Apify actor nwua9Gu5YrADL7ZDj failed with HTTP 404: Actor not found",
      );
    }));

  test("fails when Apify answers with something other than a list", () =>
    withTempDirAsync("fetch-reviews-not-a-list", async (dir) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ error: "run timed out" }),
      );
      await expect(fetchReviews(GOOGLE, dir, "token")).rejects.toThrow(
        "Apify actor nwua9Gu5YrADL7ZDj did not return a list of items",
      );
    }));

  test("prints the reviews a run stored", () =>
    withTempDirAsync("fetch-reviews-main", async (dir) => {
      mockApify({ google: [googleRow()] });
      vi.stubEnv("APIFY_API_TOKEN", "token");
      const logs = await captureConsoleLogAsync(() => main(GOOGLE, dir));
      vi.unstubAllEnvs();
      expect(logs).toEqual([
        "Stored 1 new reviews",
        "  2026-03-04-ada-lovelace-google.md",
      ]);
    }));
});
