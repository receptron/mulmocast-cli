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
    defaultVoice: "default-voice-id",
    defaultModel: "default-model", // モデル指定がある場合
    models: ["model-1", "model-2"], // 利用可能なモデルリスト（オプション）
    keyName: "XXX_API_KEY",
  },
};
```

### 3. API Key設定の追加

**ファイル:** `src/utils/utils.ts`

`settings2GraphAIConfig` 関数に新しいAPI keyマッピングを追加します。

```typescript
export const settings2GraphAIConfig = (settings: UserSettings) => {
  return {
    // ... existing mappings
    ttsXxxAgent: { apiKey: settings.XXX_API_KEY },
  };
};
```

### 4. GraphAI Agentとして登録

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

### 5. 型定義の追加（カスタムパラメータがある場合）

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

### 6. MulmoScript スキーマの拡張（オプション）

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
- [ ] `src/utils/provider2agent.ts` の `provider2TTSAgent` に追加
- [ ] `src/utils/utils.ts` の `settings2GraphAIConfig` に追加
- [ ] `src/actions/audio.ts` の `agents` に追加
- [ ] 必要に応じて `src/types/agent.ts` に型定義を追加
- [ ] 必要に応じて `src/types/schema.ts` のスキーマを拡張
- [ ] ビルドエラーがないことを確認: `yarn build`
- [ ] Lintエラーがないことを確認: `yarn lint`
- [ ] 実際のAPI呼び出しでテスト

## 参考実装

既存のTTS Agentを参考にしてください：

- **OpenAI**: `src/agents/tts_openai_agent.ts` - 標準的な実装例
- **Gemini**: `src/agents/tts_gemini_agent.ts` - PCM to MP3変換を含む例
- **ElevenLabs**: `src/agents/tts_elevenlabs_agent.ts` - fetch APIを使用した例
- **Kotodama**: `src/agents/tts_kotodama_agent.ts` - カスタムパラメータ（decoration）を含む例