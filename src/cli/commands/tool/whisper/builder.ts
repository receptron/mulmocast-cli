import { Argv } from "yargs";

export const builder = (yargs: Argv) => {
  return yargs.positional("file", {
    describe: "File path to process",
    type: "string",
    demandOption: true,
  });
};
