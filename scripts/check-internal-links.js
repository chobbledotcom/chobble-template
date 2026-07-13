#!/usr/bin/env bun

import path from "node:path";
import { runInternalLinkCheck } from "#scripts/internal-links.js";

const outputDir = path.resolve(process.argv[2] || "_site");
process.exit(runInternalLinkCheck(outputDir));
