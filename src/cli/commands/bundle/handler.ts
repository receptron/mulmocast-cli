import { mulmoViewerBundle, audio, images, translate } from "../../../actions/index.js";
import { CliArgs } from "../../../types/cli_types.js";
import { initializeContext } from "../../helpers.js";
import { bundleTargetLang } from "../../../types/const.js";

export const handler = async (argv: CliArgs<{ image_width?: string }>) => {
  const context = await initializeContext(argv);
  if (!context) {
    process.exit(1);
  }
  await translate(context, { targetLangs: bundleTargetLang });

  for (const lang of bundleTargetLang.filter((_lang) => _lang !== context.lang)) {
    await audio({ ...context, lang });
  }

  await audio(context).then(images).then(mulmoViewerBundle);
};
