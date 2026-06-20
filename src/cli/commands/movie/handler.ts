import { audio, images, movie, captions } from "../../../actions/index.js";
import { CliArgs } from "../../../types/cli_types.js";
import { dumpUsageIfRequested, initializeContext, runTranslateIfNeeded } from "../../helpers.js";

export const handler = async (argv: CliArgs<{ a?: string; i?: string; c?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  await runTranslateIfNeeded(context, true);
  await audio(context).then(images).then(captions).then(movie);
  dumpUsageIfRequested(context);
};
