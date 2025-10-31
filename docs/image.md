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
8. 画像が生成され、beatに`enableLipSync`の指定があれば、画像と音声ファイルを使ってリップシンクの処理を行う。生成物は動画になる。
9. `audioParams.suppressSpeech: true`が指定されている場合、全てのbeatでテキストからの音声読み上げ（TTS）を行わず、音声トラックはBGMのみになる

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
  - `image.type: "movie"` や `moviePrompt` で動画が生成されると、動画長が音声長より長い場合は動画長を採用。音声が無い beat でも動画があれば動画長がそのまま beat の長さになります。  
  - movie に速度指定 (`movieParams.speed`) がある場合はそれを反映した長さで計算します。
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
    "url": "../../test/pingpong.mov"
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

### markdonwのslide
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

### 処理の流れ

1. **前処理**: `context.presentationStyle.imageParams?.images`で定義された画像（jpg/png）をurl/pathからダウンロード・保存してimageRefを作成
2. **画像agent処理**: 
   - `beat.imageNames`がある場合: imageRefの中で、`beat.imageNames`（nameのarray）に一致する画像のみを選択
   - `beat.imageNames`がない場合: すべてのimageRefを選択
3. **OpenAI画像生成**: 選択された参照画像とプロンプトを`openai.images.edit()`に送信
