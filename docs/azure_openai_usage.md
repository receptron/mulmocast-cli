# MulmoCast で Azure OpenAI を使用する

MulmoCast で Azure OpenAI サービスを利用するための設定ガイドです。

## 前提条件

- Azure OpenAI リソースが作成済み
- 必要なモデルがデプロイ済み
- カスタムドメインが設定済み（エンドポイントが `https://<resource-name>.openai.azure.com/` の形式）

Azure OpenAI リソースのセットアップ方法は [azure_setup.md](./azure_setup.md) を参照してください。

## 重要: デプロイメント名の設定

**デプロイメント名はモデル名と完全に一致させてください。**

MulmoCast は MulmoScript の `model` パラメータをそのまま Azure OpenAI のデプロイメント名として使用します。

### 正しい設定例

| モデル | デプロイメント名 |
|--------|------------------|
| `gpt-image-1.5` | `gpt-image-1.5` |
| `dall-e-3` | `dall-e-3` |
| `tts` | `tts` |
| `tts-hd` | `tts-hd` |

### よくある間違い

```bash
# NG: ハイフンに置き換えている
--deployment-name gpt-image-1-5   # 動作しない

# OK: モデル名と同じ
--deployment-name gpt-image-1.5   # 動作する
```

デプロイメント作成コマンド例:
```bash
az cognitiveservices account deployment create \
  --name <resource-name> \
  --resource-group <resource-group> \
  --deployment-name "gpt-image-1.5" \
  --model-name gpt-image-1.5 \
  --model-version "2025-12-16" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name GlobalStandard
```

## 画像生成 (Image)

### 環境変数

`.env` ファイルに以下を設定:

```bash
IMAGE_OPENAI_API_KEY=<Azure OpenAI APIキー>
IMAGE_OPENAI_BASE_URL=https://<resource-name>.openai.azure.com/
```

### MulmoScript 設定

```json
{
  "imageParams": {
    "provider": "openai",
    "model": "gpt-image-1.5"
  }
}
```

### 対応モデル

| モデル | 利用可能リージョン |
|--------|-------------------|
| `gpt-image-1.5` | Sweden Central, West US 3, East US 2 |
| `gpt-image-1` | Sweden Central, West US 3, East US 2 |
| `dall-e-3` | East US, Sweden Central, Australia East |

## TTS (音声合成)

*（今後追記予定）*

### 環境変数

```bash
TTS_OPENAI_API_KEY=<Azure OpenAI APIキー>
TTS_OPENAI_BASE_URL=https://<resource-name>.openai.azure.com/
```

### 対応モデル

| モデル | 利用可能リージョン |
|--------|-------------------|
| `tts` | North Central US, Sweden Central |
| `tts-hd` | North Central US, Sweden Central |

## リージョン選択

全モデル（画像生成 + TTS）を1つのリソースで使用する場合は **Sweden Central** を推奨します。

| リージョン | gpt-image-1.5 | TTS |
|-----------|---------------|-----|
| Sweden Central | ✓ | ✓ |
| East US | ✗ | ✓ |
| East US 2 | ✓ | ✗ |
| West US 3 | ✓ | ✗ |
| North Central US | ✗ | ✓ |
| Japan | ✗ | ✗ |

## トラブルシューティング

### 404 The API deployment for this resource does not exist

**原因**: デプロイメント名とモデル名が一致していない

**解決方法**:
1. 現在のデプロイメントを確認:
   ```bash
   az cognitiveservices account deployment list \
     --name <resource-name> \
     --resource-group <resource-group> \
     -o table
   ```
2. デプロイメント名がモデル名と一致しない場合、削除して再作成:
   ```bash
   # 削除
   az cognitiveservices account deployment delete \
     --name <resource-name> \
     --resource-group <resource-group> \
     --deployment-name <old-deployment-name>

   # 再作成（モデル名と同じ名前で）
   az cognitiveservices account deployment create \
     --name <resource-name> \
     --resource-group <resource-group> \
     --deployment-name "gpt-image-1.5" \
     --model-name gpt-image-1.5 \
     ...
   ```

### 400 Invalid value for model

**原因**: 存在しないモデル名を指定している

**解決方法**: デプロイ済みのモデル名を確認し、MulmoScript の `model` パラメータを修正

### 認証エラー

**原因**: APIキーまたはエンドポイントが間違っている

**解決方法**:
```bash
# エンドポイント確認
az cognitiveservices account show \
  --name <resource-name> \
  --resource-group <resource-group> \
  --query "properties.endpoint" -o tsv

# APIキー取得
az cognitiveservices account keys list \
  --name <resource-name> \
  --resource-group <resource-group> \
  --query "key1" -o tsv
```

## 設計について

### 環境変数方式を採用した理由

現在、Azure OpenAI のエンドポイント設定は**環境変数**で行います。MulmoScript 内での指定ではありません。

```bash
# 環境変数で設定（現在の方式）
IMAGE_OPENAI_BASE_URL=https://<resource-name>.openai.azure.com/
```

この方式を採用した理由:

1. **Azure URL はユーザー固有**: Azure OpenAI のエンドポイントにはリソース名が含まれ、ユーザーごとに異なります。MulmoScript に埋め込むとスクリプトの共有が困難になります。

2. **APIキーとの一貫性**: APIキーは環境変数で管理するため、エンドポイントも同様に環境変数で管理するのが自然です。

3. **設定の簡素化**: プロジェクト全体で Azure を使用する場合、環境変数を1回設定するだけで全ての MulmoScript に適用されます。

### 注意点

環境変数で設定した場合、**プロジェクト全体で共有**されます:

- 同一プロジェクト内の全ての MulmoScript が同じ Azure リソースを使用
- OpenAI と Azure を MulmoScript 単位で切り替えることは現在できません
- 切り替えが必要な場合は環境変数を変更してください

### 将来の拡張

MulmoScript のスキーマには `baseURL` と `apiVersion` フィールドが定義されています:

```json
{
  "imageParams": {
    "provider": "openai",
    "model": "gpt-image-1.5",
    "baseURL": "https://...",
    "apiVersion": "2025-04-01-preview"
  }
}
```

これらは将来の拡張用に予約されています。MulmoScript 内でエンドポイントを指定できるようになれば、beat 単位での Azure/OpenAI 切り替えが可能になります。

## 参考リンク

- [Azure OpenAI セットアップガイド](./azure_setup.md)
- [Azure OpenAI 統合設計ドキュメント](./azure_openai_integration.md)
