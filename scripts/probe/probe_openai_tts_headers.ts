// #1428 — Probe OpenAI TTS response headers to discover whether token usage
// for `gpt-4o-mini-tts` is surfaced anywhere we can read.
//
// `gpt-4o-mini-tts` is token-billed (text input + audio output), unlike
// `tts-1` / `tts-1-hd` which are character-billed. The SDK return type is
// `APIPromise<Response>` (a raw Response), and the JSON body is the audio
// bytes — no `usage` field. The open question is: does OpenAI return any
// `x-...usage...` style header on this endpoint similar to the
// `x-ratelimit-*` family on chat completions?
//
// Usage:
//   OPENAI_API_KEY=sk-... npx tsx scripts/probe/probe_openai_tts_headers.ts
//
// Optional env:
//   PROBE_MODEL=gpt-4o-mini-tts  (default; also try tts-1 / tts-1-hd / gpt-4o-tts)
//   PROBE_TEXT="Hello, world. This is a probe."
//   PROBE_VOICE=alloy

import dotenv from "dotenv";
import { createOpenAIClient } from "../../src/utils/openai_client.js";

dotenv.config({ quiet: true });

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY required");
  process.exit(1);
}

const model = process.env.PROBE_MODEL ?? "gpt-4o-mini-tts";
const text = process.env.PROBE_TEXT ?? "Hello world. This is a header probe for the OpenAI text-to-speech API.";
const voice = (process.env.PROBE_VOICE ?? "alloy") as "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";

const main = async () => {
  const openai = createOpenAIClient({ apiKey });
  console.log(`model: ${model}`);
  console.log(`voice: ${voice}`);
  console.log(`text:  ${JSON.stringify(text)} (length=${text.length})`);

  const before = Date.now();
  // Use .asResponse() to retain the raw Response object so we can read headers
  // before draining the body.
  const response = await openai.audio.speech.create({ model, voice, input: text }).asResponse();
  const elapsedMs = Date.now() - before;

  console.log(`\n=== Response status ===`);
  console.log(`${response.status} ${response.statusText}  (${elapsedMs} ms)`);

  console.log(`\n=== ALL response headers ===`);
  const headerEntries: Array<[string, string]> = [];
  response.headers.forEach((value, name) => {
    headerEntries.push([name, value]);
  });
  headerEntries.sort(([a], [b]) => a.localeCompare(b));
  for (const [name, value] of headerEntries) {
    console.log(`  ${name}: ${value}`);
  }

  console.log(`\n=== Headers of interest ===`);
  const interesting = [
    "openai-processing-ms",
    "openai-model",
    "openai-organization",
    "openai-version",
    "openai-prompt-tokens",
    "openai-completion-tokens",
    "openai-total-tokens",
    "x-ratelimit-limit-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-remaining-tokens",
    "x-ratelimit-reset-requests",
    "x-ratelimit-reset-tokens",
    "x-request-id",
    "x-openai-input-tokens",
    "x-openai-output-tokens",
    "x-openai-audio-tokens",
    "input-tokens",
    "output-tokens",
    "total-tokens",
    "audio-tokens",
  ];
  for (const name of interesting) {
    const value = response.headers.get(name);
    if (value !== null) {
      console.log(`  ${name}: ${value}`);
    } else {
      console.log(`  ${name}: <absent>`);
    }
  }

  // Drain the body so the underlying connection is released.
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`\n=== Body ===`);
  console.log(`audio bytes: ${buffer.length}`);

  console.log(`\n=== Verdict ===`);
  const tokenHeaders = headerEntries.filter(([n]) => /token|usage/i.test(n));
  if (tokenHeaders.length > 0) {
    console.log(`Token-like headers found:`);
    for (const [n, v] of tokenHeaders) console.log(`  ${n}: ${v}`);
    console.log(`→ Update tts_openai_agent.ts to read these.`);
  } else {
    console.log(`No token-related headers surfaced.`);
    console.log(`→ Falling back to inputChars: text.length is the only signal for ${model}.`);
  }
};

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
