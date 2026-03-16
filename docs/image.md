# 画像・動画・音声の生成ルール
## 生成ルール
### 画像生成/動画生成
1. image プロパティが設置されていれば、image.type で決まる plugin に画像の生成・取得は任せる。
2. image プロパティが設置されておらず、htmlPromptが設定されている場合、そのプロンプトでhtmlを生成し、htmlから画像を生成する
3. image プロパティが設置されておらず、imagePromptが設定されていれば、そのプロンプトで画像を生成する。
4. moviePromptのみが設定されている場合、画像は生成せず、そのプロンプトだけで動画を生成する
5. image プロパティもimagePromptもmoviePromptも設定されていない場合、textからイメージプロンプトを生成し、それを使って画像を生成する
6. 1か3の条件で画像が生成・取得された場合で、moviePromptが存在する場合、その画像とmoviePromptで映像を生成する

### 特殊処理 soundEffectPrompt/enableLipSync/suppressSpeech
7. 1のtype=movie, 4, 6で動画が生成され、beatに`soundEffectPrompt`があれば、動画に対してsoundEffectPromptで指定されている音声を作成・合成する
8. beatに`enableLipSync`の指定があれば、「画像と音声ファイル」または「動画と音声ファイル」を使ってリップシンクの処理を行う。生成物は動画になる。
   - 注: モデルによって映像入力が静止画か動画かが異なる。下記「[リップシンク対応モデル](#リップシンク対応モデル)」の一覧を参照して入力パラメータを合わせること。
9.  `audioParams.suppressSpeech: true`が指定されている場合、全てのbeatでテキストからの音声読み上げ（TTS）を行わず、音声トラックはBGMのみになる

## Beat画像・動画生成ルール一覧表

| 条件 | image property | text | htmlPrompt | imagePrompt | moviePrompt | 音声処理 | 画像処理 | 動画処理 | 参照セクション |
|------|:-----:|:----:|:----------:|:-----------:|:-----------:|----------|----------|----------|----------------|
| **1** | ✓*1 | (✓) |  |  |  | textを利用してTTS  | image.typeプラグイン | なし | [1. image.typeの処理](#1-imagetypeの処理) |
| **1** | *2 | (✓) |  |  |  | textを利用してTTS  | なし | image.typeプラグイン |
| **1+6** | ✓ | (✓) |  |  | ✓ | textを利用してTTS  | image.typeプラグイン | 画像+moviePromptで動画生成 | [6. moviePrompt and (image or imagePrompt)](#6-movieprompt-and-image-or-imageprompt) |
| **2** |  | (✓) | ✓ |  |  | textを利用してTTS  | htmlPromptでHTML生成→画像化 | なし | [2. htmlPrompt](#2-htmlprompt) |
| **3** |  | (✓) |  | ✓ |  | textを利用してTTS  | imagePromptで画像生成 | なし | [3. imagePrompt](#3-imageprompt) |
| **3+6** |  | (✓) |  | ✓ | ✓ | textを利用してTTS  | imagePromptで画像生成 | 生成画像+moviePromptで動画生成 | [6. moviePrompt and (image or imagePrompt)](#6-movieprompt-and-image-or-imageprompt) |
| **4** |  | (✓) |  |  | ✓ | textを利用してTTS | なし | moviePromptで動画生成 | [4. moviePrompt](#4-movieprompt) |
| **5** |  | ✓ |  |  |  | textを利用してTTS  | text を imagePrompt として画像生成 | なし | [5. no imagePrompt and moviePrompt](#5-no-imageprompt-and-movieprompt) |

### 特殊処理
- 「動画あり」かつ「`soundEffectPrompt`」の時にサウンド効果を付与した動画を生成する
- 「生成画像あり」かつ「音声データあり」の時にリップシンク処理を行った動画を生成する
-  `audioParams.suppressSpeech: true` に設定すると TTS は行わず、`audio` ステップではBGMだけが合成される

### 注釈
- *1 image.type = movie 以外の場合
- *2 image.type = movie の場合

### 表の見方
- **✓**: 設定されている
- **(✓)**: 設定可（任意）
- **条件番号**: 上記ルールの番号に対応
- **参照セクション**: 対応するbeatデータ例があるセクションへのリンク

### 優先順位
1. `image`プロパティが最優先
2. `image`がない場合は`htmlPrompt`
3. `image`がない場合は`imagePrompt`
4. `moviePrompt`のみの場合は動画のみ生成
5. 何もない場合は`text`から自動生成
6. 画像生成後に`moviePrompt`があれば動画も生成

### suppressSpeech モード

`audioParams.suppressSpeech: true` を指定すると、全ての beat で TTS を生成しません。`audio` ステップで作られる音声ファイルは無音トラックとなり、`addBGMAgent` がプレゼンテーションスタイルの BGM とミックスします。字幕付きのミュージックビデオを想定したフローのため、歌詞やセリフは `captionParams`（または beat ごとの `captionParams`）を使って動画に貼り付けます。

このモードでは音声長でタイミングが決まらないため、各 beat に `duration` を指定するか、動画素材の長さで beat の表示時間を決めます。

## Beatの長さの決まり方

- **音声ベース**  
  - TTS や `beat.audio` の実ファイル長が基準。`combineAudioFilesAgent` が ffmpeg で長さを計測し、その時間が beat のコアになります。  
  - `presentationStyle.audioParams.padding` / `closingPadding` と、beat ごとの `audioParams.padding` があれば末尾に無音を後付けし、`beat.duration = 音声長 + padding` となります。
- **duration の明示**  
  - beat に `duration` を指定すると、指定値が音声より長いときは不足分を無音で埋めて調整。音声のほうが長い場合は音声長が優先されます。  
  - `duration` の無い beat は最低 1 秒が保障され、他から spill してきた音声があればその長さに合わせて伸ばされます。
- **動画ベース**  
  - `image.type: "movie"` 時は、動画長が音声長より長い場合は動画長を採用。音声が無い beat でも動画があれば動画長がそのまま beat の長さになります。
  - `moviePrompt` で動画が生成時は、音声長を採用。動画長が音声長より長い場合は動画は途中でカットされます。音声が無い beat でも動画があれば動画長がそのまま beat の長さになります。
  - movie に速度指定 (`movieParams.speed`) がある場合はそれを反映した長さで計算します。
  - いずれの場合でも、動画長より音声長が長い場合は動画長を超える部分は最後のフレームの静止画が続けて表示されます。
- **voice_over の連続**  
  - `image.type: "voice_over"` が連続するグループは、先頭 beat の動画長を軸に `image.startAt` を使って区切ります。  
  - 先頭 beat の音声でタイムラインを埋め、`startAt` で次 beat の開始位置を指定。最後の beat には残り時間が丸ごと割り当てられます。
- **音声が次の beat に跨るケース (spill over)**  
  - 音声のみの beat で、次の beat に映像も音声も無い場合は、その音声長を複数 beat に分割して割り当てます。  
  - `duration` 指定のある beat にはその値を優先し、未指定の beat には残り時間を均等配分（最低 1 秒）します。
- **何も無い場合**
  - 音声・動画・`duration` のいずれも無い beat は既定で 1 秒に設定。
  - `audioParams.suppressSpeech: true` の場合は全ての beat で音声が無いので、各 beat に `duration` を指定するか、動画素材で時間を指定します。

最終的な `studio.beats[index].duration` と `startAt` は `combineAudioFilesAgent` が計算します。動画トランジション、字幕（`captionParams`）の表示タイミング、`soundEffectPrompt` の合成位置などはこの duration/startAt を前提に処理されます。

## トランジション（画面切り替え効果）

### 基本概念

トランジションは各beatの**開始時**に発生する画面切り替え効果です。前のbeatから現在のbeatへの切り替え時に視覚効果を適用します。

**重要な制約**:
- beat[0]（最初のbeat）にはトランジションを指定できません
- トランジションは`movieParams.transition`で設定します
- グローバル設定（presentationStyle）とbeat単位の設定が可能で、beat単位の設定が優先されます

### トランジションタイプ（17種類）

#### 1. fade
前のbeatの最後のフレームがフェードアウトして、次のbeatに切り替わります。

```json
{
  "movieParams": {
    "transition": {
      "type": "fade",
      "duration": 1.0
    }
  }
}
```

#### 2. slideout系（4方向）
前のbeatの最後のフレームが指定方向にスライドアウトします。

- **slideout_left**: 左方向にスライドアウト
- **slideout_right**: 右方向にスライドアウト
- **slideout_up**: 上方向にスライドアウト
- **slideout_down**: 下方向にスライドアウト

```json
{
  "movieParams": {
    "transition": {
      "type": "slideout_left",
      "duration": 1.0
    }
  }
}
```

#### 3. slidein系（4方向）
現在のbeatの最初のフレームが指定方向からスライドインします。**slidein時は前のbeatの最後のフレームが背景として残り、その上に新しいbeatがスライドインします。**

- **slidein_left**: 左からスライドイン
- **slidein_right**: 右からスライドイン
- **slidein_up**: 上からスライドイン
- **slidein_down**: 下からスライドイン

```json
{
  "movieParams": {
    "transition": {
      "type": "slidein_right",
      "duration": 1.0
    }
  }
}
```

#### 4. wipe系（8方向）
FFmpegのxfadeフィルタを使用した高品質なワイプトランジション。前のbeatから現在のbeatへスムーズにワイプします。

- **wipeleft**: 左方向へワイプ
- **wiperight**: 右方向へワイプ
- **wipeup**: 上方向へワイプ
- **wipedown**: 下方向へワイプ
- **wipetl**: 左上から右下へワイプ
- **wipetr**: 右上から左下へワイプ
- **wipebl**: 左下から右上へワイプ
- **wipebr**: 右下から左上へワイプ

```json
{
  "movieParams": {
    "transition": {
      "type": "wipeleft",
      "duration": 1.0
    }
  }
}
```

### 設定方法

#### グローバル設定（全beatに適用）
```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Transition Demo",
  "movieParams": {
    "transition": {
      "type": "fade",
      "duration": 0.5
    }
  },
  "beats": [ ... ]
}
```

#### Beat単位の設定（特定のbeatのみ）
```json
{
  "beats": [
    {
      "speaker": "Presenter",
      "duration": 2,
      "image": { "type": "textSlide", "slide": { "title": "First Slide" } }
    },
    {
      "speaker": "Presenter",
      "duration": 2,
      "movieParams": {
        "transition": {
          "type": "slidein_left",
          "duration": 1.0
        }
      },
      "image": { "type": "textSlide", "slide": { "title": "Second Slide" } }
    }
  ]
}
```

### パラメータ

- **type**: トランジションの種類（必須）
  - fade: `"fade"`
  - slideout: `"slideout_left"`, `"slideout_right"`, `"slideout_up"`, `"slideout_down"`
  - slidein: `"slidein_left"`, `"slidein_right"`, `"slidein_up"`, `"slidein_down"`
  - wipe: `"wipeleft"`, `"wiperight"`, `"wipeup"`, `"wipedown"`, `"wipetl"`, `"wipetr"`, `"wipebl"`, `"wipebr"`
- **duration**: トランジション効果の長さ（秒）
  - 省略時のデフォルト: `0.3`
  - 最小値: `0`, 最大値: `2`

### トランジションのタイミング

- トランジションは`beatTimestamps[beatIndex]`の時刻（そのbeatの開始時刻）に開始されます
- `transition.duration`秒間実行されます
- トランジション中は、前のbeatのコンテンツと現在のbeatのコンテンツが重なって表示されます

### 内部実装の詳細

#### slideout/fadeの処理
前のbeatの最後のフレームを抽出し、それに対してエフェクトを適用します：
- **fade**: アルファチャンネルでフェードアウト
- **slideout**: FFmpegのoverlayフィルタで位置を時間経過とともに変化

#### slideinの処理（2段階オーバーレイ）
slideinは特殊な処理を行います：
1. **第1段階**: 前のbeatの最後のフレームを背景として固定表示
2. **第2段階**: 現在のbeatの最初のフレームを指定方向からスライドイン

これにより、前の画面が背景に残りつつ、新しい画面がスライドインする効果が実現されます。

### サンプル

全てのトランジションタイプを確認できるサンプルファイル:
- [scripts/test/test_transition2.json](../scripts/test/test_transition2.json)

## ビデオフィルター（映像エフェクト）

### 基本概念

ビデオフィルターは各beatの映像に視覚効果を適用する機能です。FFmpegの強力なフィルター機能をJSON設定で簡単に利用できます。

**重要な特徴**:
- beat単位で異なるフィルターを適用可能
- 複数のフィルターをチェーン（連結）して使用可能
- グローバル設定（presentationStyle）とbeat単位の設定が可能
- すべてのフィルターはZodスキーマで型安全にバリデーション

### フィルターカテゴリー（36種類）

#### 色調整フィルター（9種類）

- **mono**: モノクロ（グレースケール）効果
- **sepia**: セピア調効果
- **brightness_contrast**: 明度(-1〜1)とコントラスト(0〜3)の調整
- **hue**: 色相(-180°〜180°)、彩度、明度の調整
- **colorbalance**: RGB各チャンネルの微調整（シャドウ、ミッドトーン、ハイライト別）
- **vibrance**: 彩度の強調(-2〜2)
- **negate**: 色反転（ネガポジ反転）
- **colorhold**: 特定の色だけを残し他を脱色
- **colorkey**: 特定の色を透明化（クロマキー）

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "hue",
        "hue": 120,
        "saturation": 1.5
      }
    ]
  }
}
```

#### ブラー・シャープフィルター（4種類）

- **blur**: ボックスブラー（radius: 1-50, power: 1-10）
- **gblur**: ガウシアンブラー（sigma: 0-100）
- **avgblur**: 平均ブラー（X/Y個別サイズ指定）
- **unsharp**: アンシャープマスク（輝度・色差個別制御）

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "gblur",
        "sigma": 30
      }
    ]
  }
}
```

#### エッジ検出フィルター（3種類）

- **edgedetect**: エッジ検出（wires/colormix/cannyモード）
- **sobel**: Sobelエッジ検出アルゴリズム
- **emboss**: エンボス（3D浮き彫り）効果

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "edgedetect",
        "mode": "wires"
      }
    ]
  }
}
```

#### 変形フィルター（4種類）

- **hflip**: 左右反転
- **vflip**: 上下反転
- **rotate**: 回転（角度はラジアン、塗りつぶし色指定可）
- **transpose**: 90度回転（反転オプション付き）

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "vflip"
      }
    ]
  }
}
```

#### 視覚効果フィルター（4種類）

- **vignette**: 周辺減光（角度・中心位置・モード指定可）
- **fade**: フェードイン/アウト（フレーム単位で制御）
- **pixelize**: ピクセル化（モザイク効果）
- **pseudocolor**: 疑似カラー（magma、inferno、plasma、viridis等のカラーマップ）

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "pixelize",
        "width": 20,
        "height": 20
      }
    ]
  }
}
```

#### 時間効果フィルター（2種類）

- **tmix**: 時間軸ミックス（モーションブラー効果）
- **lagfun**: ラグエフェクト（モーショントレイル）

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "lagfun",
        "decay": 0.85
      }
    ]
  }
}
```

#### 閾値・ポスタライズフィルター（2種類）

- **threshold**: 二値化（閾値処理）
- **elbg**: 色数削減（ポスタライズ効果、ELBGアルゴリズム）

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "elbg",
        "codebook_length": 16
      }
    ]
  }
}
```

#### その他の特殊効果（6種類）

- **lensdistortion**: レンズ歪み効果
- **chromashift**: 色ずれ（色収差）効果
- **deflicker**: フリッカー除去
- **dctdnoiz**: DCTベースのノイズ除去
- **glitch**: デジタルグリッチ効果（noise/blendスタイル）
- **grain**: フィルムグレイン効果

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "glitch",
        "intensity": 40,
        "style": "noise"
      }
    ]
  }
}
```

#### カスタムフィルター

- **custom**: 生のFFmpegフィルター文字列を直接指定

```json
{
  "movieParams": {
    "filters": [
      {
        "type": "custom",
        "filter": "hflip,negate"
      }
    ]
  }
}
```

### 複数フィルターの連結

複数のフィルターを配列で指定することで、効果を重ねることができます。

```json
{
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
  }
}
```

この例では、セピア調→グレイン追加→周辺減光の順に効果が適用されます。

### グローバル設定とbeat単位の設定

#### グローバル設定（全beatに適用）
```json
{
  "$mulmocast": { "version": "1.1" },
  "movieParams": {
    "filters": [
      {
        "type": "brightness_contrast",
        "brightness": 0.1,
        "contrast": 1.2
      }
    ]
  },
  "beats": [ ... ]
}
```

#### Beat単位の設定（特定のbeatのみ）
```json
{
  "beats": [
    {
      "speaker": "Presenter",
      "text": "Dramatic scene",
      "movieParams": {
        "filters": [
          {
            "type": "hue",
            "hue": 180,
            "saturation": 2.0
          }
        ]
      },
      "image": { ... }
    }
  ]
}
```

### サンプル

全てのフィルタータイプを確認できるサンプルファイル:
- [scripts/test/test_video_filters.json](../scripts/test/test_video_filters.json)

## リップシンク対応モデル

`enableLipSync: true` を使う場合は、選択するモデルによって入力形式が異なります。画像/動画の入力方法は `image.type: "image"` / `image.type: "movie"`、`imagePrompt`からの出力、`moviePrompt` からの出力が使えます。

| モデル名 |  画像/動画入力 | 音声入力 |
|----------|----------|----------|
| `bytedance/latentsync` | `video`(動画ファイル) | `audio` |
| `tmappdev/lipsync` | `video_input`(動画ファイル) | `audio_input` |
| `bytedance/omni-human` | `image`(静止画) | `audio` |

## 1. image.typeの処理

```json
{
  "image": {
    "type": "image"
  }
}
```
### リモートの画像
```json
{
  "type": "image",
  "source": {
    "kind": "url",
    "url": "https://raw.githubusercontent.com/receptron/mulmocast-cli/refs/heads/main/assets/images/mulmocast_credit.png"
  }
}
```

### localの画像
```json
{
  "type": "image",
  "source": {
    "kind": "path",
    "path": "../../assets/images/mulmocast_credit.png"
  }
}
```

### localの動画
```json
{
  "type": "movie",
  "source": {
    "kind": "path",
    "path": "../../test/pingpong.mov"
  }
}
```

### リモートの動画
```json
{
  "type": "movie",
  "source": {
    "kind": "url",
    "url": "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/test/pingpong.mov"
  }
}
```

### textSlide（スライド形式）
```json
{
  "type": "textSlide",
  "slide": {
    "title": "Human Evolution",
    "bullets": [
      "Early Primates",
      "Hominids and Hominins",
      "Australopithecus",
      "Genus Homo Emerges",
      "Homo erectus and Migration",
      "Neanderthals and Other Archaic Humans",
      "Homo sapiens"
    ]
  }
}
```

#### textSlide with style
`style` プロパティでカスタムスタイルを指定できます。markdown と同じ100種類のプリセットスタイルが利用可能です。

```json
{
  "type": "textSlide",
  "slide": {
    "title": "Corporate Presentation",
    "subtitle": "Business Meeting",
    "bullets": ["Point 1", "Point 2"]
  },
  "style": "corporate-blue"
}
```

利用可能なすべてのスタイル名を表示するには:
```bash
npx mulmocast tool info --category markdown-styles
```

### markdown
```json
{
  "type": "markdown",
  "markdown": [
    "# Markdown Table Example",
    "### Table",
    "| Item              | In Stock | Price |",
    "| :---------------- | :------: | ----: |",
    "| Python Hat        |   True   | 23.99 |",
    "| SQL Hat           |   True   | 23.99 |",
    "| Codecademy Tee    |  False   | 19.99 |",
    "| Codecademy Hoodie |  False   | 42.99 |",
    "### Paragraph",
    "This is a paragraph."
  ]
}
```

#### markdown with style
`style` プロパティでカスタムスタイルを指定できます。100種類のプリセットスタイルが利用可能です。

```json
{
  "type": "markdown",
  "markdown": ["# Title", "Content here"],
  "style": "corporate-blue"
}
```

**利用可能なスタイルカテゴリ**:
- `business`: corporate-blue, executive-gray, finance-green, startup-orange など
- `tech`: cyber-neon, terminal-dark, matrix-green, ai-blue など
- `creative`: artistic-splash, watercolor-soft, bold-pop, neon-glow など
- `minimalist`: clean-white, zen-beige, nordic-light, swiss-design など
- `nature`: forest-green, ocean-blue, sunset-orange, tropical-vibes など
- `dark`: charcoal-elegant, midnight-blue, obsidian, noir など
- `colorful`: vibrant-pink, electric-blue, aurora, cosmic など
- `vintage`: retro-70s, typewriter, art-deco, newspaper など
- `japanese`: washi-paper, sakura-pink, matcha-green, zen-garden など
- `geometric`: hexagon-pattern, grid-modern, bauhaus, mondrian など

利用可能なすべてのスタイル名を表示するには:
```bash
npx mulmocast tool info --category markdown-styles
```

#### markdown layout（レイアウト機能）
markdown では複雑なレイアウトも指定できます。`row-2`（2列）、`2x2`（4分割）、`header`（ヘッダー）、`sidebar-left`（左サイドバー）を組み合わせて使用できます。

**2列レイアウト (row-2)**:
```json
{
  "type": "markdown",
  "markdown": {
    "row-2": [
      ["# Left Column", "Left content here"],
      ["# Right Column", "Right content here"]
    ]
  }
}
```

**4分割レイアウト (2x2)**:
```json
{
  "type": "markdown",
  "markdown": {
    "2x2": [
      "# Top Left",
      "# Top Right",
      "# Bottom Left",
      "# Bottom Right"
    ]
  }
}
```

**ヘッダー付きレイアウト**:
```json
{
  "type": "markdown",
  "markdown": {
    "header": "# Page Title",
    "row-2": [
      "Left content",
      "Right content"
    ]
  }
}
```

**左サイドバー付きレイアウト**:
```json
{
  "type": "markdown",
  "markdown": {
    "sidebar-left": ["## Menu", "- Item 1", "- Item 2"],
    "content": ["# Main Content", "Main content here"]
  }
}
```

#### markdown 内での mermaid 埋め込み
markdown コンテンツ内で mermaid コードブロックを直接使用できます。レイアウト機能と組み合わせて、図とテキストを並べて表示できます。

```json
{
  "type": "markdown",
  "markdown": {
    "row-2": [
      ["# Flow Diagram", "```mermaid", "graph TD", "    A-->B", "    B-->C", "```"],
      ["# Explanation", "This diagram shows the flow from A to B to C."]
    ]
  }
}
```

**詳細なサンプル**: [scripts/test/test_markdown_mermaid.json](../scripts/test/test_markdown_mermaid.json)

### chart.js
```json
{
  "type": "chart",
  "title": "Sales and Profits (from Jan to June)",
  "chartData": {
    "type": "bar",
    "data": {
      "labels": ["January", "February", "March", "April", "May", "June"],
      "datasets": [
        {
          "label": "Revenue ($1000s)",
          "data": [120, 135, 180, 155, 170, 190],
          "backgroundColor": "rgba(54, 162, 235, 0.5)",
          "borderColor": "rgba(54, 162, 235, 1)",
          "borderWidth": 1
        },
        {
          "label": "Profit ($1000s)",
          "data": [45, 52, 68, 53, 61, 73],
          "backgroundColor": "rgba(75, 192, 192, 0.5)",
          "borderColor": "rgba(75, 192, 192, 1)",
          "borderWidth": 1
        }
      ]
    },
    "options": {
      "responsive": true,
      "animation": false
    }
  }
}
```

### mermaid
```json
{
  "type": "mermaid",
  "title": "Business Process Flow",
  "code": {
    "kind": "text",
    "text": "graph LR\n    A[Market Research] --> B[Product Planning]\n    B --> C[Development]\n    C --> D[Testing]\n    D --> E[Manufacturing]\n    E --> F[Marketing]\n    F --> G[Sales]\n    G --> H[Customer Support]\n    H --> A"
  }
}
```

### html_tailwind
```json
{
  "type": "html_tailwind",
  "html": [
    "<main class=\"flex-grow\">",
    "  <!-- Hero Section -->",
    "  <section class=\"bg-blue-600 text-white py-20\">",
    "    <div class=\"container mx-auto px-6 text-center\">",
    "      <h1 class=\"text-4xl md:text-5xl font-bold mb-4\">Welcome to Mulmocast</h1>",
    "      <p class=\"text-lg md:text-xl mb-8\">A modern web experience powered by Tailwind CSS</p>",
    "      <a href=\"#features\" class=\"bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-100 transition\">",
    "        Learn More",
    "      </a>",
    "    </div>",
    "  </section>",
    "",
    "  <!-- Features Section -->",
    "  <section id=\"features\" class=\"py-16 bg-gray-100\">",
    "    <div class=\"container mx-auto px-6\">",
    "      <div class=\"grid grid-cols-1 md:grid-cols-3 gap-8 text-center\">",
    "        <div>",
    "          <div class=\"text-blue-600 text-4xl mb-2\">⚡</div>",
    "          <h3 class=\"text-xl font-semibold mb-2\">Fast</h3>",
    "          <p class=\"text-gray-600\">Built with performance in mind using modern tools.</p>",
    "        </div>",
    "        <div>",
    "          <div class=\"text-blue-600 text-4xl mb-2\">🎨</div>",
    "          <h3 class=\"text-xl font-semibold mb-2\">Beautiful</h3>",
    "          <p class=\"text-gray-600\">Styled with Tailwind CSS for clean, responsive design.</p>",
    "        </div>",
    "        <div>",
    "          <div class=\"text-blue-600 text-4xl mb-2\">🚀</div>",
    "          <h3 class=\"text-xl font-semibold mb-2\">Launch Ready</h3>",
    "          <p class=\"text-gray-600\">Easy to deploy and extend for your next big idea.</p>",
    "        </div>",
    "      </div>",
    "    </div>",
    "  </section>",
    "</main>",
    "",
    "<!-- Footer -->",
    "<footer class=\"bg-white text-gray-500 text-center py-6 border-t\">",
    "  2025 Mulmocast.",
    "</footer>"
  ]
}
```

### slide（構造化スライド）

JSON DSLで構造化されたプレゼンテーションスライドを生成。11種のレイアウト、7種のコンテンツブロック、13色のテーマシステムをサポート。Tailwind CSS + Puppeteerでレンダリング。

テーマは`slideParams.theme`でグローバルに設定するか、`beat.image.theme`でbeat単位に上書き可能。

```json
{
  "type": "slide",
  "slide": {
    "layout": "title",
    "title": "Main Title",
    "subtitle": "Subtitle"
  }
}
```

#### columns レイアウト
```json
{
  "type": "slide",
  "slide": {
    "layout": "columns",
    "title": "Three Approaches",
    "columns": [
      { "title": "Plan A", "accentColor": "primary", "content": [{ "type": "bullets", "items": ["Feature 1", "Feature 2"] }] },
      { "title": "Plan B", "accentColor": "accent", "content": [{ "type": "bullets", "items": ["Feature 3", "Feature 4"] }] },
      { "title": "Plan C", "accentColor": "success", "content": [{ "type": "bullets", "items": ["Feature 5", "Feature 6"] }] }
    ]
  }
}
```

#### stats レイアウト
```json
{
  "type": "slide",
  "slide": {
    "layout": "stats",
    "title": "Key Metrics",
    "stats": [
      { "value": "99.9%", "label": "Uptime", "color": "success", "change": "+0.1%" },
      { "value": "2.3M", "label": "Users", "color": "primary", "change": "+15%" }
    ]
  }
}
```

利用可能なレイアウト: `title`, `columns`, `comparison`, `grid`, `bigQuote`, `stats`, `timeline`, `split`, `matrix`, `table`, `funnel`

利用可能なコンテンツブロック: `text`, `bullets`, `code`, `callout`, `metric`, `divider`, `image`

プリセットテーマ: `dark`, `pop`, `warm`, `creative`, `minimal`, `corporate`（`assets/slide_themes/`に格納）

**詳細なスキーマ定義**: [src/slide/schema.ts](../src/slide/schema.ts)
**サンプル**: [scripts/test/test_slide_12.json](../scripts/test/test_slide_12.json)

### beat
#### 前のbeatのimageを使う
```json
{
  "type": "beat"
}
```

#### 指定したbeatのimageを使う（id で指定）
```json
{
  "type": "beat",
  "id": "second"
}
```

id は beat で指定する
```json
{
  "text": "This is the second beat.",
  "id": "second",
  "image": {
    "type": "textSlide",
    "slide": {
      "title": "This is the second beat."
    }
  }
}
```

### voice_over
既存の動画にナレーション（音声）やキャプションを重ねる場合に使用します。このタイプでは画像は生成されません。

```json
{
  "text": "8秒後に表示されるナレーション",
  "image": {
    "type": "voice_over",
    "startAt": 8.0
  }
}
```

詳細な使用例については [scripts/test/test_voice_over.json](../scripts/test/test_voice_over.json) を参考にしてください。

#### 注意事項
- `voice_over` タイプの beat では、直前の beat の動画が継続して表示されます
- 音声の開始タイミングは `startAt` パラメータで調整できます（省略可。省略時は直前の beat 終了後に開始）
- キャプションは音声と同じタイミングで表示します。
- キャプションの表示が終了するタイミングは次の beat が 空の voice_over かどうかで決まります。
  - **空の voice_over beat あり**: 直前の beat のキャプションは音声終了時に消えます
  - **空の voice_over beat なし**: 次の beat が始まるまでキャプションが表示され続けます

  空の voice_over beat の例：
  ```json
  {
    "image": {
      "type": "voice_over"
    }
  }
  ```

## 各条件での beat データ例

### 2. htmlPrompt

Provider/model の設定については [scripts/templates/presentation.json](../scripts/templates/presentation.json) を参考にしてください。

```json
{
  "htmlPrompt": {
    "prompt": "This slide presents the declining birthrate and fertility rate in Japan. Visualize the trend and explain the potential social impact.",
    "data": [
      { "year": 2000, "births": 1190000, "fertility_rate": 1.36 },
      { "year": 2020, "births": 841000, "fertility_rate": 1.34 }
    ]
  }
}
```

```json
{
  "htmlPrompt": {
    "prompt": "Explain the risks of increasing digital dependency for a country. Focus on issues like economic vulnerability, foreign technology reliance, and loss of competitiveness."
  }
}
```

### 3. imagePrompt

```json
{
  "text": "This message does not affect image generation.",
  "imagePrompt": "Generate an image with this message."
}
```

### 4. moviePrompt

```json
{
  "text": "This message does not affect image generation.",
  "moviePrompt": "Generate a movie with this message."
}
```

### 5. no imagePrompt and moviePrompt.
```json
{
  "text": "Generate an image with this message."
}
```

### 6. moviePrompt and (image or imagePrompt)

```json
{
  "text": "This message does not affect image generation.",
  "imagePrompt": "Generate an image with this message.",
  "moviePrompt": "Use the generated image and this message to generate a movie."
}
```

```json
{
  "text": "This message does not affect image generation.",
  "image": {
    "type": "image"
  },
  "moviePrompt": "Use the generated image and this message to generate a movie."
}
```

---

## studio.script.imageParams.images

OpenAIで画像処理をするときに画像の一貫性のために参照となる画像を渡せる。
その画像情報を元に、複数の画像を生成するときに一貫性を保つことができる。
たとえば昔話の作成時に、登場人物の作画の一貫性をだす。

```json
  "imageParams": {
    "style": "Photo realistic, cinematic style.",
    "images": {
      "optimus": {
        "type": "image",
        "source": {
          "kind": "url",
          "url": "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/optimus.png"
        }
      }
    }
  }
```

### imagePrompt で AI 生成する参照画像

`type: "imagePrompt"` を使うと、プロンプトから参照画像を AI 生成できます。オプションの `canvasSize` で画像ごとにアスペクト比を指定可能です（省略時はスクリプトのグローバル `canvasSize` を使用）。

```json
  "imageParams": {
    "provider": "google",
    "model": "gemini-3.1-flash-image-preview",
    "images": {
      "bg_portrait": {
        "type": "imagePrompt",
        "prompt": "Japanese garden with cherry blossoms, photorealistic, bright daylight"
      },
      "bg_landscape": {
        "type": "imagePrompt",
        "prompt": "Panoramic mountain vista, photorealistic, golden hour",
        "canvasSize": { "width": 1920, "height": 1080 }
      }
    }
  }
```

`canvasSize` は画像生成 API がサポートするアスペクト比に変換されます（例: 1920x1080 → 16:9）。

### movie で動画ファイルを参照

`type: "movie"` を使うと、動画ファイルを URL またはローカルパスで指定できます。定義した動画は `movie:name` で html_tailwind や markdown 内から参照できます。

```json
  "imageParams": {
    "images": {
      "bg_video": {
        "type": "movie",
        "source": {
          "kind": "path",
          "path": "./assets/background.mp4"
        }
      }
    }
  }
```

html_tailwind で `movie:name` として参照:

```json
{
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full w-full'>",
      "  <video src='movie:bg_video' autoplay muted style='width:100%;height:100%;object-fit:cover' />",
      "</div>"
    ]
  }
}
```

`movie:name` は `image:name` と同様に、ビルド時に `file://` 絶対パスに解決されます。

## beat.imageNames による登場人物コントロール

`beat.imageNames`は、**登場人物のコントロールに使うため**の機能です。`imageParams.images`で定義された登場人物の中から、そのbeatに登場する人物を選択的に指定できます。先生と生徒の会話であれば、先生だけが写る場面、生徒だけが写る場面を分けることが可能になります。

### 設定例

プレゼンテーションスタイルで複数の登場人物を定義：
```json
{
  "imageParams": {
    "style": "Anime style, classroom setting",
    "images": {
      "teacher": {
        "source": {
          "kind": "path",
          "path": "characters/teacher.png"
        }
      },
      "student": {
        "source": {
          "kind": "url", 
          "url": "https://example.com/characters/student.jpg"
        }
      }
    }
  }
}
```

### beat での使用例

**先生だけが写る場面**:
```json
{
  "text": "先生が授業を始めます",
  "imagePrompt": "Teacher starting the lesson",
  "imageNames": ["teacher"]
}
```

**生徒だけが写る場面**:
```json
{
  "text": "生徒が質問をします",
  "imagePrompt": "Student raising hand to ask question", 
  "imageNames": ["student"]
}
```

**両方が写る場面**:
```json
{
  "text": "先生と生徒が会話しています",
  "imagePrompt": "Teacher and student having conversation",
  "imageNames": ["teacher", "student"]
}
```

**imageNames省略時（全員登場）**:  

imageNamesを省略すると、定義されたすべての登場人物が参照される。  

```json
{
  "text": "教室の全体的な様子",
  "imagePrompt": "General classroom scene"
}
```

imageParams.imagesが定義されているときに、imagesを指定したくない場合は空の配列を指定してください

```json
{
  "text": "教室の全体的な様子",
  "imagePrompt": "General classroom scene",
  "imageNames": []
}
```


### 処理の流れ

1. **前処理**: `context.presentationStyle.imageParams?.images`で定義された画像（jpg/png）をurl/pathからダウンロード・保存してimageRefを作成
2. **画像agent処理**:
   - `beat.imageNames`がある場合: imageRefの中で、`beat.imageNames`（nameのarray）に一致する画像のみを選択
   - `beat.imageNames`がない場合: すべてのimageRefを選択
3. **OpenAI画像生成**: 選択された参照画像とプロンプトを`openai.images.edit()`に送信

## beat.images — Beat ローカルメディア参照

`beat.images` を使うと、特定の beat でのみ使用する画像・動画を定義できます。スキーマは `imageParams.images` と同じで、`image`/`imagePrompt`/`movie`/`moviePrompt` の全タイプをサポートします。

### 目的

- Beat ごとに背景画像やキャラクター画像を AI 生成し、`html_tailwind` 内で `image:name` として参照
- 生成した画像を `moviePrompt` の image-to-video 入力として使用（キャラクター・背景の一貫性確保）
- Beat ローカルの画像を `imageNames` で reference image として渡し、AI 画像生成の一貫性を保つ

### マージルール

- beat.images のキーがグローバル `imageRefs`/`movieRefs` と同名の場合、**beat ローカルが優先**
- `mergedImageRefs = { ...globalImageRefs, ...localImageRefs }`
- `mergedMovieRefs = { ...globalMovieRefs, ...localMovieRefs }`

### 解決順序（2段階）

1. **Stage 1**: `image`, `imagePrompt`, `movie` を並列解決
2. **Stage 2**: `moviePrompt` を解決（`imageName` で Stage 1 の imageRefs を参照可能）

### reference として渡せるもの

| 生成対象 | reference に渡せるもの | 渡せないもの |
|---------|----------------------|-------------|
| 画像生成 (`imageGenerator`) | `imageRefs` の画像（複数可） | `movieRefs` の動画 |
| 動画生成 (`movieGenerator`) | `imageRefs` の画像（1枚） | `movieRefs` の動画 |
| html_tailwind / markdown | `imageRefs` (`image:name`) + `movieRefs` (`movie:name`) | — |

### 使用例

#### imagePrompt + html_tailwind

beat 内で背景画像を AI 生成し、html_tailwind で参照:

```json
{
  "beats": [{
    "speaker": "Presenter",
    "text": "桜の庭園をご覧ください",
    "images": {
      "bg": {
        "type": "imagePrompt",
        "prompt": "Japanese cherry blossom garden, bright daylight, photorealistic"
      }
    },
    "image": {
      "type": "html_tailwind",
      "html": [
        "<div class='h-full w-full'>",
        "  <img src='image:bg' style='width:100%;height:100%;object-fit:cover' />",
        "  <div style='position:absolute;bottom:20%;left:10%;color:white;font-size:48px;font-weight:bold'>桜の庭園</div>",
        "</div>"
      ]
    }
  }]
}
```

#### imagePrompt + moviePrompt（image-to-video）

生成した画像を `moviePrompt` の入力に使い、動画を生成:

```json
{
  "beats": [{
    "speaker": "Presenter",
    "text": "庭園のパンショット",
    "images": {
      "bg": {
        "type": "imagePrompt",
        "prompt": "Cherry blossom garden, bright daylight"
      },
      "pan": {
        "type": "moviePrompt",
        "prompt": "Slow dolly forward through the garden",
        "imageName": "bg"
      }
    },
    "image": {
      "type": "html_tailwind",
      "html": [
        "<video src='movie:pan' autoplay muted style='width:100%;height:100%;object-fit:cover' />"
      ]
    }
  }]
}
```

`moviePrompt.imageName` は **imageRefs のキー名のみ** 指定可能です（動画パスは動画生成 API に渡せないため）。

#### グローバル + ローカル混在

グローバルで定義したキャラクター画像と、beat ローカルの背景画像を組み合わせ:

```json
{
  "imageParams": {
    "images": {
      "character": {
        "type": "imagePrompt",
        "prompt": "Anime style teacher character, full body"
      }
    }
  },
  "beats": [{
    "speaker": "Presenter",
    "text": "先生が教室で授業を始めます",
    "images": {
      "classroom_bg": {
        "type": "imagePrompt",
        "prompt": "Bright classroom interior, anime style"
      }
    },
    "imageNames": ["character"],
    "image": {
      "type": "html_tailwind",
      "html": [
        "<div class='h-full w-full'>",
        "  <img src='image:classroom_bg' style='width:100%;height:100%;object-fit:cover' />",
        "</div>"
      ]
    }
  }]
}
```

この例では、`character` はグローバル、`classroom_bg` は beat ローカルの imageRefs にマージされます。`imageNames: ["character"]` により、画像生成時の reference image として `character` のみが渡されます。
