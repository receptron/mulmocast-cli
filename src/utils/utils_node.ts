import * as crypto from "crypto";

export const text2hash = (input: string): string => {
  return crypto.createHash("sha256").update(input).digest("hex");
};
