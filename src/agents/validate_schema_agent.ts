import { assert, type AgentFunction, type AgentFunctionInfo, type DefaultConfigData } from "graphai";
import { MulmoScript } from "../types/index.js";
import { ZodSchema } from "zod";

interface ValidateMulmoScriptInputs {
  text: string;
  schema: ZodSchema;
}

interface ValidateMulmoScriptResponse {
  isValid: boolean;
  data?: MulmoScript;
  error?: string;
}

/**
 * Zod schema validation agent
 * Validates if a JSON string conforms to the Zod schema
 */
export const validateSchemaAgent: AgentFunction<object, ValidateMulmoScriptResponse, ValidateMulmoScriptInputs, DefaultConfigData> = async ({
  namedInputs,
}) => {
  const { text, schema } = namedInputs;
  try {
    assert(!!schema, "schema is required");
    assert(!!text, "text is required");

    const jsonData = JSON.parse(text);
    const parsed = schema.parse(jsonData) as MulmoScript;
    return {
      isValid: true,
      data: parsed,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const validateMulmoScriptAgentInfo: AgentFunctionInfo = {
  name: "validateSchemaAgent",
  agent: validateSchemaAgent,
  mock: validateSchemaAgent,
  samples: [],
  description: "Validates if a JSON string conforms to the Zod schema",
  category: ["validation"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/tree/main/src/agents/validate_schema_agent.ts",
  license: "MIT",
};

export default validateMulmoScriptAgentInfo;
