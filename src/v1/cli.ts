#!/usr/bin/env node

import "dotenv/config";

import { args } from "./args";

const main = () => {
  if (args.outdir) {
    console.log("out dir");
    console.log(args.outdir);
  }
  console.log("hello");
};
main();
