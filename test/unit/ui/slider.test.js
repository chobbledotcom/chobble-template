import { afterEach, expect, test, vi } from "vitest";
import { onReady } from "#public/utils/on-ready.js";
import { initSliders } from "#public/utils/slider-core.js";

vi.mock("#public/utils/on-ready.js", () => ({ onReady: vi.fn() }));
vi.mock("#public/utils/slider-core.js", () => ({ initSliders: vi.fn() }));

afterEach(() => vi.clearAllMocks());

test("initializes list sliders with their configured defaults only when ready", async () => {
  await import("#public/ui/slider.js");
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(initSliders).not.toHaveBeenCalled();

  const [initialize] = onReady.mock.calls[0];
  initialize();

  expect(initSliders).toHaveBeenCalledExactlyOnceWith(".slider-container", {
    itemSelector: "li",
    defaultWidth: 240,
  });
});
