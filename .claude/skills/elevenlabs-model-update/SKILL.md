---
name: elevenlabs-model-update
description: ElevenLabs の新モデル追加時に使用。provider2agent.ts のモデルリスト更新とテストスクリプト更新を行う。
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch
disable-model-invocation: true
---

# ElevenLabs Model Update

ElevenLabs に新しい TTS モデルが追加された際の更新手順。

## 対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/provider2agent.ts` | `provider2TTSAgent.elevenlabs.models` 配列にモデル名を追加 |
| `scripts/test/test_elevenlabs_models.json` | 新モデル用のテストビート（speaker + beat）を追加 |

## 手順

### 1. 新モデルの情報収集

ElevenLabs の公式ドキュメントで新モデルの仕様を確認する:
- https://elevenlabs.io/docs/overview/models
- エンドポイントが `/v1/text-to-speech` かどうか（別エンドポイントの場合は agent 側の対応が必要）
- 対応言語数
- 既存 voice との互換性

### 2. モデルリスト更新

`src/types/provider2agent.ts` の `provider2TTSAgent.elevenlabs.models` 配列に新モデルを追加する。
デフォルトモデルを変更する場合は `defaultModel` も更新。

### 3. テスト用 voice の選定

ElevenLabs は一部モデル（v3 等）で最適化済み voice を用意している場合がある。

**Voice Slot の注意事項:**
- 各プランに voice slot 上限がある（Free: 3, Starter: 10, Creator: 30 等）
- Voice Library の voice は **事前に My Voices に追加しないと使えない**（API で voice_id を指定してもエラーになる）
- Default/premade voice は slot を消費しない
- API で voice を My Voices に追加する場合: `POST /v1/voices/add/{public_user_id}/{voice_id}`

アカウントの voice 一覧と対応モデルを確認するコマンド:
```bash
source .env
# 全 voice の対応モデル確認
curl -s "https://api.elevenlabs.io/v1/voices" -H "xi-api-key: $ELEVENLABS_API_KEY" \
  | jq '[.voices[] | {name, voice_id, category, high_quality_base_model_ids}]'

# 特定モデル（例: eleven_v3）対応の voice のみ
curl -s "https://api.elevenlabs.io/v1/voices" -H "xi-api-key: $ELEVENLABS_API_KEY" \
  | jq '[.voices[] | select(.high_quality_base_model_ids | contains(["eleven_v3"])) | {name, voice_id}]'
```

### 4. テストスクリプト更新

`scripts/test/test_elevenlabs_models.json` に以下を追加:
- `speechParams.speakers` に新しい speaker エントリ（英語 + 日本語）
- `beats` に対応するテストビート

### 5. 動作確認

```bash
yarn build
yarn cli movie scripts/test/test_elevenlabs_models.json -o output/elevenlabs-test
```

### 6. 確認しないモデルについて

以下のモデルは TTS エンドポイントではないため、`ttsElevenlabsAgent` の対象外:
- `eleven_ttv_v3`: Voice Design 用（`POST /v1/text-to-voice/design`）。voice_id を生成するモデルで、TTS ではない

## 現在のモデル一覧

| モデル名 | 用途 | 備考 |
|---------|------|------|
| `eleven_v3` | 最新 TTS | 70+ 言語、高感情表現 |
| `eleven_multilingual_v2` | TTS（デフォルト） | 29 言語 |
| `eleven_turbo_v2_5` | 低レイテンシー TTS | 32 言語、250-300ms |
| `eleven_turbo_v2` | 低レイテンシー TTS | 英語のみ |
| `eleven_flash_v2_5` | 超低レイテンシー TTS | 32 言語、~75ms |
| `eleven_flash_v2` | 超低レイテンシー TTS | 英語のみ |
