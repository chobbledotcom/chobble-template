// Shared helper for video-background blocks (bunny, youtube).
// Collects iframe + thumbnail pairs for every container in the design-system
// scope that matches the given data attribute.

import { mapFilter, pipe } from "#toolkit/fp/array.js";

const SCOPE = ".design-system";

export const getVideoContainerPairs = (dataAttr) =>
  pipe(
    Array.from,
    mapFilter((container) => {
      const iframe = container.querySelector("iframe");
      const thumbnail = container.querySelector(".video-background__thumbnail");
      return iframe && thumbnail ? { iframe, thumbnail } : null;
    }),
  )(document.querySelectorAll(`${SCOPE} [data-${dataAttr}]`));
