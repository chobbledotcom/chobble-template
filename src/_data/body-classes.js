import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const themePath = join(process.cwd(), "src/css/theme.scss");
const bodyClasses = !existsSync(themePath)
  ? []
  : readFileSync(themePath, "utf8")
      .match(/\/\* body_classes: (.+) \*\//)?.[1]
      ?.split(",")
      ?.map((s) => s.trim());

export default bodyClasses;
