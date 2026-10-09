import { createElement } from "#public/utils/dom.js";

const PAGE_SIZE = 10;

/**
 * The site's path prefix, read from the bundle script tag so search works
 * when the site is served from a subdirectory. Defaults to "/" when the
 * attribute is absent.
 */
const pathPrefix = () =>
  document.querySelector("script[data-path-prefix]")?.dataset.pathPrefix || "/";

export const initSearch = () => {
  const loadPagefind = async () => {
    if (window.pagefind) return window.pagefind;
    const pagefind = await import(`${pathPrefix()}pagefind/pagefind.js`);
    await pagefind.options({ baseUrl: pathPrefix() });
    await pagefind.init();
    return pagefind;
  };

  const renderResult = (result) => {
    const card = createElement("li", "search-result");

    const link = createElement("a", "search-result__link");
    link.href = result.url;

    if (result.meta?.image) {
      const img = createElement("img", "search-result__image");
      img.src = result.meta.image;
      img.alt = "";
      img.loading = "lazy";
      link.appendChild(img);
    }

    const body = createElement("div", "search-result__body");

    const title = createElement("h3", "");
    title.textContent = result.meta.title;
    body.appendChild(title);

    if (result.excerpt) {
      const excerpt = document.createElement("p");
      excerpt.innerHTML = result.excerpt;
      body.appendChild(excerpt);
    }

    link.appendChild(body);
    card.appendChild(link);
    return card;
  };

  const createSearchController = (elements) => {
    const state = { results: [], shown: 0 };

    const showMore = async () => {
      const next = state.results.slice(state.shown, state.shown + PAGE_SIZE);
      const loaded = await Promise.all(next.map((r) => r.data()));
      for (const result of loaded) {
        elements.list.appendChild(renderResult(result));
      }
      state.shown += next.length;
      elements.loadMore.hidden = state.shown >= state.results.length;
    };

    const runSearch = async (query) => {
      const pagefind = await loadPagefind();
      const search = await pagefind.search(query);
      state.results = search.results;
      state.shown = 0;
      elements.list.innerHTML = "";

      if (state.results.length === 0) {
        elements.message.textContent = elements.labels.noResults;
        elements.loadMore.hidden = true;
        return;
      }

      // The count in the page language: one/other plural forms from
      // #search-results' data attributes, {count} standing for the number. An
      // unset lang (never so on a built page) uses the default locale.
      const locales = [document.documentElement.lang].filter(Boolean);
      const form = new Intl.PluralRules(locales).select(state.results.length);
      const { one, other } = elements.labels;
      elements.message.textContent = (form === "one" ? one : other).replace(
        "{count}",
        String(state.results.length),
      );
      await showMore();
    };

    elements.loadMore.addEventListener("click", showMore);

    return { runSearch, input: elements.input };
  };

  const readQueryParam = () =>
    new URLSearchParams(window.location.search).get("q");

  const handleSubmit = (controller) => (e) => {
    e.preventDefault();
    const query = controller.input?.value?.trim();
    if (!query) return;
    const url = new URL(window.location);
    url.searchParams.set("q", query);
    window.history.replaceState(null, "", url);
    controller.runSearch(query);
  };

  const container = document.querySelector("#search-results");
  if (!container) return;

  const form = container.parentElement?.querySelector(".search-box");

  const controller = createSearchController({
    list: container.querySelector(".search-results-list"),
    message: container.querySelector(".search-message"),
    loadMore: container.querySelector(".search-load-more"),
    input: form?.querySelector("input[type='search']"),
    labels: {
      noResults: container.dataset.noResultsLabel,
      one: container.dataset.resultCountOneLabel,
      other: container.dataset.resultCountOtherLabel,
    },
  });

  if (form) {
    form.addEventListener("submit", handleSubmit(controller));
  }

  const query = readQueryParam();
  if (query) {
    if (controller.input) controller.input.value = query;
    controller.runSearch(query);
  }
};
