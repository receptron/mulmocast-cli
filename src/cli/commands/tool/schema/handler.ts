import { mulmoScriptSchema } from "../../../../types/schema.js";
import { z } from "zod";
import { GraphAILogger } from "graphai";
import { ToolCliArgs } from "../../../../types/cli_types.js";
import { setGraphAILogger } from "../../../../cli/helpers.js";

export const handler = async (argv: ToolCliArgs) => {
  const { v: verbose } = argv;
  setGraphAILogger(verbose);

  const defaultSchema = z.toJSONSchema(mulmoScriptSchema);
  GraphAILogger.info(JSON.stringify(defaultSchema, null, 2));
};
