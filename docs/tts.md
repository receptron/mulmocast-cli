# TTS Provider 追加手順

このドキュメントでは、新しいTTSプロバイダーをMulmoCastに追加する手順を説明します。

## 必須ステップ

### 1. TTS Agentの作成

**ファイル:** `src/agents/tts_xxx_agent.ts`

既存のTTS Agentを参考に新しいAgentを作成します。

```typescript
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { provider2TTSAgent } from "../utils/provider2agent.js";
import {
  apiKeyMissingError,
  agentIncorrectAPIKeyError,
  agentGenerationError,
  audioAction,
  audioFileTarget,
} from "../utils/error_cause.js";
import type { XxxTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult, AgentConfig } from "../types/agent.js";

export const ttsXxxAgent: AgentFunction<XxxTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs, AgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { text } = namedInputs;
  const { voice, suppressError } = params;
  const { apiKey } = config ?? {};

  // API key validation
  if (!apiKey) {
    throw new Error("Xxx API key is required (XXX_API_KEY)", {
      cause: apiKeyMissingError("ttsXxxAgent", audioAction, "XXX_API_KEY"),
    });
  }

  try {
    // TTS API call implementation
    // ...
    return { buffer };
  } catch (error) {
    if (suppressError) {
      return { error };
    }
    // Error handling with proper causes
    throw new Error("TTS Xxx Error", {
      cause: agentGenerationError("ttsXxxAgent", audioAction, audioFileTarget),
    });
  }
};

const ttsXxxAgentInfo: AgentFunctionInfo = {
  name: "ttsXxxAgent",
  agent: ttsXxxAgent,
  mock: ttsXxxAgent,
  samples: [],
  description: "Xxx TTS agent",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["XXX_API_KEY"],
};

export default ttsXxxAgentInfo;
```

**ファイル:** `src/agents/index.ts`

作成したAgentをエクスポートに追加します。

```typescript
export { default as ttsXxxAgent } from "./tts_xxx_agent.js";
```

### 2. Provider情報の追加

**ファイル:** `src/utils/provider2agent.ts`

`provider2TTSAgent` オブジェクトに新しいプロバイダー情報を追加します。

```typescript
export const provider2TTSAgent = {
  // ... existing providers
  xxx: {
    agentName: "ttsXxxAgent",
    hasLimitedConcurrency: true, // API制限がある場合はtrue
    defaultVoice: "default-voice-id", // デフォルトの音声ID（オプション）
    defaultModel: "default-model", // デフォルトモデル（オプション）
    models: ["model-1", "model-2"], // 利用可能なモデルリスト（オプション）
    keyName: "XXX_API_KEY", // 環境変数名
    baseURLKeyName: "XXX_BASE_URL", // baseURLの環境変数名（オプション、OpenAI互換APIの場合）
    apiKeyNameOverride: "XXX_API_TOKEN", // 標準と異なるAPI key名を使う場合（オプション）
  },
};
```

**重要:** `provider2TTSAgent`に情報を追加するだけで、`utils.ts`の`settings2GraphAIConfig`が自動的に設定を生成します。以下の処理が自動で行われます：
- `TTS_XXX_API_KEY`または`XXX_API_KEY`環境変数からAPI keyを取得
- `baseURLKeyName`が指定されている場合、`TTS_XXX_BASE_URL`または`XXX_BASE_URL`からbaseURLを取得
- `apiKeyNameOverride`が指定されている場合、そのキー名を優先的に使用

### 3. GraphAI Agentとして登録

**ファイル:** `src/actions/audio.ts`

GraphAIのagentsリストに新しいAgentを追加します。

```typescript
import { ttsXxxAgent } from "../agents/index.js";

const agents = {
  // ... existing agents
  ttsXxxAgent,
};
```

## オプションステップ

### 4. 型定義の追加（カスタムパラメータがある場合）

**ファイル:** `src/types/agent.ts`

プロバイダー固有のパラメータを追加する場合は、型定義を作成します。

```typescript
export type XxxTTSAgentParams = TTSAgentParams & {
  customParam1: string;
  customParam2: number;
};
```

基本の `TTSAgentParams` には以下が含まれます：
- `suppressError: boolean`
- `voice: string`

### 5. MulmoScript スキーマの拡張（オプション）

**ファイル:** `src/types/schema.ts`

MulmoScriptでプロバイダー固有のパラメータを指定できるようにする場合は、`speechOptionsSchema` を拡張します。

```typescript
const speechOptionsSchema = z.object({
  // ... existing options
  customParam1: z.string().optional(),
  customParam2: z.number().optional(),
});
```

## チェックリスト

新しいTTSプロバイダーを追加する際は、以下を確認してください：

- [ ] `src/agents/tts_xxx_agent.ts` を作成
- [ ] `src/agents/index.ts` にエクスポートを追加
- [ ] `src/utils/provider2agent.ts` の `provider2TTSAgent` に追加（API key設定は自動生成されます）
- [ ] `src/actions/audio.ts` の `agents` に追加
- [ ] 必要に応じて `src/types/agent.ts` に型定義を追加
- [ ] 必要に応じて `src/types/schema.ts` のスキーマを拡張
- [ ] ビルドエラーがないことを確認: `yarn build`
- [ ] Lintエラーがないことを確認: `yarn lint`
- [ ] 実際のAPI呼び出しでテスト

## 参考実装

既存のTTS Agentを参考にしてください：

- **OpenAI**: `src/agents/tts_openai_agent.ts` - 標準的な実装例、`baseURLKeyName`を使った例
- **Gemini**: `src/agents/tts_gemini_agent.ts` - PCM to MP3変換を含む例
- **ElevenLabs**: `src/agents/tts_elevenlabs_agent.ts` - fetch APIを使用した例
- **Kotodama**: `src/agents/tts_kotodama_agent.ts` - カスタムパラメータ（decoration）を含む例

## 実装例: provider2agent.tsの設定

### OpenAI互換APIの場合（baseURLをサポート）

```typescript
openai: {
  agentName: "ttsOpenaiAgent",
  hasLimitedConcurrency: false,
  defaultModel: "gpt-4o-mini-tts",
  defaultVoice: "shimmer",
  keyName: "OPENAI_API_KEY",
  baseURLKeyName: "OPENAI_BASE_URL", // baseURLを使う場合
},
```

この設定により、以下の環境変数が自動的に読み込まれます：
- `TTS_OPENAI_API_KEY` または `OPENAI_API_KEY`
- `TTS_OPENAI_BASE_URL` または `OPENAI_BASE_URL`

### 標準と異なるAPIキー名を使う場合

```typescript
anthropic: {
  agentName: "anthropicAgent",
  defaultModel: "claude-3-7-sonnet-20250219",
  keyName: "ANTHROPIC_API_KEY",
  apiKeyNameOverride: "ANTHROPIC_API_TOKEN", // 実際には ANTHROPIC_API_TOKEN を使う
},
```

この設定により、`LLM_ANTHROPIC_API_TOKEN` または `ANTHROPIC_API_TOKEN` が優先的に使用されます。