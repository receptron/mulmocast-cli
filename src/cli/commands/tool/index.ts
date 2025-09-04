import { ToolCliArgs } from "../../../types/cli_types.js";
import * as scriptingCmd from "./scripting/index.js";
import * as promptCmd from "./prompt/index.js";
import * as schemaCmd from "./schema/index.js";
import * as storyToScriptCmd from "./story_to_script/index.js";
import * as whisperCmd from "./whisper/index.js";
import { Argv } from "yargs";

export const command = "tool <command>";
export const desc = "Generate Mulmo script and other tools";

export const builder = (y: Argv) =>
  y.command(scriptingCmd).command(promptCmd).command(schemaCmd).command(storyToScriptCmd).command(whisperCmd).demandCommand().strict();

export const handler = (__argv: ToolCliArgs) => {};
