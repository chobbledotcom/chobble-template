import { describe, expect, test } from "bun:test";
import { createElement, getSharedDocument } from "#utils/dom-builder.js";

describe("dom-builder", () => {
  test("createElement with array of children appends all children", async () => {
    const doc = await getSharedDocument();
    const child1 = doc.createElement("span");
    child1.textContent = "child1";
    const child2 = doc.createElement("span");
    child2.textContent = "child2";

    const element = await createElement("div", {}, [child1, child2]);

    expect(element.children.length).toBe(2);
    expect(element.children[0].textContent).toBe("child1");
    expect(element.children[1].textContent).toBe("child2");
  });

  test("createElement with single element child appends it", async () => {
    const doc = await getSharedDocument();
    const child = doc.createElement("span");
    child.textContent = "single";

    const element = await createElement("div", {}, child);

    expect(element.children.length).toBe(1);
    expect(element.children[0].textContent).toBe("single");
  });
});
