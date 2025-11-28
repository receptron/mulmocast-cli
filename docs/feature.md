# MulmoCast Features / MulmoCast機能一覧

このドキュメントでは、MulmoCastの機能、特に標準的な動画生成以外の特殊機能について説明します。

This document describes MulmoCast features, especially advanced features beyond standard video generation.

## 📝 標準機能 / Standard Features

基本的な動画・音声・画像生成機能：

Basic video, audio, and image generation features:

- **TTS (Text-to-Speech)** - 複数のプロバイダー対応（OpenAI, Gemini, Google, ElevenLabs, Nijivoice, Kotodama）
- **画像生成 (Image Generation)** - OpenAI DALL-E, Google Imagen, Replicate対応
- **動画生成 (Video Generation)** - Google Veo, Replicate各種モデル対応
- **PDF生成 (PDF Generation)** - プレゼンテーション資料のPDF化
- **多言語対応 (Multi-language)** - 翻訳・多言語音声生成

---

## 🎯 特殊機能 / Advanced Features

### 1. 音声スピルオーバー (Audio Spillover)

一つの音声を複数のBeatにまたがって再生する機能。ミュージックビデオや長いナレーションの分割表示に便利。

Share a single audio track across multiple beats, useful for music videos or splitting long narrations across slides.

**主な機能 / Key Features:**
- 音声の自動継続再生 / Automatic audio continuation across beats
- duration自動配分 / Automatic duration distribution
- 最小保証時間（1秒）/ Minimum duration guarantee (1 second)

**使用例 / Example:**

```json
{
  "beats": [
    {
      "text": "This beat has a long audio, which exceeds the beat duration.",
      "duration": 2,
      "image": { "type": "textSlide", "slide": { "title": "First Slide" } }
    },
    {
      "image": { "type": "textSlide", "slide": { "title": "Second Slide" } }
    }
  ]
}
```

**詳細ドキュメント / Documentation:** [sound_and_voice.md](./sound_and_voice.md)
**サンプル / Sample:** [scripts/test/test_spillover.json](../scripts/test/test_spillover.json)

---

### 2. トランジション効果 (Transition Effects)

Beat間の映像切り替えにトランジション効果を追加。

Add transition effects between beats for smooth visual transitions.

**対応トランジション / Available Transitions:**
- `fade` - フェード効果 / Fade effect
- `slideout_left` - 左スライドアウト効果 / Slide-out left effect

**設定項目 / Configuration:**

```json
{
  "movieParams": {
    "transition": {
      "type": "fade",
      "duration": 0.5
    }
  }
}
```

- `type`: トランジションタイプ / Transition type
- `duration`: トランジション時間（0〜2秒）/ Transition duration (0-2 seconds)

**サンプル / Samples:**
- [scripts/test/test_transition.json](../scripts/test/test_transition.json)
- [scripts/test/test_slideout_left_no_audio.json](../scripts/test/test_slideout_left_no_audio.json)

---

### 3. ボイスオーバー (Voice Over)

動画の上に音声を重ねて再生。既存の動画に後からナレーションを追加する際に使用。

Overlay audio on top of video, useful for adding narration to existing videos.

**設定方法 / Configuration:**

```json
{
  "beats": [
    {
      "text": "This narration will be overlaid on the video",
      "image": {
        "type": "voice_over",
        "startAt": 2.5
      }
    }
  ]
}
```

- `type`: `"voice_over"`
- `startAt`: 音声の開始時刻（秒）/ Audio start time in seconds (optional)

**サンプル / Sample:** [scripts/test/test_voice_over.json](../scripts/test/test_voice_over.json)

---

### 4. サウンドエフェクト (Sound Effects)

動画にサウンドエフェクトを自動生成・追加。

Automatically generate and add sound effects to videos.

**設定方法 / Configuration:**

```json
{
  "soundEffectParams": {
    "provider": "replicate",
    "model": "zsxkib/mmaudio"
  },
  "beats": [
    {
      "text": "A rocket launches into space",
      "soundEffectPrompt": "rocket launch sound with fire and explosion",
      "moviePrompt": "A rocket launching from a launch pad"
    }
  ]
}
```

- `soundEffectParams`: プロバイダーとモデル設定 / Provider and model configuration
- `soundEffectPrompt`: 効果音の説明 / Sound effect description (beat level)

**サンプル / Sample:** [scripts/test/test_sound_effect.json](../scripts/test/test_sound_effect.json)

---

### 5. リップシンク (Lip Sync)

静止画像やキャラクターに音声に合わせた口の動きを追加。

Add lip-sync animation to static images or characters based on audio.

**設定方法 / Configuration:**

```json
{
  "lipSyncParams": {
    "provider": "replicate",
    "model": "bytedance/omni-human"
  },
  "beats": [
    {
      "text": "Hello, this is a lip sync test",
      "enableLipSync": true,
      "image": {
        "type": "image",
        "source": { "kind": "path", "path": "character.png" }
      }
    }
  ]
}
```

- `lipSyncParams`: プロバイダーとモデル設定 / Provider and model configuration (global)
- `enableLipSync`: リップシンクの有効化 / Enable lip sync (beat level)

**対応モデル / Available Models:**
- `bytedance/omni-human` (推奨 / recommended)
- `bytedance/latentsync`
- `tmappdev/lipsync`

**サンプル / Sample:** [scripts/test/test_lipsync.json](../scripts/test/test_lipsync.json)

---

### 6. 字幕 (Captions)

動画に字幕を追加。言語やスタイルのカスタマイズが可能。

Add captions to videos with customizable language and styles.

**設定方法 / Configuration:**

```json
{
  "captionParams": {
    "lang": "en",
    "styles": [
      "font-size: 48px;",
      "color: white;",
      "text-shadow: 2px 2px 4px black;"
    ]
  },
  "beats": [
    {
      "text": "This text will appear as captions",
      "captionParams": {
        "styles": ["font-size: 64px;"]
      }
    }
  ]
}
```

- `lang`: 字幕の言語 / Caption language (optional)
- `styles`: CSSスタイル配列 / CSS styles array

グローバル設定とBeat個別設定の両方が可能。

Both global and per-beat configuration are supported.

**サンプル / Samples:**
- [scripts/test/test_captions.json](../scripts/test/test_captions.json)
- [scripts/test/test_hello_caption.json](../scripts/test/test_hello_caption.json)

---

### 7. 動画速度調整 (Video Speed Control)

生成された動画の再生速度を変更。

Adjust playback speed of generated videos.

**設定方法 / Configuration:**

```json
{
  "beats": [
    {
      "movieParams": {
        "speed": 0.5
      },
      "moviePrompt": "Slow motion water splash"
    }
  ]
}
```

- `speed`: 再生速度（0.5 = 半速、1.0 = 通常、2.0 = 倍速）/ Playback speed (0.5 = half, 1.0 = normal, 2.0 = double)

**サンプル / Sample:** [scripts/test/test_video_speed.json](../scripts/test/test_video_speed.json)

---

### 8. BGM（背景音楽）

プレゼンテーション全体にBGMを追加。音量調整も可能。

Add background music to entire presentation with volume control.

**設定方法 / Configuration:**

```json
{
  "audioParams": {
    "bgm": {
      "kind": "path",
      "path": "background_music.mp3"
    },
    "bgmVolume": 0.2,
    "audioVolume": 1.0
  }
}
```

- `bgm`: BGMファイルの指定（path, url, base64）/ BGM file source
- `bgmVolume`: BGMの音量（0.0〜1.0、デフォルト: 0.2）/ BGM volume (default: 0.2)
- `audioVolume`: 音声の音量（デフォルト: 1.0）/ Audio volume (default: 1.0)

---

### 9. 音声タイミング制御 (Audio Timing Control)

Beat間のタイミングや音声の開始・終了時の無音時間を詳細に制御。

Fine-tune timing between beats and silence at audio start/end.

**設定方法 / Configuration:**

```json
{
  "audioParams": {
    "introPadding": 1.0,
    "padding": 0.3,
    "closingPadding": 0.8,
    "outroPadding": 1.0,
    "suppressSpeech": false
  },
  "beats": [
    {
      "audioParams": {
        "padding": 0.5,
        "movieVolume": 0.8
      }
    }
  ]
}
```

**グローバル設定 / Global Settings:**
- `introPadding`: 音声開始前の無音時間（秒、デフォルト: 1.0）/ Silence before first audio
- `padding`: Beat間の無音時間（秒、デフォルト: 0.3）/ Silence between beats
- `closingPadding`: 最終Beat前の無音時間（秒、デフォルト: 0.8）/ Silence before last beat
- `outroPadding`: 音声終了後の無音時間（秒、デフォルト: 1.0）/ Silence after last audio
- `suppressSpeech`: 音声生成の抑制（デフォルト: false）/ Suppress speech generation

**Beat個別設定 / Per-Beat Settings:**
- `padding`: このBeat後の無音時間 / Silence after this beat
- `movieVolume`: 動画音声の音量（0.0〜1.0、デフォルト: 1.0）/ Movie audio volume

---

### 10. 特殊メディアタイプ (Special Media Types)

通常の画像・動画以外の特殊なメディア形式をサポート。

Support for special media types beyond standard images and videos.

#### 10.1 テキストスライド (Text Slide)

テキストベースのプレゼンテーションスライドを自動生成。

Auto-generate text-based presentation slides.

```json
{
  "image": {
    "type": "textSlide",
    "slide": {
      "title": "Main Title",
      "subtitle": "Subtitle text",
      "bullets": ["Point 1", "Point 2", "Point 3"]
    }
  },
  "textSlideParams": {
    "cssStyles": ["background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"]
  }
}
```

#### 10.2 チャート (Chart)

データビジュアライゼーション用のチャート生成。

Generate charts for data visualization.

```json
{
  "image": {
    "type": "chart",
    "title": "Sales Data",
    "chartData": {
      "type": "bar",
      "data": { "labels": ["Q1", "Q2", "Q3"], "datasets": [...] }
    }
  }
}
```

#### 10.3 Mermaidダイアグラム (Mermaid Diagram)

Mermaid記法によるダイアグラム生成。

Generate diagrams using Mermaid syntax.

```json
{
  "image": {
    "type": "mermaid",
    "title": "System Architecture",
    "code": {
      "kind": "text",
      "text": "graph TD\n  A[Client] --> B[Server]\n  B --> C[Database]"
    },
    "appendix": ["%%{init: {'theme':'dark'}}%%"]
  }
}
```

#### 10.4 HTML + Tailwind

Tailwind CSSを使ったカスタムHTMLビジュアル生成。

Generate custom HTML visuals with Tailwind CSS.

```json
{
  "image": {
    "type": "html_tailwind",
    "html": "<div class=\"flex items-center justify-center h-full bg-blue-500\"><h1 class=\"text-white text-6xl\">Hello</h1></div>"
  }
}
```

#### 10.5 Vision API

画像解析を使った動的コンテンツ生成。

Dynamic content generation using vision API.

```json
{
  "image": {
    "type": "vision",
    "style": "presentation",
    "data": { "imageUrl": "https://example.com/photo.jpg" }
  }
}
```

#### 10.6 Beat参照 (Beat Reference)

他のBeatの画像を参照・再利用。

Reference and reuse images from other beats.

```json
{
  "beats": [
    { "id": "intro", "imagePrompt": "A beautiful sunset" },
    { "image": { "type": "beat", "id": "intro" } }
  ]
}
```

---

### 11. Fill Options（アスペクト比調整）

画像・動画とキャンバスのアスペクト比が異なる場合の表示方法を制御。

Control how images/videos are displayed when aspect ratios don't match the canvas.

**設定方法 / Configuration:**

```json
{
  "movieParams": {
    "fillOption": {
      "style": "aspectFill"
    }
  }
}
```

**オプション / Options:**
- `aspectFit` (デフォルト / default): 全体を表示、余白あり / Show entire content with padding
- `aspectFill`: 画面を埋める、トリミングあり / Fill screen, may crop content

---

### 12. Hidden Beats（非表示Beat）

処理は実行するが、最終的な動画には含めないBeat。デバッグや段階的な制作に便利。

Process beats but exclude from final video, useful for debugging or staged production.

**設定方法 / Configuration:**

```json
{
  "beats": [
    {
      "text": "This beat is hidden",
      "hidden": true,
      "imagePrompt": "Test image"
    }
  ]
}
```

- `hidden`: true に設定すると最終動画から除外 / Set to true to exclude from final video

---

### 13. 言語別スピーカー設定 (Language-Specific Speaker Configuration)

同じスピーカーでも、言語ごとに異なる音声設定を使用可能。多言語コンテンツで各言語に最適な音声を選択。

Use different voice settings for the same speaker across languages, optimizing voice for each language.

**設定方法 / Configuration:**

```json
{
  "speechParams": {
    "speakers": {
      "Presenter": {
        "provider": "openai",
        "voiceId": "shimmer",
        "lang": {
          "ja": {
            "provider": "nijivoice",
            "voiceId": "9d9ed276-49ee-443a-bc19-26e6136d05f0"
          },
          "zh": {
            "provider": "google",
            "voiceId": "cmn-CN-Standard-A"
          }
        }
      }
    }
  }
}
```

**動作 / Behavior:**
- デフォルト設定: トップレベルの`provider`と`voiceId`を使用 / Use top-level provider and voiceId as default
- 言語別上書き: スクリプトの`lang`に対応する設定があれば優先 / Override with language-specific settings if available
- フォールバック: 該当言語がなければデフォルトを使用 / Fall back to default if language not found

**詳細ドキュメント / Documentation:** [sound_and_voice.md](./sound_and_voice.md)
**サンプル / Sample:** [scripts/test/test_lang.json](../scripts/test/test_lang.json)

---

## 🔗 関連ドキュメント / Related Documentation

- [メインREADME / Main README](../README.md)
- [MulmoScript Schema](./schena.md)
- [音声スピルオーバー詳細 / Audio Spillover Details](./sound_and_voice.md)
- [TTS Provider追加手順 / Adding TTS Providers](./tts.md)
- [Image Plugin仕様 / Image Plugin Specs](./image_plugin.md)
- [テストスクリプト一覧 / Test Scripts](../scripts/test/README.md)
