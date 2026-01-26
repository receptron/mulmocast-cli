# Caption Split 機能設計

## 概要

長いテキストのキャプションを分割し、適切なタイミングで表示する機能。

## 2つの分割概念

### 1. テキスト分割 (textSplit)

テキストを複数のセグメントに分割する。**何を表示するか**を決定。

**方法:**
- **手動分割**: ユーザーが `texts` 配列で明示的に指定
- **自動分割**: `textSplit` 設定に基づいて `text` を自動分割

### 2. タイミング分割 (captionSplit)

各セグメントの表示時間を決定する。**いつ・どのくらい表示するか**を決定。

| 値 | 説明 | 実装状況 |
|---|---|---|
| `none` | 分割しない。`text`全体を1つのキャプションとして表示 | 実装済 |
| `estimate` | テキスト長（文字数/モーラ数）に比例して時間を配分 | 実装済（文字数ベース） |
| `generate` | 分割テキストごとに音声生成し、その時間を使用 | 未実装 |
| `measure` | 生成音声をSTTでタイムスタンプ取得 | 未実装 |
| `split` | 分割音声を生成→結合してaudio/movieに使用 | 未実装 |

## スキーマ

### MulmoBeat

```typescript
text?: string;      // 単一テキスト（音声用）
texts?: string[];   // 手動分割済みテキスト（キャプション用、textより優先）
```

### captionParams

```typescript
const mulmoCaptionParamsSchema = z.object({
  lang: z.string().optional(),
  styles: z.array(z.string()).optional(),

  // タイミング分割: いつ・どのくらい表示するか
  captionSplit: z.enum(["none", "estimate"]).optional(),  // default: "none"

  // テキスト分割: 何を表示するか
  textSplit: z.discriminatedUnion("type", [
    z.object({ type: z.literal("none") }),
    z.object({
      type: z.literal("delimiters"),
      delimiters: z.array(z.string()).optional(),  // default: ["。", "？", "！", ".", "?", "!"]
    }),
    // 将来拡張:
    // z.object({
    //   type: z.literal("length"),
    //   maxLength: z.number().optional(),
    //   preferDelimiters: z.array(z.string()).optional(),
    // }),
    // z.object({
    //   type: z.literal("morphological"),
    //   unit: z.enum(["sentence", "clause"]).optional(),
    // }),
  ]).optional(),  // default: { type: "none" }
});
```

### captionFiles (出力)

```typescript
captionFiles: z.array(
  z.object({
    file: z.string(),
    startAt: z.number(),  // 絶対時間（秒）
    endAt: z.number(),    // 絶対時間（秒）
  })
).optional()
```

## データフロー

```
入力: beat.text, beat.texts
         ↓
    ┌────────────────────────┐
    │   テキスト分割          │
    │   (textSplit)           │
    │                         │
    │   texts あり → そのまま │
    │   type: none → 分割なし │
    │   type: delimiters → 区切り文字で分割 │
    └────────────────────────┘
         ↓
    分割されたテキスト配列: ["文1。", "文2。", "文3。"]
         ↓
    ┌────────────────────────┐
    │   タイミング決定        │
    │   (captionSplit)        │
    │                         │
    │   none → 分割なし（1つのキャプション）│
    │   estimate → テキスト長で時間配分 │
    └────────────────────────┘
         ↓
    captionFiles: [
      { file: "...", startAt: 1.0, endAt: 2.5 },
      { file: "...", startAt: 2.5, endAt: 4.0 },
      { file: "...", startAt: 4.0, endAt: 6.0 }
    ]
```

## 使用例

### 例1: 分割なし（デフォルト）

```json
{
  "captionParams": {
    "lang": "ja"
  },
  "beats": [
    { "text": "これは長いテキストです。全て一度に表示されます。" }
  ]
}
```

### 例2: 手動分割 + estimate

```json
{
  "captionParams": {
    "captionSplit": "estimate"
  },
  "beats": [
    {
      "text": "これは長いテキストです。分割して表示されます。",
      "texts": [
        "これは長いテキストです。",
        "分割して表示されます。"
      ]
    }
  ]
}
```

### 例3: 自動分割（デリミタ）+ estimate

```json
{
  "captionParams": {
    "captionSplit": "estimate",
    "textSplit": {
      "type": "delimiters",
      "delimiters": ["。", "！", "？"]
    }
  },
  "beats": [
    { "text": "これは長いテキストです。自動で分割されます。便利ですね！" }
  ]
}
```

## 実装箇所

### 現在の実装

| ファイル | 役割 |
|---|---|
| `src/actions/captions.ts` | キャプション画像生成、タイミング計算 |
| `src/actions/audio.ts` | 音声生成（beat単位） |
| `src/actions/movie.ts` | 動画合成時のキャプションオーバーレイ |

### captionSplit による実装箇所の違い

#### `none` / `estimate` （実装済）

```
captions.ts のみで完結
  └─ テキスト分割 → タイミング計算 → キャプション画像生成
```

- `captions.ts` の `generateCaption` エージェント内で処理
- 音声生成（`audio.ts`）とは独立

#### `generate` （未実装）

分割テキストごとに音声を生成し、その長さでタイミングを決定。

```
audio.ts (変更必要)
  └─ texts[] がある場合、分割テキストごとに音声生成
  └─ 各音声の duration を studioBeat に保存
        ↓
captions.ts
  └─ studioBeat から分割音声の duration を取得
  └─ タイミング計算 → キャプション画像生成
```

**実装ポイント:**
1. `audio.ts`: `beat.texts` がある場合、個別に音声生成する処理を追加
2. `schema.ts`: `studioBeat` に分割音声情報を保存するフィールド追加
3. `captions.ts`: 音声 duration からタイミングを計算するロジック追加

#### `measure` （未実装）

生成音声をSTT（Speech-to-Text）で解析し、単語/フレーズのタイムスタンプを取得。

```
audio.ts
  └─ 通常通り text 全体で音声生成
        ↓
新規: stt_agent または whisper_agent
  └─ 生成音声を STT で解析
  └─ texts[] の各セグメントの開始/終了時刻を特定
        ↓
captions.ts
  └─ STT結果からタイミング取得 → キャプション画像生成
```

**実装ポイント:**
1. `src/agents/stt_whisper_agent.ts`: 新規作成。音声ファイルからタイムスタンプ付きテキストを取得
2. `src/actions/captions.ts`: STT結果を使ってタイミングを決定するロジック追加
3. 処理順序: `audio` → `stt` → `captions` の依存関係が必要

#### `split` （未実装）

分割テキストごとに音声生成し、結合した音声をメイン音声として使用。

```
audio.ts (大幅変更)
  └─ texts[] がある場合:
      1. 分割テキストごとに音声生成
      2. 各音声の duration を記録
      3. 音声ファイルを結合して beatの音声とする
        ↓
captions.ts
  └─ 記録された duration からタイミング計算
  └─ キャプション画像生成
```

**実装ポイント:**
1. `audio.ts`: 分割音声生成 → 結合の処理を追加
2. `src/agents/combine_audio_files_agent.ts`: 既存のエージェントを活用
3. 音声品質: 分割生成→結合は継ぎ目が不自然になる可能性あり（要検討）

### 処理順序の依存関係

```
現在:  audio → images → captions → movie  (独立)

generate/split の場合:
       audio (分割音声生成)
          ↓
       captions (音声durationを使用)
          ↓
       movie

measure の場合:
       audio → stt → captions → movie
```

## 現在の実装状況（2025-01時点）

### 完了した実装

| 項目 | ファイル | 内容 |
|---|---|---|
| スキーマ定義 | `src/types/schema.ts` | `textSplitSchema`, `captionSplitSchema`, `texts` フィールド追加 |
| キャプション生成 | `src/actions/captions.ts` | `generateBeatCaptions`, `captionGenerationAgent` に分離 |
| 動画合成 | `src/actions/movie.ts` | 絶対時間 (`startAt`/`endAt`) でキャプションオーバーレイ |
| 設計ドキュメント | `docs/caption_split.md` | このファイル |

### 主要関数（captions.ts）

```typescript
// テキスト分割
splitTextByDelimiters(text, delimiters)  // デリミタで分割
getSplitTexts(text, texts, textSplit)    // 分割テキスト取得（texts優先）

// タイミング計算
calculateTimingRatios(splitTexts)        // テキスト長から比率
calculateCumulativeRatios(ratios)        // 累積比率に変換

// キャプション生成
generateBeatCaptions(beat, context, index)  // ビート単位のキャプション生成
captionGenerationAgent(namedInputs)         // GraphAIエージェント（セッション管理）
```

## 既知の問題・制限事項

### `texts` と `text` の関係

現状、`texts` は**キャプション分割専用**。音声生成などは `text` を使用。

```
現在の動作:
- 音声生成: beat.text を使用
- キャプション: captionSplit="estimate" の場合、texts があれば texts を使用

将来的には:
- texts のみ指定 → text は texts.join("") として扱う
- これには MulmoBeatMethods.getText(beat) のような関数が必要
- audio.ts, translate.ts など beat.text を使う全箇所の修正が必要
```

**TODO**: `texts` のみ指定した場合の動作を検討・実装する

### 日本語テキストのタイミング精度

`estimate` モードは**文字数ベース**で時間配分するが、日本語では不正確:
- 漢字1文字 ≠ ひらがな1文字（発音時間が異なる）
- 例: 「東京」(2文字) vs 「とうきょう」(5文字) は同じ発音時間

**TODO**: モーラ数ベースの計算（形態素解析ライブラリ: kuromoji, mecab など）

### GraphAI の `:beat.text` 参照

`translate.ts` などで GraphAI のデータ参照 `:beat.text` を使用している箇所あり。
これらは `texts` を考慮していない。

```typescript
// translate.ts:107 - GraphAI input
text: ":beat.text"  // texts を考慮していない
```

**TODO**: GraphAI 参照を使う箇所の `texts` 対応を検討

## TODO リスト

### 高優先度

- [ ] `texts` のみ指定時の動作実装
  - `MulmoBeatMethods.getText(beat)` 関数追加
  - `audio.ts`, `translate.ts`, `prompt.ts` などの修正

- [ ] E2Eテスト追加
  - `scripts/test/test_captions.json` に captionSplit テストケース追加
  - 分割キャプションが正しく生成されるか検証

### 中優先度

- [ ] `captionSplit: "generate"` 実装
  - `audio.ts` で texts[] 対応
  - studioBeat に分割音声 duration 保存

- [ ] `captionSplit: "measure"` 実装
  - Whisper API でタイムスタンプ取得
  - `src/agents/stt_whisper_agent.ts` 新規作成

### 低優先度

- [ ] モーラ数ベースの estimate 改善
- [ ] `textSplit: { type: "length" }` 実装
- [ ] `textSplit: { type: "morphological" }` 実装
- [ ] `captionSplit: "split"` 実装（音声分割生成→結合）

## 今後の拡張

### estimate の改善
- 日本語: モーラ数ベースの計算（形態素解析が必要）
- 英語: 音節数ベースの計算

### textSplit の拡張
- `type: "length"`: 最大文字数で分割
- `type: "morphological"`: 形態素解析ベースで文節分割

### captionSplit の拡張
- `generate`: 分割テキストごとに音声生成して時間測定
- `measure`: STTでタイムスタンプ取得
- `split`: 分割音声を結合して使用

## 関連コミット履歴

```
feat/split-captions ブランチで開発

- feat: add textSplit schema and caption split documentation
- feat: use text-length-based timing and absolute times for captions
- refactor: extract caption generation logic into separate functions
```
