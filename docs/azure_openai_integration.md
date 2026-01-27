# Azure OpenAI Integration Design

MulmoCastでAzure OpenAIをサポートするための設計ドキュメント。

## 概要

OpenAIのエージェント（画像生成、TTS等）を拡張し、`baseURL`パラメータでAzure OpenAIエンドポイントを指定可能にする。

### 検出ロジック

```typescript
function isAzureEndpoint(baseURL: string | undefined): boolean {
  return baseURL?.includes(".openai.azure.com") ?? false;
}
```

- `baseURL`が`.openai.azure.com`を含む場合: `AzureOpenAI`クラスを使用
- それ以外: 通常の`OpenAI`クラスを使用

### クライアント作成ユーティリティ

```typescript
import OpenAI, { AzureOpenAI } from "openai";

interface OpenAIClientOptions {
  apiKey?: string;
  baseURL?: string;
  apiVersion?: string; // Azure専用
}

function createOpenAIClient(options: OpenAIClientOptions): OpenAI | AzureOpenAI {
  const { apiKey, baseURL, apiVersion } = options;

  if (baseURL?.includes(".openai.azure.com")) {
    return new AzureOpenAI({
      apiKey,
      endpoint: baseURL,
      apiVersion: apiVersion ?? "2025-04-01-preview",
    });
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}
```

## スキーマ変更

### 1. 画像生成 (`mulmoBeatImageParamsSchema`)

**ファイル**: `src/types/schema.ts`

**現在**:
```typescript
export const mulmoBeatImageParamsSchema = z
  .object({
    provider: text2ImageProviderSchema,
    model: z.string().optional(),
    quality: z.string().optional(),
    style: z.string().optional(),
    moderation: z.string().optional(),
  })
  .strict();
```

**変更後**:
```typescript
export const mulmoBeatImageParamsSchema = z
  .object({
    provider: text2ImageProviderSchema,
    model: z.string().optional(),
    quality: z.string().optional(),
    style: z.string().optional(),
    moderation: z.string().optional(),
    baseURL: z.string().optional(),    // 追加: Azure/カスタムエンドポイント
    apiVersion: z.string().optional(), // 追加: Azure API version
  })
  .strict();
```

### 2. TTS (`speakerDataSchema`)

**ファイル**: `src/types/schema.ts`

**現在**:
```typescript
export const speakerDataSchema = z
  .object({
    displayName: z.record(langSchema, z.string()).optional(),
    voiceId: z.string(),
    isDefault: z.boolean().optional(),
    speechOptions: speechOptionsSchema.optional(),
    provider: text2SpeechProviderSchema.optional(),
    model: z.string().optional(),
  })
  .strict();
```

**変更後**:
```typescript
export const speakerDataSchema = z
  .object({
    displayName: z.record(langSchema, z.string()).optional(),
    voiceId: z.string(),
    isDefault: z.boolean().optional(),
    speechOptions: speechOptionsSchema.optional(),
    provider: text2SpeechProviderSchema.optional(),
    model: z.string().optional(),
    baseURL: z.string().optional(),    // 追加: Azure/カスタムエンドポイント
    apiVersion: z.string().optional(), // 追加: Azure API version
  })
  .strict();
```

### 3. Movie生成 (`mulmoMovieParamsSchema`) - 将来対応

```typescript
baseURL: z.string().optional(),
apiVersion: z.string().optional(),
```

### 4. Sound Effect (`mulmoSoundEffectParamsSchema`) - 将来対応

```typescript
baseURL: z.string().optional(),
apiVersion: z.string().optional(),
```

## エージェント変更

### 1. 画像生成エージェント (`src/agents/image_openai_agent.ts`)

**変更内容**:
- `createOpenAIClient()`ユーティリティを使用
- 入力スキーマに`baseURL`と`apiVersion`を追加
- Azure検出とクライアント切り替え

**入力スキーマ変更**:
```typescript
const inputSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  quality: z.string().optional(),
  style: z.string().optional(),
  baseURL: z.string().optional(),    // 追加
  apiVersion: z.string().optional(), // 追加
});
```

### 2. TTSエージェント (`src/agents/tts_openai_agent.ts`)

**変更内容**:
- `createOpenAIClient()`ユーティリティを使用
- 入力スキーマに`baseURL`と`apiVersion`を追加
- Azure検出とクライアント切り替え

## MulmoScript例

### 画像生成（Azure）

```json
{
  "imageParams": {
    "provider": "openai",
    "model": "dall-e-3",
    "baseURL": "https://your-resource.openai.azure.com/",
    "apiVersion": "2025-04-01-preview"
  }
}
```

### TTS（Azure）

```json
{
  "speechParams": {
    "speakers": {
      "Presenter": {
        "provider": "openai",
        "voiceId": "alloy",
        "model": "tts",
        "baseURL": "https://your-tts-resource.openai.azure.com/",
        "apiVersion": "2025-04-01-preview"
      }
    }
  }
}
```

### 環境変数との組み合わせ

`baseURL`を指定しない場合は、従来通り環境変数`OPENAI_API_KEY`と標準エンドポイントを使用。

Azure使用時は環境変数でAPIキーを設定:
```bash
# .env.azure
AZURE_OPENAI_IMAGE_KEY=your-key
AZURE_OPENAI_IMAGE_ENDPOINT=https://your-resource.openai.azure.com/

AZURE_OPENAI_TTS_KEY=your-key
AZURE_OPENAI_TTS_ENDPOINT=https://your-tts-resource.openai.azure.com/
```

## 実装順序

### Phase 1: 画像生成（優先） - 完了

1. [x] `src/types/schema.ts` - `mulmoBeatImageParamsSchema`に`baseURL`, `apiVersion`追加
2. [x] `src/utils/openai_client.ts` - `createOpenAIClient()`ユーティリティ作成
3. [x] `src/agents/image_openai_agent.ts` - Azure対応
4. [x] テストスクリプト作成・検証 (`ms_test/test_azure_image_agent.ts`)

### Phase 2: TTS

1. [ ] `src/types/schema.ts` - `speakerDataSchema`に`baseURL`, `apiVersion`追加
2. [ ] `src/agents/tts_openai_agent.ts` - Azure対応
3. [ ] テストスクリプト作成・検証

### Phase 3: その他（将来）

- Movie生成エージェント
- Sound Effectエージェント

## 注意事項

### Azure固有の制限

- **TTS**: North Central US または Sweden Central のみ
- **モデル名**: Azureではdeployment名を使用（`dall-e-3`など）
- **API Version**: Azureでは明示的な指定が必要

### 後方互換性

- `baseURL`/`apiVersion`は全てoptional
- 指定しない場合は従来通りOpenAI標準エンドポイントを使用
- 既存のMulmoScriptは変更なしで動作

### APIキーの扱い

- OpenAI: `OPENAI_API_KEY`環境変数
- Azure: 別途環境変数を定義（`AZURE_OPENAI_IMAGE_KEY`等）
- MulmoScript内にAPIキーは含めない（セキュリティ）
