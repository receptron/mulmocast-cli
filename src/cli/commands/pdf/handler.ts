import { images, pdf, pdfPuppeteer } from "../../../actions/index.js";
import { CliArgs } from "../../../types/cli_types.js";
import { initializeContext, runTranslateIfNeeded } from "../../../cli/helpers.js";

export const handler = async (argv: CliArgs<{ i?: string; pdf_mode: string; pdf_size: string; pdf_engine: string }>) => {
  const context = await initializeContext(argv);
  await runTranslateIfNeeded(context, argv);
  await images(context);

  if (argv.pdf_engine === "puppeteer") {
    await pdfPuppeteer(context, argv.pdf_mode, argv.pdf_size);
  } else {
    await pdf(context, argv.pdf_mode, argv.pdf_size);
  }
};
