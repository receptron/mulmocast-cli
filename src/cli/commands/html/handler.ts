import { images, html } from "../../../actions/index.js";
import { CliArgs } from "../../../types/cli_types.js";
import { initializeContext, runTranslateIfNeeded } from "../../helpers.js";

export const handler = async (argv: CliArgs<{ image_width?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  await runTranslateIfNeeded(context);
  await images(context);

  await html(context, argv.image_width);
};
