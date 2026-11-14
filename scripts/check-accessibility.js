#!/usr/bin/env node

import { runAccessibilityCheck } from "#scripts/accessibility.js";
import { runOutputCheck } from "#scripts/lib/run-output-check.js";

await runOutputCheck(runAccessibilityCheck);
