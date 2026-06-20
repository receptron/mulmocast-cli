import { audio } from "../../../actions/index.js";
import { dumpUsageIfRequested, initializeContext, runTranslateIfNeeded } from "../../helpers.js";
import { CliArgs } from "../../../types/cli_types.js";

export const handler = async (argv: CliArgs<{ a?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  await runTranslateIfNeeded(context);
  await audio(context);
  dumpUsageIfRequested(context);
};
