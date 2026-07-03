import { audio, images, movie, captions } from "../../../actions/index.js";
import { CliArgs } from "../../../types/cli_types.js";
import { dumpUsageIfRequested, initializeContext, runTranslateIfNeeded, printUsageEstimate } from "../../helpers.js";

export const handler = async (argv: CliArgs<{ estimate?: boolean; json?: boolean; a?: string; i?: string; c?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  if (argv.estimate) {
    printUsageEstimate(context, "movie", argv.json);
    return;
  }
  await runTranslateIfNeeded(context, true);
  await audio(context).then(images).then(captions).then(movie);
  dumpUsageIfRequested(context);
};
