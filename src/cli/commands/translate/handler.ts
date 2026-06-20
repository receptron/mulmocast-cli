import { translate } from "../../../actions/index.js";
import { dumpUsageIfRequested, initializeContext } from "../../helpers.js";
import { CliArgs } from "../../../types/cli_types.js";

export const handler = async (argv: CliArgs<{ i?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  await translate(context);
  dumpUsageIfRequested(context);
};
