// Search UI tests
// Exercises the search page behavior through the initSearch entry point

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { initSearch } from "#public/ui/search.js";
import { withTempDirAsync } from "#test/test-utils.js";

// ============================================
// Mock pagefind API
// ============================================

const createMockResult = (overrides = {}) => ({
  url: overrides.url ?? "/products/test-product/",
  meta: {
    title: "Test Product",
    image: "/img/test.jpg",
    ...overrides.meta,
  },
  excerpt: overrides.excerpt ?? "A <mark>test</mark> product description.",
});

const createMockResultHandle = (overrides = {}) => ({
  data: vi.fn(() => Promise.resolve(createMockResult(overrides))),
});

const createMockPagefind = (resultHandles = []) => ({
  init: vi.fn(() => Promise.resolve()),
  search: vi.fn(() => Promise.resolve({ results: resultHandles })),
});

// ============================================
// DOM setup helpers
// ============================================

const SEARCH_HTML = `
  <div class="design-system">
    <form action="/search/" method="get" class="search-box">
      <input type="search" name="q" placeholder="Search" autocomplete="off">
      <button type="submit">Search</button>
    </form>
    <div
      id="search-results"
      data-no-results-label="No results found."
      data-result-count-one-label="{count} result found."
      data-result-count-other-label="{count} results found."
    >
      <p class="search-message"></p>
      <ul class="search-results-list"></ul>
      <button class="search-load-more btn btn--secondary" hidden>Load more</button>
    </div>
  </div>
`;

const setSearchParam = (value) => {
  const url = new URL(window.location.href);
  url.searchParams.set("q", value);
  window.history.replaceState(null, "", url);
};

const PAGE_SIZE = 10;

/** Set up DOM + pagefind mock, init search, and run a query via the URL param */
const searchWith = async (handleCount, query = "test") => {
  document.body.innerHTML = SEARCH_HTML;
  const handles = Array.from({ length: handleCount }, () =>
    createMockResultHandle(),
  );
  window.pagefind = createMockPagefind(handles);
  setSearchParam(query);
  initSearch();
  await vi.waitFor(() => {
    expect(document.querySelector(".search-message").textContent).not.toBe("");
    expect(document.querySelectorAll(".search-result").length).toBe(
      Math.min(handleCount, PAGE_SIZE),
    );
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  delete window.pagefind;
  window.history.replaceState(null, "", window.location.pathname);
});

// ============================================
// renderResult (exercised via initSearch)
// ============================================

describe("renderResult", () => {
  /** Run a search through initSearch and return the first rendered card. */
  const renderWith = async (makeResult) => {
    document.body.innerHTML = SEARCH_HTML;
    const result = makeResult();
    const handle = { data: vi.fn(() => Promise.resolve(result)) };
    window.pagefind = createMockPagefind([handle]);
    setSearchParam("test");
    initSearch();
    await vi.waitFor(() =>
      expect(document.querySelector(".search-result")).not.toBeNull(),
    );
    return document.querySelector(".search-result");
  };

  test("creates list item with link to result URL", async () => {
    const el = await renderWith(() => createMockResult());
    expect(el.tagName).toBe("LI");
    expect(el.className).toBe("search-result");
    expect(el.querySelector("a").href).toContain("/products/test-product/");
  });

  test("includes image when meta.image is present", async () => {
    const el = await renderWith(() => createMockResult());
    const img = el.querySelector("img");
    expect(img).not.toBeNull();
    expect(img.src).toContain("/img/test.jpg");
    expect(img.loading).toBe("lazy");
    expect(img.className).toBe("search-result__image");
  });

  test("omits image when meta.image is absent", async () => {
    const el = await renderWith(() => {
      const result = createMockResult();
      delete result.meta.image;
      return result;
    });
    expect(el.querySelector("img")).toBeNull();
  });

  test("displays title from meta", async () => {
    const el = await renderWith(() => createMockResult());
    expect(el.querySelector("h3").textContent).toBe("Test Product");
  });

  test("renders excerpt HTML with highlight marks", async () => {
    const el = await renderWith(() => createMockResult());
    const excerpt = el.querySelector(".search-result__body p");
    expect(excerpt.innerHTML).toContain("<mark>");
  });

  test("omits excerpt paragraph when not provided", async () => {
    const el = await renderWith(() => createMockResult({ excerpt: "" }));
    expect(el.querySelector(".search-result__body p")).toBeNull();
  });
});

// ============================================
// pagefind loading (exercised via initSearch)
// ============================================

describe("pagefind loading (exercised via initSearch)", () => {
  test("uses the already-loaded window.pagefind instead of importing", async () => {
    await searchWith(1, "hello");
    expect(window.pagefind.search).toHaveBeenCalledWith("hello");
  });

  test("imports pagefind from the site's path prefix and initialises it", async () => {
    await withTempDirAsync("search-pagefind", async (dir) => {
      // A real module on disk stands in for the built site's
      // /pagefind/pagefind.js, reached through the data-path-prefix
      // attribute exactly as a deployed page would reach it.
      mkdirSync(join(dir, "pagefind"), { recursive: true });
      writeFileSync(
        join(dir, "pagefind/pagefind.js"),
        [
          "export const init = () => {",
          "  globalThis.__pagefindInits = (globalThis.__pagefindInits || 0) + 1;",
          "};",
          "export const options = (value) => {",
          "  globalThis.__pagefindOptions = value;",
          "};",
          "export const search = async () => ({ results: [] });",
          "",
        ].join("\n"),
      );
      document.body.innerHTML = SEARCH_HTML;
      const tag = document.createElement("script");
      tag.dataset.pathPrefix = `${dir}/`;
      document.body.append(tag);
      window.pagefind = undefined;
      setSearchParam("hello");

      initSearch();

      try {
        await vi.waitFor(() => expect(globalThis.__pagefindInits).toBe(1));
        expect(globalThis.__pagefindOptions).toEqual({ baseUrl: `${dir}/` });
      } finally {
        tag.remove();
        delete globalThis.__pagefindInits;
        delete globalThis.__pagefindOptions;
      }
    });
  });
});

// ============================================
// readQueryParam (exercised via initSearch)
// ============================================

describe("readQueryParam", () => {
  test("reads the q param from the URL into the search input", async () => {
    document.body.innerHTML = SEARCH_HTML;
    window.pagefind = createMockPagefind();

    setSearchParam("hello");
    initSearch();

    expect(document.querySelector("input[type='search']").value).toBe("hello");
    await vi.waitFor(() =>
      expect(window.pagefind.search).toHaveBeenCalledWith("hello"),
    );
  });

  test("does not search when no q param is present", () => {
    document.body.innerHTML = SEARCH_HTML;
    window.pagefind = createMockPagefind();

    initSearch();

    expect(document.querySelector("input[type='search']").value).toBe("");
    expect(window.pagefind.search).not.toHaveBeenCalled();
  });
});

// ============================================
// handleSubmit (exercised via a real cancelable form submit event)
// ============================================

describe("handleSubmit", () => {
  /** Set up the page, init, set the input value, and submit the form. */
  const submitWith = (value) => {
    document.body.innerHTML = SEARCH_HTML;
    window.pagefind = createMockPagefind();
    initSearch();
    document.querySelector("input[type='search']").value = value;
    const event = new Event("submit", { cancelable: true });
    document.querySelector(".search-box").dispatchEvent(event);
    return event;
  };

  test("prevents default and searches with the trimmed input", async () => {
    const event = submitWith("  widgets  ");

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() =>
      expect(window.pagefind.search).toHaveBeenCalledWith("widgets"),
    );
  });

  test("updates URL with query parameter", () => {
    submitWith("gadgets");

    expect(window.location.search).toContain("q=gadgets");
  });

  test("does not search when input is empty", () => {
    const event = submitWith("   ");

    expect(event.defaultPrevented).toBe(true);
    expect(window.pagefind.search).not.toHaveBeenCalled();
  });
});

// ============================================
// searching (exercised via initSearch)
// ============================================

describe("searching (exercised via initSearch)", () => {
  test("displays message for no results", async () => {
    await searchWith(0, "nonexistent");
    expect(document.querySelector(".search-message").textContent).toBe(
      "No results found.",
    );
    expect(document.querySelector(".search-load-more").hidden).toBe(true);
  });

  test("renders results and shows count message", async () => {
    await searchWith(2);
    expect(document.querySelector(".search-message").textContent).toBe(
      "2 results found.",
    );
    expect(document.querySelectorAll(".search-result").length).toBe(2);
  });

  test("single result uses singular message and hides load-more", async () => {
    await searchWith(1);
    expect(document.querySelector(".search-message").textContent).toBe(
      "1 result found.",
    );
    expect(document.querySelector(".search-load-more").hidden).toBe(true);
  });

  test("shows the first page and loads more on click", async () => {
    await searchWith(12);
    expect(document.querySelectorAll(".search-result").length).toBe(10);
    expect(document.querySelector(".search-load-more").hidden).toBe(false);

    document.querySelector(".search-load-more").click();

    await vi.waitFor(() =>
      expect(document.querySelectorAll(".search-result").length).toBe(12),
    );
    expect(document.querySelector(".search-load-more").hidden).toBe(true);
  });

  test("a new search replaces the previous results", async () => {
    document.body.innerHTML = SEARCH_HTML;
    window.pagefind = createMockPagefind([
      createMockResultHandle({ url: "/first/" }),
      createMockResultHandle({ url: "/second/" }),
    ]);
    setSearchParam("first query");
    initSearch();
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".search-result").length).toBe(2),
    );

    window.pagefind.search = vi.fn(() =>
      Promise.resolve({
        results: [createMockResultHandle({ url: "/third/" })],
      }),
    );
    document.querySelector("input[type='search']").value = "second query";
    document
      .querySelector(".search-box")
      .dispatchEvent(new Event("submit", { cancelable: true }));

    await vi.waitFor(() =>
      expect(document.querySelectorAll(".search-result").length).toBe(1),
    );
    expect(document.querySelector(".search-result a").href).toContain(
      "/third/",
    );
  });
});

// ============================================
// initSearch
// ============================================

describe("initSearch", () => {
  test("does nothing when #search-results is absent", () => {
    document.body.innerHTML = "<div>No search here</div>";
    expect(() => initSearch()).not.toThrow();
  });

  test("populates page input, not unrelated navigation search box", () => {
    document.body.innerHTML = `
      <body class="design-system">
        <nav>
          <form class="search-box">
            <input type="search" name="q" id="nav-input">
          </form>
        </nav>
        <main>
          <div data-pagefind-ignore>
            <div class="design-system">
              <form action="/search/" method="get" class="search-box">
                <input type="search" name="q" id="page-input">
              </form>
            </div>
            <div id="search-results">
              <p class="search-message"></p>
              <ul class="search-results-list"></ul>
              <button class="search-load-more" hidden></button>
            </div>
          </div>
        </main>
      </body>
    `;
    window.pagefind = createMockPagefind();

    setSearchParam("hello");

    initSearch();

    expect(document.querySelector("#page-input").value).toBe("hello");
    expect(document.querySelector("#nav-input").value).toBe("");
  });
});
