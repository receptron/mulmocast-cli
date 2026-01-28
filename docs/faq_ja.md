# FAQ

## 互換性について

### Q: バージョンアップ後にコマンドが失敗するようになりました

**A: CLI バージョン 0.0.11 以前の`_studio.json`ファイルが原因の可能性があります。**

**エラー例**:
```json
currentStudio is invalid ZodError: [
  {
    "code": "unrecognized_keys",
    "keys": ["onComplete"],
    "path": ["beats", 0],
    "message": "Unrecognized key(s) in object: 'onComplete'"
  }
]
```

**原因**: v0.0.11 以前では、内部のスタジオコンテキストが v0.0.12 では無効となったフィールド（`onComplete`など）を保存していました。

**解決方法**: 対応する`_studio.json`ファイルを削除して、CLIを再実行してください。新しい互換性のあるバージョンが自動的に作成されます。

**`_studio.json`ファイルとは**: CLI 生成を実行すると自動的に作成される内部ファイル（例：`my_script_studio.json`）で、音声の長さ、画像パス、進行状況などの生成メタデータを保存します。

## 多言語対応について

### Q: 英語の動画に後から日本語の音声と字幕を追加できますか？

**A: はい、可能です。以下の手順で効率的に多言語版を作成できます。**

**ファイル構成**:
- **入力**: `your_script.json` (元のMulmoScriptファイル)
- **作業データ**: `output/your_script_studio.json` (自動生成・編集対象)
- **出力**: 
  - `output/your_script.mp4` (英語版)
  - `output/your_script_ja.mp4` (`-l ja`のみの場合)
  - `output/your_script__ja.mp4` (`-c ja`のみの場合)
  - `output/your_script_ja__ja.mp4` (`-l ja -c ja`の場合)

```bash
# 1. 英語版を作成（画像生成も含む）
mulmo movie your_script.json

# 2. 日本語音声・字幕版を作成（画像は再利用）
mulmo movie your_script.json -l ja -c ja
```

**注**: `your_script.json`は実際のファイル名に置き換えてください

### Q: `mulmo movie`コマンドの`-l ja`と`-c ja`オプションの違いは何ですか？

**A: 指定された言語へ翻訳後、`-l`は音声へ、`-c`は字幕へ反映します。**

- **`mulmo movie your_script.json -l ja`**: 日本語へ翻訳 + 日本語音声の生成
- **`mulmo movie your_script.json -c ja`**: 日本語へ翻訳 + 日本語字幕の生成
- **`mulmo movie your_script.json -l ja -c ja`**: 日本語へ翻訳 + 音声・字幕の両方

```bash
# 翻訳のみ実行したい場合
mulmo translate your_script.json
```

### Q: 翻訳結果を手動で修正したい場合はどうすればよいですか？

**A: `output/your_script_studio.json`ファイルの`multiLingualTexts.ja.text`を編集してください。**

以下の例は日本語（ja）の場合です。

```json
{
  "multiLingual": [
    {
      "multiLingualTexts": {
        "ja": {
          "text": "修正したい日本語テキスト",  // ← この部分を変更
          "texts": ["修正したい", "日本語テキスト"],
          "ttsTexts": ["修正したい", "日本語テキスト"]
        }
      }
    }
  ]
}
```

**手動修正後の再実行**:
```bash
mulmo movie your_script.json -l ja -c ja
```

**重要**: 元の`your_script.json`を変更しなければ、手動修正した翻訳データは保持され、LLM翻訳はスキップされます。

### Q: 音声と字幕はどのテキストを使用しますか？

**A: どちらも`multiLingualTexts.ja.text`を使用します。**

- **音声生成**: `multiLingualTexts.ja.text`
- **字幕生成**: `multiLingualTexts.ja.text`

## プレゼンテーションスタイル

### Q: `-p` オプションでプレゼンテーションスタイルを使うにはどうすればよいですか？

**A: `-p` オプションはスタイルJSONファイルへのファイルパスを受け取ります。サンプルをダウンロードするか、独自のスタイルを作成できます。**

**スタイルファイルの入手方法**:
- [GitHub](https://github.com/receptron/mulmocast-cli/tree/main/assets/styles)からサンプルスタイルをダウンロード
- 独自のカスタムスタイルJSONファイルを作成

**使用例**:
```bash
# ダウンロードしたスタイル
mulmo movie script.json -p ./downloaded-styles/ghibli_style.json

# プロジェクト固有のスタイル
mulmo movie script.json -p ./my-project/custom-style.json

# ユーザー共通スタイル
mulmo movie script.json -p ~/.mulmocast/styles/my-style.json
```

**注意**: `npm install -g mulmocast`でインストールした場合、スタイルファイルは含まれません。別途ダウンロードするか、独自に作成する必要があります。

### Q: 画像生成で 「403 Your organization must be verified to use the model 'gpt-image-1'」 エラーが発生します

**A: このエラーは、 画像生成で使用されている OpenAI `gpt-image-1` モデルを利用するのに組織認証を必要とするために発生します。**

**解決方法は以下の2つから選択できます：**

**方法1**: 組織認証を完了して `gpt-image-1` を使用する
- より高品質な画像生成が可能です
- [ベータ版リリースノート](beta1_ja.md)を参照して、OpenAIの組織認証を完了してください

**方法2**: 従来の `dall-e-3` を使用する
- 組織認証は不要です
- 以下の設定を MulmoScript に追加してください：

```json
{
  "imageParams": {
    "provider": "openai",
    "model": "dall-e-3"
  }
}
```

**背景**: バージョンアップにより、より高品質な画像生成が可能な `gpt-image-1` をデフォルトモデルに変更しました。`gpt-image-1` は組織認証が必要ですが、従来の `dall-e-3` は認証なしで利用可能です。

## 画像生成設定
### Q. 画像生成AIのモデルやプロバイダーを切り替えられますか？
**A. はい、⁠imageParams でプロバイダーやモデルを指定できます。**

詳しい設定例は [test_images.json](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_images.json) を参考にしてください。

## 音声（TTS）設定

### Q: TTSエンジンを変更するにはどうすればよいですか？

**A: TTSプロバイダーは2つの方法で指定できます。**

#### 方法1: 全体でTTSプロバイダーを指定
```json
{
  "speechParams": {
    "provider": "elevenlabs",
    "speakers": {
      "narrator": {
        "voiceId": "your-voice-id"
      }
    }
  }
}
```

**参考**: [test_voices.json](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_voices.json#L7) で具体的な設定例を確認できます。

#### 方法2: スピーカーごとにTTSプロバイダーを指定
```json
{
  "speechParams": {
    "provider": "openai",
    "speakers": {
      "narrator": {
        "provider": "elevenlabs",
        "voiceId": "voice-id-1"
      },
      "assistant": {
        "provider": "gemini",
        "voiceId": "Kore"
      }
    }
  }
}
```
スピーカー別の設定が優先され、未指定の場合は全体設定が使用されます。

**環境変数の設定**:
各プロバイダーを使用する場合は、対応するAPIキーを`.env`ファイルに設定してください。利用可能なプロバイダーと詳細は[Configuration](../README.md#configuration)を参照してください。

## API設定

### Q: baseURLは変更できますか？

**A: はい、OpenAI系サービスのbaseURLの変更が可能です。Azure OpenAIやカスタムエンドポイントに対応できます。**

```bash
# 基本設定（フォールバック）
OPENAI_BASE_URL=https://your-azure.openai.azure.com

# サービス別設定（優先）
LLM_OPENAI_BASE_URL=https://your-azure.openai.azure.com
TTS_OPENAI_BASE_URL=https://api.openai.com/v1
IMAGE_OPENAI_BASE_URL=https://custom-image-endpoint.com/v1
```

### Q: APIキーをサービス別に個別設定できますか？

**A: はい、主要なサービスで個別設定が可能です。**

```bash
# 基本設定（フォールバック）
OPENAI_API_KEY=sk-general-key
ANTHROPIC_API_TOKEN=your-claude-key
REPLICATE_API_TOKEN=your-replicate-key

# サービス別設定（優先）
LLM_OPENAI_API_KEY=sk-llm-key
TTS_OPENAI_API_KEY=sk-tts-key
IMAGE_OPENAI_API_KEY=sk-image-key
LLM_ANTHROPIC_API_TOKEN=sk-claude-key
MOVIE_REPLICATE_API_TOKEN=your-replicate-movie-key
```

**プレフィックス説明**: 以下の処理に利用します
- **LLM_**: 翻訳、スクリプト生成等のテキスト処理
- **TTS_**: 音声生成
- **IMAGE_**: 画像生成
- **MOVIE_**: 動画生成

**優先順位**: サービス固有設定 > 汎用設定

## トラブルシューティング

### Q: 画像生成で429エラーが発生します
```
An unexpected error occurred: RateLimitError: 429 {"message":null,"type":"image_generation_user_error","param":null,"code":null}
```

**A: OpenAI APIのレート制限によるエラーです。快適にご利用いただくために、Tier 2以上のプランをおすすめします。**

ChatGPT PlusとOpenAI APIは別サービスのため、APIご利用時は開発者向けプランへのアップグレードをご検討ください。詳細は[OpenAI Usage Tiers](https://platform.openai.com/docs/guides/rate-limits)をご参照ください。