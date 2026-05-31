# MulmoCast Features / MulmoCast機能一覧

このドキュメントでは、MulmoCastの機能、特に標準的な動画生成以外の特殊機能について説明します。

This document describes MulmoCast features, especially advanced features beyond standard video generation.

## 📝 標準機能 / Standard Features

基本的な動画・音声・画像生成機能：

Basic video, audio, and image generation features:

- **TTS (Text-to-Speech)** - 複数のプロバイダー対応（OpenAI, Gemini, Google, ElevenLabs, Kotodama）
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

Beat間の映像切り替えにトランジション効果を追加。17種類のトランジションタイプをサポート。

Add transition effects between beats for smooth visual transitions. Supports 17 transition types.

**対応トランジション / Available Transitions:**

**Slide系（8種類）/ Slide Transitions (8 types):**
- `slideout_left`, `slideout_right`, `slideout_up`, `slideout_down` - スライドアウト / Slide out
- `slidein_left`, `slidein_right`, `slidein_up`, `slidein_down` - スライドイン / Slide in

**Wipe系（8種類）/ Wipe Transitions (8 types):**
- `wipeleft`, `wiperight`, `wipeup`, `wipedown` - 方向別ワイプ / Directional wipes
- `wipetl`, `wipetr`, `wipebl`, `wipebr` - 角からのワイプ / Corner wipes

**Fade（1種類）/ Fade (1 type):**
- `fade` - フェード効果 / Fade effect

**設定項目 / Configuration:**

```json
{
  "movieParams": {
    "transition": {
      "type": "wipeleft",
      "duration": 0.8
    }
  }
}
```

- `type`: トランジションタイプ（17種類から選択）/ Transition type (choose from 17 types)
- `duration`: トランジション時間（0〜2秒、デフォルト: 0.3）/ Transition duration (0-2 seconds, default: 0.3)

**特徴 / Features:**
- Beat単位で異なるトランジションを設定可能 / Different transitions per beat
- グローバル設定とbeat単位の設定の両方に対応 / Both global and per-beat configuration
- FFmpegのoverlayとxfadeフィルタで実装 / Implemented with FFmpeg overlay and xfade filters

**サンプル / Samples:**
- [scripts/test/test_transition2.json](../scripts/test/test_transition2.json) - 全17種類のデモ / All 17 types demo
- [scripts/test/test_transition3.json](../scripts/test/test_transition3.json) - 追加テスト / Additional tests

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

#### 10.7 Markdownレイアウト (Markdown Layout)

複雑なレイアウトでmarkdownコンテンツを表示。2列、4分割、ヘッダー、サイドバー対応。

Display markdown content with complex layouts. Supports 2-column, 2x2 grid, header, and sidebar.

**2列レイアウト / 2-Column Layout:**
```json
{
  "image": {
    "type": "markdown",
    "markdown": {
      "row-2": [
        ["# Left", "Left content"],
        ["# Right", "Right content"]
      ]
    }
  }
}
```

**4分割レイアウト / 2x2 Grid Layout:**
```json
{
  "image": {
    "type": "markdown",
    "markdown": {
      "2x2": ["Top-Left", "Top-Right", "Bottom-Left", "Bottom-Right"]
    }
  }
}
```

**ヘッダー・サイドバー付き / With Header and Sidebar:**
```json
{
  "image": {
    "type": "markdown",
    "markdown": {
      "header": "# Page Title",
      "sidebar-left": ["Menu Item 1", "Menu Item 2"],
      "content": "Main content here"
    }
  }
}
```

#### 10.8 構造化スライド (Slide DSL)

JSON DSLで構造化プレゼンテーションスライドを生成。13レイアウト、13コンテンツブロック、13色テーマシステム。`@mulmocast/deck` 0.5.0+。

Generate structured presentation slides using JSON DSL. 13 layouts, 13 content blocks, 13-color theme system. Powered by `@mulmocast/deck` 0.5.0+.

```json
{
  "image": {
    "type": "slide",
    "slide": {
      "layout": "columns",
      "title": "Comparison",
      "columns": [
        { "title": "Plan A", "accentColor": "primary", "content": [{ "type": "bullets", "items": ["Fast", "Simple"] }] },
        { "title": "Plan B", "accentColor": "accent", "content": [{ "type": "bullets", "items": ["Scalable", "Robust"] }] }
      ]
    }
  }
}
```

**レイアウト / Layouts:** title, columns, comparison, grid, bigQuote, stats, timeline, split, matrix, table, funnel, waterfall, manifesto

**コンテンツブロック / Content Blocks:** text, bullets, code, callout, metric, divider, image, imageRef, chart, mermaid, section, table, tag

**視覚拡張 / Visual extras:** inline `**bold**` / `*emphasis*` / `{color:text}`, text size variants (`lead`/`big`/`sub`), slide `density: compact`, `titleSize`/`subtitleSize`, theme `bgGradient`/`titleGradient`/`cardStyle: glass`, asymmetric layouts (`comparison.ratio` / `cardless`, `grid.span`)

**プリセットテーマ / Preset Themes:** dark, pop, warm, creative, minimal, corporate

**プレゼンテーションスタイル / Presentation Styles:**
```bash
mulmo tool complete beats.json -s slide_dark -o presentation.json
```

**詳細ドキュメント / Documentation:** [Slide SKILL.md](../.claude/skills/slide/SKILL.md)
**サンプル / Samples:**
- [scripts/samples/bootcamp_v2_kickoff.json](../scripts/samples/bootcamp_v2_kickoff.json) - 全機能フル活用 / Full feature showcase (Phase 1-6)
- [scripts/test/test_slide_01.json](../scripts/test/test_slide_01.json)
- [scripts/test/test_slide_12.json](../scripts/test/test_slide_12.json) - レイアウトデモ / Layouts demo

---

#### 10.9 スタイル (Styles for Markdown/TextSlide)

100種類のプリセットスタイルでmarkdownやtextSlideを装飾。

Decorate markdown and textSlide with 100 preset styles.

**markdownでの使用 / Using with Markdown:**
```json
{
  "image": {
    "type": "markdown",
    "markdown": ["# Title", "Content"],
    "style": "corporate-blue"
  }
}
```

**textSlideでの使用 / Using with TextSlide:**
```json
{
  "image": {
    "type": "textSlide",
    "slide": { "title": "Styled Slide" },
    "style": "cyber-neon"
  }
}
```

**スタイルカテゴリー / Style Categories:**
- `business`: corporate-blue, executive-gray など / etc.
- `tech`: cyber-neon, terminal-dark, ai-blue など
- `creative`: artistic-splash, neon-glow など
- `minimalist`: clean-white, nordic-light など
- `nature`: forest-green, ocean-blue など
- `dark`: charcoal-elegant, midnight-blue など
- `colorful`: vibrant-pink, aurora など
- `vintage`: retro-70s, art-deco など
- `japanese`: washi-paper, sakura-pink, zen-garden など
- `geometric`: bauhaus, mondrian など

全スタイル一覧は `npx mulmocast tool info --category markdown-styles` で確認可能。

View all styles with `npx mulmocast tool info --category markdown-styles`.

#### 10.10 Markdown内Mermaid埋め込み (Mermaid in Markdown)

markdownコンテンツ内でmermaidダイアグラムを直接使用可能。レイアウト機能と組み合わせて図とテキストを並べて表示。

Use mermaid diagrams directly within markdown content. Combine with layout features to display diagrams alongside text.

```json
{
  "image": {
    "type": "markdown",
    "markdown": {
      "row-2": [
        ["```mermaid", "graph TD", "  A-->B", "```"],
        ["# Explanation", "This diagram shows the flow."]
      ]
    }
  }
}
```

**サンプル / Sample:** [scripts/test/test_markdown_mermaid.json](../scripts/test/test_markdown_mermaid.json)

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
            "provider": "gemini",
            "voiceId": "Kore"
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

### 14. ビデオフィルター（映像エフェクト）(Video Filters / Visual Effects)

各beatの映像に視覚効果を適用。FFmpegの強力なフィルター機能を36種類のフィルターで簡単に利用可能。

Apply visual effects to video/images for each beat. Easy access to powerful FFmpeg filters with 36 filter types.

**フィルターカテゴリー / Filter Categories:**

**色調整（9種類）/ Color Adjustment (9 types):**
- `mono`, `sepia`, `brightness_contrast`, `hue`, `colorbalance`, `vibrance`, `negate`, `colorhold`, `colorkey`

**ブラー・シャープ（4種類）/ Blur & Sharpen (4 types):**
- `blur`, `gblur`, `avgblur`, `unsharp`

**エッジ検出（3種類）/ Edge Detection (3 types):**
- `edgedetect`, `sobel`, `emboss`

**変形（4種類）/ Transform (4 types):**
- `hflip`, `vflip`, `rotate`, `transpose`

**視覚効果（4種類）/ Visual Effects (4 types):**
- `vignette`, `fade`, `pixelize`, `pseudocolor`

**時間効果（2種類）/ Temporal (2 types):**
- `tmix`, `lagfun`

**閾値・ポスタライズ（2種類）/ Threshold (2 types):**
- `threshold`, `elbg`

**その他（8種類）/ Others (8 types):**
- `lensdistortion`, `chromashift`, `deflicker`, `dctdnoiz`, `glitch`, `grain`, `custom`（カスタムFFmpegフィルター文字列）

**設定方法 / Configuration:**

```json
{
  "beats": [
    {
      "speaker": "Presenter",
      "text": "Vintage look",
      "movieParams": {
        "filters": [
          {
            "type": "sepia"
          },
          {
            "type": "grain",
            "intensity": 25
          },
          {
            "type": "vignette"
          }
        ]
      },
      "image": { ... }
    }
  ]
}
```

**特徴 / Features:**
- 複数フィルターの連結（チェーン）が可能 / Multiple filters can be chained
- Beat単位で異なるフィルターを設定可能 / Different filters per beat
- グローバル設定とbeat単位の設定の両方に対応 / Both global and per-beat configuration
- 全フィルターがZodスキーマで型安全にバリデーション / Type-safe validation with Zod schemas
- パラメータの範囲チェック機能付き / Parameter range validation included

**設定例 / Examples:**

グローバル設定（全beatに適用）/ Global configuration:
```json
{
  "movieParams": {
    "filters": [
      {
        "type": "brightness_contrast",
        "brightness": 0.1,
        "contrast": 1.2
      }
    ]
  }
}
```

複数フィルターの連結 / Filter chaining:
```json
{
  "movieParams": {
    "filters": [
      {
        "type": "hue",
        "hue": 120,
        "saturation": 1.5
      },
      {
        "type": "vignette"
      }
    ]
  }
}
```

**サンプル / Sample:** [scripts/test/test_video_filters.json](../scripts/test/test_video_filters.json) - 全36種類のデモ / All 36 types demo

**詳細ドキュメント / Documentation:** [image.md - ビデオフィルター](./image.md#ビデオフィルター映像エフェクト)

---

## 🔗 関連ドキュメント / Related Documentation

- [メインREADME / Main README](../README.md)
- [MulmoScript Schema](./schena.md)
- [音声スピルオーバー詳細 / Audio Spillover Details](./sound_and_voice.md)
- [TTS Provider追加手順 / Adding TTS Providers](./tts.md)
- [Image Plugin仕様 / Image Plugin Specs](./image_plugin.md)
- [テストスクリプト一覧 / Test Scripts](../scripts/test/README.md)
