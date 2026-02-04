#!/usr/bin/env node

import { cliMain } from "./main.js";
import { GraphAILogger } from "graphai";

cliMain().catch((error) => {
  GraphAILogger.info("An unexpected error occurred:", error);
  process.exit(1);
});
