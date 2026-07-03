import { translate } from "../../../actions/index.js";
import { dumpUsageIfRequested, initializeContext, printUsageEstimate } from "../../helpers.js";
import { CliArgs } from "../../../types/cli_types.js";

export const handler = async (argv: CliArgs<{ estimate?: boolean; json?: boolean; i?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  if (argv.estimate) {
    printUsageEstimate(context, "translate", argv.json);
    return;
  }
  await translate(context);
  dumpUsageIfRequested(context);
};
