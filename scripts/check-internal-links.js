#!/usr/bin/env node

import { runInternalLinkCheck } from "#scripts/internal-links.js";
import { runOutputCheck } from "#scripts/lib/run-output-check.js";

await runOutputCheck(runInternalLinkCheck);
