import { audio } from "../../../actions/index.js";
import { dumpUsageIfRequested, initializeContext, runTranslateIfNeeded, printUsageEstimate } from "../../helpers.js";
import { CliArgs } from "../../../types/cli_types.js";

export const handler = async (argv: CliArgs<{ estimate?: boolean; json?: boolean; a?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  if (argv.estimate) {
    printUsageEstimate(context, "audio", argv.json);
    return;
  }
  await runTranslateIfNeeded(context);
  await audio(context);
  dumpUsageIfRequested(context);
};
