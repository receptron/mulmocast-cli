# Google Vertex AI セットアップガイド

MulmoCast で Google Vertex AI を使用して画像生成・動画生成を行うための設定ガイドです。

## 概要

MulmoCast は Google の生成AI機能を2つの方法で利用できます：

| 方式 | 認証方法 | 用途 |
|------|---------|------|
| Gemini API | API キー (`GEMINI_API_KEY`) | 個人開発、プロトタイピング |
| Vertex AI | ADC (Application Default Credentials) | エンタープライズ、本番環境 |

一部のモデル（Imagen 4 など）は Vertex AI でのみ利用可能な場合があります。

## 前提条件

- Google Cloud プロジェクト
- Google Cloud CLI (`gcloud`) インストール済み
- 適切な IAM 権限

```bash
# gcloud CLI のインストール (macOS)
brew install google-cloud-sdk

# ログイン
gcloud auth login
```

## セットアップ

### 1. プロジェクトの設定

```bash
# プロジェクトIDの確認
gcloud projects list

# デフォルトプロジェクトの設定
gcloud config set project YOUR_PROJECT_ID
```

### 2. API の有効化

```bash
# Vertex AI API を有効化
gcloud services enable aiplatform.googleapis.com

# Generative AI API を有効化
gcloud services enable generativelanguage.googleapis.com
```

### 3. Application Default Credentials (ADC) の設定

```bash
# ADC の設定（ブラウザが開きます）
gcloud auth application-default login

# 設定確認
gcloud auth application-default print-access-token
```

## MulmoCast での使用方法

### MulmoScript での設定

`imageParams` または `movieParams` に `vertexai_project` を追加します：

```json
{
  "title": "My Presentation",
  "imageParams": {
    "provider": "google",
    "model": "imagen-4.0-generate-001",
    "vertexai_project": "your-project-id",
    "vertexai_location": "us-central1"
  },
  "beats": [
    {
      "text": "Hello, world!",
      "imagePrompt": "A beautiful sunset over the ocean"
    }
  ]
}
```

### パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|-----------|
| `vertexai_project` | Google Cloud プロジェクト ID | なし（設定時に Vertex AI モード） |
| `vertexai_location` | リージョン | `us-central1` |

### 動画生成の設定

```json
{
  "movieParams": {
    "provider": "google",
    "model": "veo-2.0-generate-001",
    "vertexai_project": "your-project-id",
    "vertexai_location": "us-central1"
  }
}
```

### TTS（音声合成）の設定

Vertex AI 経由で Google Cloud TTS または Gemini TTS を使用できます。TTS は ADC で認証され、`vertexai_project` の指定は不要です。設定例は [テスト用スクリプト](../scripts/test/test_vertexai.json) を参照してください。


### beat レベルでのオーバーライド

個別の beat でモデルを変更する場合、`vertexai_project` と `vertexai_location` も指定が必要です：

```json
{
  "beats": [
    {
      "text": "高品質な画像を生成します",
      "imagePrompt": "A woman walking through Tokyo at night",
      "imageParams": {
        "model": "imagen-4.0-ultra-generate-001",
        "vertexai_project": "your-project-id",
        "vertexai_location": "us-central1"
      }
    },
    {
      "text": "動画を生成します",
      "moviePrompt": "Ocean waves crashing on a beach",
      "movieParams": {
        "model": "veo-3.0-generate-001",
        "vertexai_project": "your-project-id",
        "vertexai_location": "us-central1"
      }
    }
  ]
}
```

## 利用可能なモデル

### 画像生成

| モデル | 説明 |
|--------|------|
| `imagen-4.0-generate-001` | Imagen 4 標準版 |
| `imagen-4.0-ultra-generate-001` | Imagen 4 高品質版 |
| `imagen-4.0-fast-generate-001` | Imagen 4 高速版 |
| `gemini-2.5-flash-image` | Gemini ベースの画像生成 |
| `gemini-3-pro-image-preview` | Gemini 3 Pro 画像生成 |

**注意**:
- Gemini 画像モデルはリージョンによって利用できない場合があります
- `gemini-3-pro-image-preview` は `global` で利用可能です（[参考](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image) 2026-02-04 現在）
  
### 動画生成

| モデル | 説明 |
|--------|------|
| `veo-2.0-generate-001` | Veo 2.0 |
| `veo-3.0-generate-001` | Veo 3.0 |
| `veo-3.1-generate-preview` | Veo 3.1 プレビュー |

### TTS（音声合成）

| プロバイダー | モデル/voiceId | 説明 |
|-------------|---------------|------|
| Google Cloud TTS | `en-US-Studio-O` | 英語（米国）Studio 音声 |
| Google Cloud TTS | `ja-JP-Standard-A` | 日本語 Standard 音声 |
| Gemini TTS | `gemini-2.5-pro-tts` | Gemini ベースの TTS |

**注意**: 利用可能な voiceId は各サービスのドキュメントを参照してください。

## リージョン

Vertex AI は以下のリージョンで利用可能です：

- `us-central1` (推奨)
- `us-east1`
- `us-west1`
- `europe-west1`
- `asia-northeast1` (東京)

## Gemini API との違い

| 項目 | Gemini API | Vertex AI |
|------|-----------|-----------|
| 認証 | API キー | ADC / サービスアカウント |
| 料金 | 従量課金 | Google Cloud 請求 |
| クォータ | API レベル | プロジェクトレベル |
| SLA | なし | あり |
| モデル | 一部制限あり | 全モデル利用可能 |

## トラブルシューティング

### 認証エラー

```
Error: Could not load the default credentials
```

ADC が設定されていません。以下を実行してください：

```bash
gcloud auth application-default login
```

### 権限エラー

```
Error: Permission denied
```

IAM 権限を確認してください：

```bash
# Vertex AI ユーザー権限の付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/aiplatform.user"
```

### リージョンエラー

モデルが指定したリージョンで利用できない場合があります。`us-central1` を試してください

### vertexai_project 未設定エラー

```
Error: Google GenAI API key is required (GEMINI_API_KEY)
```

**原因**: `vertexai_project` を設定しないと Gemini API 経由で生成しようとします。Gemini API も設定されていない場合にこのエラーが発生します。

**解決方法**: `vertexai_project` が正しく設定されているか確認してください

### モデルが見つからないエラー

```
Error: Publisher Model was not found
```

**原因**: 指定したモデルが Vertex AI で利用できない、またはリージョン未対応

**解決方法**: モデル名の再確認、または `vertexai_location` をモデルが対応しているリージョンに変更してください

## 参考リンク

- [Vertex AI ドキュメント](https://cloud.google.com/vertex-ai/docs)
- [Imagen API リファレンス](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Veo API リファレンス](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [ADC の設定](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [テスト用スクリプト](../scripts/test/test_vertexai.json) - `YOUR_PROJECT_ID` を置き換えて使用
