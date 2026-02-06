import { onReady } from "#public/utils/on-ready.js";

const PAGE_SIZE = 10;

const renderResult = (result) => {
  const card = document.createElement("li");
  card.className = "search-result";

  const link = document.createElement("a");
  link.href = result.url;
  link.className = "search-result__link";

  if (result.meta?.image) {
    const img = document.createElement("img");
    img.src = result.meta.image;
    img.alt = "";
    img.loading = "lazy";
    img.className = "search-result__image";
    link.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "search-result__body";

  const title = document.createElement("h3");
  title.textContent = result.meta?.title || result.url;
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

const loadPagefind = async () => {
  if (window.pagefind) return window.pagefind;
  const pagefind = await import("/pagefind/pagefind.js");
  await pagefind.init();
  return pagefind;
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
    if (!query) {
      elements.message.textContent = "";
      elements.list.innerHTML = "";
      elements.loadMore.hidden = true;
      return;
    }

    const pagefind = await loadPagefind();
    const search = await pagefind.search(query);
    state.results = search.results;
    state.shown = 0;
    elements.list.innerHTML = "";

    if (state.results.length === 0) {
      elements.message.textContent = "No results found.";
      elements.loadMore.hidden = true;
      return;
    }

    elements.message.textContent = `${state.results.length} result${state.results.length === 1 ? "" : "s"} found.`;
    await showMore();
  };

  elements.loadMore.addEventListener("click", showMore);

  return { runSearch, input: elements.input };
};

const initSearch = () => {
  const container = document.querySelector("#search-results");
  if (!container) return;

  const form = container
    .closest(".design-system")
    ?.querySelector(".search-box");

  const controller = createSearchController({
    list: container.querySelector(".search-results-list"),
    message: container.querySelector(".search-message"),
    loadMore: container.querySelector(".search-load-more"),
    input: form?.querySelector("input[type='search']"),
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = controller.input?.value?.trim();
      if (query) {
        const url = new URL(window.location);
        url.searchParams.set("q", query);
        window.history.replaceState(null, "", url);
        controller.runSearch(query);
      }
    });
  }

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) {
    if (controller.input) controller.input.value = query;
    controller.runSearch(query);
  }
};

onReady(initSearch);

export { initSearch, renderResult, createSearchController };
