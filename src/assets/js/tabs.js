import { onReady } from "#assets/on-ready.js";

const processed = new WeakSet();

const addListener = (link) => {
  if (processed.has(link)) return;
  processed.add(link);
  link.addEventListener("click", (event) => {
    event.preventDefault();
    history.pushState({}, "", link.href);
    history.pushState({}, "", link.href);
    history.back();
  });
};

const initTabs = () => {
  const tabs = document.querySelectorAll("#tabs a[href^='#tab-']");
  if (tabs.length === 0) return;
  tabs.forEach(addListener);
};

onReady(initTabs);
