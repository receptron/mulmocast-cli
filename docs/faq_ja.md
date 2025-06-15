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

**A: どちらも翻訳処理を自動実行しますが、それぞれ異なる機能を制御します。**

- **`mulmo movie your_script.json -l ja`**: 翻訳処理 + 日本語音声の生成
- **`mulmo movie your_script.json -c ja`**: 翻訳処理 + 日本語字幕の生成
- **`mulmo movie your_script.json -l ja -c ja`**: 翻訳処理 + 日本語音声・字幕の両方

```bash
# 翻訳のみ実行したい場合
mulmo translate your_script.json
```

### Q: 翻訳結果を手動で修正したい場合はどうすればよいですか？

**A: `output/your_script_studio.json`ファイルの`multiLingualTexts.ja.text`を編集してください。**

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