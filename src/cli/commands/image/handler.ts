import { images } from "../../../actions/index.js";
import { CliArgs } from "../../../types/cli_types.js";
import { dumpUsageIfRequested, initializeContext, runTranslateIfNeeded } from "../../helpers.js";

export const handler = async (argv: CliArgs<{ i?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  await runTranslateIfNeeded(context);
  await images(context);
  dumpUsageIfRequested(context);
};
