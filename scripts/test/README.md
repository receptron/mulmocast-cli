# MulmoCast Test Scripts

このディレクトリには、MulmoCastの機能テスト用のMulmoScriptサンプルが含まれています。

This directory contains MulmoScript samples for testing MulmoCast features.

## 📋 テストカテゴリ / Test Categories

### 🎯 基本テスト / Basic Tests

**シンプルな動作確認用のテストスクリプト**

Simple test scripts for basic functionality verification

- [**test_hello.json**](./test_hello.json) - 最もシンプルなHello Worldテスト / Simplest Hello World test
- [**test.json**](./test.json) - 基本的な動作テスト / Basic functionality test
- [**test1.json**](./test1.json), [**test2.json**](./test2.json) - 追加の基本テスト / Additional basic tests
- [**test_beats.json**](./test_beats.json) - Beatの基本機能テスト / Beat basic features test

### 🎤 TTS（音声合成）テスト / TTS (Text-to-Speech) Tests

**各種音声合成プロバイダーのテスト**

Tests for various TTS providers

- [**test_all_tts.json**](./test_all_tts.json) - 全TTSプロバイダーのテスト（OpenAI, Gemini, Google, ElevenLabs） / All TTS providers test
- [**test_audio.json**](./test_audio.json) - 音声パラメータのテスト（padding, duration, movieVolumeなど） / Audio parameters test
- [**test_audio_gemini.json**](./test_audio_gemini.json) - Gemini TTSの個別テスト / Gemini TTS specific test
- [**test_audio_instructions.json**](./test_audio_instructions.json) - OpenAI TTS instructionsのテスト / OpenAI TTS instructions test
- [**test_elevenlabs_models.json**](./test_elevenlabs_models.json) - ElevenLabsの複数モデルテスト / ElevenLabs multiple models test
- [**test_voices.json**](./test_voices.json) - 複数の音声設定テスト / Multiple voice settings test
- [**test_mixed_providers.json**](./test_mixed_providers.json) - 複数のTTSプロバイダー混在テスト / Mixed TTS providers test

### 🖼️ 画像生成テスト / Image Generation Tests

**画像生成機能のテスト**

Image generation feature tests

- [**test_images.json**](./test_images.json) - 画像生成の基本テスト / Basic image generation test
- [**test_hello_image.json**](./test_hello_image.json) - Hello World画像テスト / Hello World image test
- [**test_image_refs.json**](./test_image_refs.json) - 参照画像を使った生成テスト / Image generation with references
- [**test_markdown.json**](./test_markdown.json) - Markdown形式の画像テスト / Markdown format image test
- [**test_html.json**](./test_html.json) - HTMLから画像生成テスト / HTML to image test
- [**test_vision.json**](./test_vision.json) - Vision APIを使った画像生成テスト / Vision API image test
- [**test_layout.json**](./test_layout.json) - レイアウト機能のテスト / Layout features test

### 🎬 動画生成テスト / Video Generation Tests

**動画生成機能のテスト**

Video generation feature tests

- [**test_movie.json**](./test_movie.json) - 動画生成の基本テスト（imagePrompt + moviePrompt） / Basic video generation test
- [**test_movie2.json**](./test_movie2.json) - 動画生成の追加テスト / Additional video generation test
- [**test_genai_movie.json**](./test_genai_movie.json) - GenAI動画生成テスト / GenAI video generation test
- [**test_genai.json**](./test_genai.json) - GenAI機能テスト / GenAI features test
- [**test_replicate.json**](./test_replicate.json) - Replicate動画生成テスト / Replicate video generation test
- [**test_mv.json**](./test_mv.json) - ミュージックビデオ形式のテスト / Music video format test

### 🎭 高度な機能テスト / Advanced Feature Tests

**特殊機能や複雑なシナリオのテスト**

Special features and complex scenario tests

- [**test_spillover.json**](./test_spillover.json) - 音声スピルオーバー機能テスト / Audio spillover feature test
- [**test_lipsync.json**](./test_lipsync.json) - リップシンク機能テスト / Lip-sync feature test
- [**test_transition.json**](./test_transition.json) - トランジション効果テスト / Transition effects test
- [**test_transition_no_audio.json**](./test_transition_no_audio.json) - 音声なしトランジションテスト / Transition without audio test
- [**test_slideout_left_no_audio.json**](./test_slideout_left_no_audio.json) - スライドアウト効果テスト / Slide-out effect test
- [**test_sound_effect.json**](./test_sound_effect.json) - サウンドエフェクトテスト / Sound effect test
- [**test_voice_over.json**](./test_voice_over.json) - ボイスオーバー機能テスト / Voice-over feature test
- [**test_captions.json**](./test_captions.json) - 字幕機能テスト / Caption feature test
- [**test_hello_caption.json**](./test_hello_caption.json) - Hello World字幕テスト / Hello World caption test
- [**test_loop.json**](./test_loop.json) - ループ再生テスト / Loop playback test
- [**test_video_speed.json**](./test_video_speed.json) - 動画速度調整テスト / Video speed adjustment test

### 🔧 特殊条件テスト / Special Condition Tests

**エッジケースや特殊な条件のテスト**

Edge cases and special condition tests

- [**test_no_audio.json**](./test_no_audio.json) - 音声なし動画テスト / Video without audio test
- [**test_no_audio_with_credit.json**](./test_no_audio_with_credit.json) - クレジット付き音声なしテスト / No audio with credits test
- [**test_hello_nobgm.json**](./test_hello_nobgm.json) - BGMなしテスト / Test without BGM
- [**test_size_error.json**](./test_size_error.json) - サイズエラーテスト / Size error test
- [**test_media.json**](./test_media.json) - メディアファイル処理テスト / Media file processing test
- [**test_order.json**](./test_order.json) - 順序処理テスト / Order processing test
- [**test_order_portrait.json**](./test_order_portrait.json) - 縦向き順序テスト / Portrait order test

### 🌍 多言語テスト / Multi-language Tests

**言語設定のテスト**

Language setting tests

- [**test_lang.json**](./test_lang.json) - 多言語サポートテスト / Multi-language support test
- [**test_en.json**](./test_en.json) - 英語専用テスト / English-only test

### 🎯 プロバイダー別テスト / Provider-Specific Tests

**特定プロバイダーの機能テスト**

Provider-specific feature tests

- [**test_hello_google.json**](./test_hello_google.json) - Google TTS専用テスト / Google TTS specific test
- [**test_gpt_image.json**](./test_gpt_image.json) - GPT image model test
- [**mulmo_story.json**](./mulmo_story.json) - ストーリー形式テスト / Story format test
- [**nano_banana.json**](./nano_banana.json) - カスタムサンプル / Custom sample

## 🚀 使い方 / Usage

### 基本的な実行方法 / Basic Execution

```bash
# 動画生成
# Generate video
yarn movie scripts/test/test_hello.json

# 音声のみ生成
# Generate audio only
yarn audio scripts/test/test_audio.json

# 画像のみ生成
# Generate images only
yarn images scripts/test/test_images.json
```

### 強制再生成 / Force Regeneration

キャッシュを無視して再生成する場合は `-f` フラグを使用:

Use the `-f` flag to ignore cache and regenerate:

```bash
yarn movie scripts/test/test_hello.json -f
```

## 📝 テストスクリプト作成のヒント / Tips for Creating Test Scripts

1. **シンプルから始める** - `test_hello.json` を参考に基本構造を理解
2. **機能を段階的に追加** - 一度に複数の機能をテストせず、段階的に追加
3. **既存のテストを参考にする** - 同じカテゴリのテストスクリプトを参考に
4. **適切な命名** - `test_<feature>.json` の形式で目的が分かりやすい名前を付ける

---

1. **Start simple** - Refer to `test_hello.json` to understand basic structure
2. **Add features incrementally** - Don't test multiple features at once
3. **Reference existing tests** - Look at tests in the same category
4. **Use descriptive naming** - Use `test_<feature>.json` format for clarity

## 🔗 関連ドキュメント / Related Documentation

- [メインREADME](../../README.md)
- [MulmoScript Schema](../../docs/schena.md)
- [TTS Provider追加手順](../../docs/tts.md)
- [Image Plugin仕様](../../docs/image_plugin.md)
- [音声スピルオーバー](../../docs/sound_and_voice.md)
