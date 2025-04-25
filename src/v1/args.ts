import yargs from "yargs";

export const args = yargs
  .scriptName("mulmocast")
  .option("outdir", {
    description: "output dir",
    demandOption: false,
    type: "string",
  })
  .option("scratchpad", {
    description: "scratchpad dir",
    demandOption: false,
    type: "string",
  })
  .option("basedir", {
    description: "base dir",
    demandOption: false,
    type: "string",
  })
  .command("* <ScriptFile>", "run mulmocast.")
  /*  .positional("CCC", {
    describe: "DDD",
    type: "string",
    demandOption: false,
  })*/
  .parseSync();
