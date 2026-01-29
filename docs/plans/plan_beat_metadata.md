# MulmoScript メタデータ拡張プラン

## 概要

1つのMulmoScriptから複数のバリエーション（フル版、要約版、ティーザー版など）を生成できるようにする。

## 課題

単純なフィルタリング方式では話が飛ぶ問題がある：
- beat 1: 「まず背景を説明します」
- beat 2: (詳細な背景説明) ← フィルタで削除
- beat 3: 「次に本題に入ります」

→ 「背景を説明します」と言っておきながら説明がない不自然な流れに。

## 解決策: バリアント（差し替え）方式

各beatに対してプロファイルごとの差し替えテキストを定義できるようにする。

## 1. 型定義

### 1.1 Beat バリアントスキーマ

```typescript
// src/types/schema.ts に追加

// バリアントで上書き可能なフィールド
export const beatVariantSchema = z.object({
  // テキスト差し替え
  text: z.string().optional(),

  // このプロファイルでスキップ
  skip: z.boolean().optional(),

  // 画像も差し替え可能
  image: mulmoImageAssetSchema.optional(),
  imagePrompt: z.string().optional(),

  // 音声パラメータ上書き
  speechOptions: speechOptionsSchema.optional(),
}).strict();

// バリアント辞書（プロファイル名 → 上書き内容）
export const beatVariantsSchema = z.record(z.string(), beatVariantSchema);
```

### 1.2 Beat メタデータスキーマ（Q&A・分類用）

```typescript
// 参照情報（beat単位で複数持てる）
export const beatReferenceSchema = z.object({
  // 参照の種類
  type: z.enum(["web", "pdf", "paper", "book", "video", "image", "code"]),

  // URL or パス
  url: z.string().optional(),
  path: z.string().optional(),

  // タイトル・説明
  title: z.string().optional(),
  description: z.string().optional(),

  // 参照箇所（ページ番号、セクション名など）
  location: z.string().optional(),
}).strict();

export const beatMetaSchema = z.object({
  // === 分類 ===
  tags: z.array(z.string()).optional(),
  section: z.string().optional(),

  // === Q&A用コンテキスト ===
  // このbeatの詳細説明（画像beatなど、textだけでは内容がわからない場合）
  context: z.string().optional(),

  // キーワード（検索・マッチング用）
  keywords: z.array(z.string()).optional(),

  // 想定される質問（FAQ的に使える）
  expectedQuestions: z.array(z.string()).optional(),

  // === 参照情報 ===
  references: z.array(beatReferenceSchema).optional(),

  // === 関連 ===
  relatedBeats: z.array(z.string()).optional(),

  // === 拡張用 ===
  custom: z.record(z.string(), z.any()).optional(),
}).strict();
```

### 1.3 スクリプトレベルメタデータスキーマ（全体Q&A用）

```typescript
// スクリプト全体に関するメタデータ
export const scriptMetaSchema = z.object({
  // === 基本情報 ===
  // 対象読者・視聴者
  audience: z.string().optional(),

  // 前提知識
  prerequisites: z.array(z.string()).optional(),

  // 学習目標・ゴール
  goals: z.array(z.string()).optional(),

  // === Q&A用コンテキスト ===
  // プレゼン全体の背景・文脈
  background: z.string().optional(),

  // よくある質問と回答
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    relatedBeats: z.array(z.string()).optional(),
  })).optional(),

  // キーワード（全体検索用）
  keywords: z.array(z.string()).optional(),

  // === 参照情報（スクリプト全体） ===
  references: z.array(beatReferenceSchema).optional(),

  // === 作成情報 ===
  author: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),

  // === 拡張用 ===
  custom: z.record(z.string(), z.any()).optional(),
}).strict();
```

### 1.4 拡張された mulmoBeatSchema

```typescript
export const mulmoBeatSchema = z.object({
  // ... 既存フィールド ...

  // バリアント（プロファイルごとの差し替え）
  variants: beatVariantsSchema.optional(),

  // メタデータ（分類・クエリ用）
  meta: beatMetaSchema.optional(),
}).strict();
```

### 1.5 出力プロファイルスキーマ

```typescript
export const outputProfileSchema = z.object({
  name: z.string(),
  description: z.string().optional(),

  // プロファイル固有の上書き設定
  overrides: z.object({
    audioParams: audioParamsSchema.partial().optional(),
    movieParams: mulmoMovieParamsSchema.partial().optional(),
    canvasSize: mulmoCanvasDimensionSchema.optional(),
  }).optional(),
}).strict();
```

### 1.6 拡張された mulmoScriptSchema

```typescript
export const mulmoScriptSchema = mulmoPresentationStyleSchema.extend({
  // ... 既存フィールド ...

  // スクリプト全体のメタデータ（Q&A用）
  scriptMeta: scriptMetaSchema.optional(),

  // 出力プロファイル定義
  outputProfiles: z.record(z.string(), outputProfileSchema).optional(),
});
```

## 2. 具体例

### 2.1 メタデータ付きMulmoScript

```json
{
  "$mulmocast": { "version": "2.0" },
  "title": "GraphAI入門",
  "description": "GraphAIの基本概念から実践的な使い方まで解説",
  "lang": "ja",

  "scriptMeta": {
    "audience": "AIアプリケーション開発者、エンジニア",
    "prerequisites": ["JavaScript/TypeScriptの基礎知識", "LLM APIの基本的な理解"],
    "goals": [
      "GraphAIの基本概念を理解する",
      "エージェントとグラフ構造の関係を理解する",
      "簡単なワークフローを構築できるようになる"
    ],
    "background": "近年、LLMを活用したアプリケーション開発が増加しており、複雑なワークフローを効率的に構築するフレームワークの需要が高まっている。GraphAIはこの課題に対する解決策として開発された。",
    "keywords": ["GraphAI", "エージェント", "ワークフロー", "LLM", "AI開発"],
    "faq": [
      {
        "question": "GraphAIは無料で使えますか？",
        "answer": "はい、GraphAIはオープンソースで公開されており、MITライセンスで無料で使用できます。",
        "relatedBeats": ["intro"]
      },
      {
        "question": "どのLLMプロバイダーに対応していますか？",
        "answer": "OpenAI、Anthropic、Google Gemini、ローカルLLMなど主要なプロバイダーに対応しています。",
        "relatedBeats": ["what-is-agent"]
      }
    ],
    "references": [
      {
        "type": "web",
        "url": "https://github.com/receptron/graphai",
        "title": "GraphAI GitHub Repository",
        "description": "公式リポジトリ、ソースコードとドキュメント"
      },
      {
        "type": "web",
        "url": "https://graphai.dev",
        "title": "GraphAI公式ドキュメント"
      }
    ],
    "author": "GraphAI Team",
    "version": "1.0"
  },

  "outputProfiles": {
    "summary": {
      "name": "3分要約版",
      "description": "主要ポイントのみの短縮版"
    },
    "teaser": {
      "name": "30秒ティーザー",
      "description": "SNS用の短い紹介動画",
      "overrides": {
        "audioParams": { "padding": 0.2 }
      }
    }
  },

  "beats": [
    {
      "id": "intro",
      "text": "今日はGraphAIについて、基本概念から実践的な使い方まで詳しくお話しします。",
      "variants": {
        "summary": { "text": "GraphAIの概要を説明します。" },
        "teaser": { "text": "GraphAIを紹介します。" }
      },
      "meta": {
        "tags": ["intro"],
        "section": "opening",
        "keywords": ["GraphAI", "概要", "紹介"]
      }
    },
    {
      "id": "history",
      "text": "GraphAIの開発は2023年に始まりました。当初はシンプルなワークフローエンジンでしたが、徐々に機能が拡張され、現在ではマルチエージェントシステムの構築にも対応しています。",
      "variants": {
        "summary": { "text": "GraphAIは2023年に開発が始まり、現在はマルチエージェントシステムにも対応しています。" },
        "teaser": { "skip": true }
      },
      "meta": {
        "tags": ["history", "background"],
        "section": "chapter1",
        "keywords": ["2023年", "開発", "マルチエージェント"],
        "expectedQuestions": ["GraphAIはいつ作られましたか？", "開発の経緯は？"]
      }
    },
    {
      "id": "what-is-agent",
      "text": "エージェントとは、特定のタスクを実行する独立したコンポーネントです。",
      "image": { "type": "image", "source": { "kind": "path", "path": "agent-diagram.png" } },
      "variants": {
        "summary": { "text": "エージェントは特定のタスクを実行するコンポーネントです。" },
        "teaser": { "skip": true }
      },
      "meta": {
        "tags": ["concept", "agent"],
        "section": "chapter1",
        "context": "この図はエージェントの内部構造を示しています。左側が入力、中央が処理ロジック（LLM呼び出し、データ変換など）、右側が出力です。エージェントはステートレスで、同じ入力に対して同じ出力を返します。",
        "keywords": ["エージェント", "コンポーネント", "入力", "出力", "処理"],
        "expectedQuestions": ["エージェントとは何ですか？", "エージェントの役割は？"],
        "references": [
          {
            "type": "web",
            "url": "https://graphai.dev/docs/agents",
            "title": "エージェント詳細ドキュメント"
          },
          {
            "type": "code",
            "url": "https://github.com/receptron/graphai/tree/main/agents",
            "title": "エージェント実装例"
          }
        ]
      }
    },
    {
      "id": "graph-structure",
      "text": "GraphAIの特徴は、複数のエージェントをグラフ構造で接続できることです。",
      "image": { "type": "image", "source": { "kind": "path", "path": "graph-diagram.png" } },
      "variants": {
        "teaser": { "text": "エージェントをグラフ構造で接続し、複雑な処理を簡単に設計できます。" }
      },
      "meta": {
        "tags": ["concept", "graph"],
        "section": "chapter2",
        "context": "この図はGraphAIのワークフロー例です。ユーザー入力ノードからLLMエージェント、データ加工エージェントを経て最終出力に至る流れを示しています。ノード間の矢印はデータの流れを表し、並列実行も可能です。",
        "keywords": ["グラフ", "ノード", "エッジ", "ワークフロー", "並列実行"],
        "expectedQuestions": ["グラフ構造とは？", "どうやってエージェントを接続するの？"],
        "references": [
          {
            "type": "web",
            "url": "https://graphai.dev/docs/graph",
            "title": "グラフ構造ドキュメント"
          }
        ],
        "relatedBeats": ["what-is-agent"]
      }
    },
    {
      "id": "demo",
      "text": "実際にGraphAIを使ったデモをお見せします。",
      "image": { "type": "image", "source": { "kind": "path", "path": "code-example.png" } },
      "variants": {
        "summary": { "text": "実際のコード例を見てみましょう。" },
        "teaser": { "skip": true }
      },
      "meta": {
        "tags": ["demo", "example", "code"],
        "section": "chapter3",
        "context": "このコードはGraphAIの基本的な使い方を示しています。graphDataオブジェクトでノードとエッジを定義し、GraphAI.run()で実行します。この例ではユーザー入力を受け取り、LLMで処理して結果を返すシンプルなフローです。",
        "keywords": ["コード", "実装", "graphData", "run"],
        "references": [
          {
            "type": "code",
            "url": "https://github.com/receptron/graphai/blob/main/examples/basic.ts",
            "title": "サンプルコード（GitHub）"
          },
          {
            "type": "web",
            "url": "https://graphai.dev/docs/quickstart",
            "title": "クイックスタートガイド"
          }
        ]
      }
    },
    {
      "id": "conclusion",
      "text": "以上がGraphAIの概要でした。宣言的なアプローチで複雑なAIワークフローを構築できるGraphAI、ぜひお試しください。",
      "variants": {
        "summary": { "text": "GraphAIで複雑なAIワークフローを簡単に構築できます。ぜひお試しください。" },
        "teaser": { "text": "GraphAI、ぜひお試しください！" }
      },
      "meta": {
        "tags": ["conclusion"],
        "section": "closing",
        "keywords": ["まとめ", "宣言的", "ワークフロー"],
        "references": [
          {
            "type": "web",
            "url": "https://github.com/receptron/graphai",
            "title": "GraphAI GitHub（スター歓迎！）"
          }
        ]
      }
    }
  ]
}
```

### 2.2 生成結果の比較

**フル版（プロファイル指定なし）: 6 beats**
```
1. 今日はGraphAIについて、基本概念から実践的な使い方まで詳しくお話しします。
2. GraphAIの開発は2023年に始まりました。当初は...(長い説明)
3. エージェントとは、特定のタスクを実行する...(詳細説明)
4. GraphAIの特徴は、複数のエージェントをグラフ構造で...(詳細説明)
5. 実際にGraphAIを使ったデモをお見せします...(デモ説明)
6. 以上がGraphAIの概要でした。宣言的なアプローチで...
```

**要約版（--profile summary）: 6 beats（テキスト差し替え）**
```
1. GraphAIの概要を説明します。
2. GraphAIは2023年に開発が始まり、現在はマルチエージェントシステムにも対応しています。
3. エージェントは特定のタスクを実行するコンポーネントです。
4. GraphAIの特徴は、複数のエージェントをグラフ構造で...(元のまま)
5. 実際のコード例を見てみましょう。
6. GraphAIで複雑なAIワークフローを簡単に構築できます。ぜひお試しください。
```

**ティーザー版（--profile teaser）: 3 beats（スキップ + 差し替え）**
```
1. GraphAIを紹介します。
2. (history: skip)
3. (what-is-agent: skip)
4. エージェントをグラフ構造で接続し、複雑な処理を簡単に設計できます。
5. (demo: skip)
6. GraphAI、ぜひお試しください！
```

### 2.3 CLI使用例

```bash
# フル版
mulmo movie graphai.json

# 要約版
mulmo movie graphai.json --profile summary

# ティーザー版
mulmo movie graphai.json --profile teaser

# プロファイル一覧表示
mulmo tool profiles graphai.json
# → summary: 3分要約版
# → teaser: 30秒ティーザー

# クエリ（メタデータ活用）
mulmo tool query graphai.json "エージェントとは何？"
# → what-is-agent beatのテキストを元に回答

# 特定セクションのみ（メタデータでフィルタ）
mulmo movie graphai.json --section chapter1
# → history, what-is-agent のみ

# タグでフィルタ
mulmo movie graphai.json --tags concept
# → what-is-agent, graph-structure のみ
```

## 3. AI機能

### 3.1 Summarize（自動要約生成）

フルスクリプトから自動的に要約版のvariantsを生成する機能。

**CLI**
```bash
# 全beatに対してsummary variantを自動生成
mulmo tool summarize script.json --profile summary

# 文字数制限付き
mulmo tool summarize script.json --profile summary --max-chars 50

# 特定のbeatのみ
mulmo tool summarize script.json --profile summary --beat history,demo

# ドライラン（生成結果を表示のみ）
mulmo tool summarize script.json --profile summary --dry-run

# 既存variantを上書き
mulmo tool summarize script.json --profile summary --overwrite
```

**処理フロー**
```
1. スクリプト読み込み
2. 各beatのtextをLLMに送信
3. LLMが要約テキストを生成
4. variants.[profile].text に書き込み
5. スクリプトを保存（または--dry-runで表示のみ）
```

**LLMプロンプト例**
```
以下のプレゼンテーションの一部を要約してください。

コンテキスト:
- タイトル: {title}
- 全体の流れ: {beat_ids}
- 現在のbeat: {current_beat_id}
- 前のbeat要約: {prev_summary}
- 次のbeatの内容: {next_text_preview}

要約対象テキスト:
{text}

制約:
- {max_chars}文字以内
- 前後の文脈と自然につながるように
- 要点のみを残す
```

**出力例**
```bash
$ mulmo tool summarize graphai.json --profile summary --max-chars 50

Summarizing beats for profile 'summary'...

[intro]
  Original (72 chars): 今日はGraphAIについて、基本概念から実践的な使い方まで詳しくお話しします。
  Summary  (21 chars): GraphAIの概要を説明します。

[history]
  Original (156 chars): GraphAIの開発は2023年に始まりました。当初は...
  Summary  (48 chars): GraphAIは2023年開発開始、現在はマルチエージェント対応。

[what-is-agent]
  Original (134 chars): エージェントとは、特定のタスクを実行する...
  Summary  (32 chars): エージェントはタスク実行コンポーネント。

...

Done! Updated 6 beats with 'summary' variants.
Save changes? [Y/n]:
```

---

### 3.2 Query（質問応答）

スクリプト全体のメタデータ（scriptMeta）と各beatのメタデータ（meta）を活用した質問応答機能。

**CLI**
```bash
# 基本的な質問
mulmo tool query script.json "GraphAIとは何ですか？"

# セクション指定
mulmo tool query script.json "エージェントの種類は？" --section chapter1

# タグ指定
mulmo tool query script.json "具体例を教えて" --tags example,demo

# 詳細モード（参照元beat + 参照URL表示）
mulmo tool query script.json "特徴は？" --verbose

# 参照情報も取得してさらに詳しく回答
mulmo tool query script.json "詳しく教えて" --fetch-references

# JSON出力
mulmo tool query script.json "結論は？" --json
```

**処理フロー**
```
1. スクリプト読み込み
2. 質問からキーワード抽出
3. キーワードマッチング + expectedQuestionsマッチングでbeat特定
4. scriptMeta.faqに該当があれば優先的に使用
5. 特定されたbeatのtext + context + referencesをLLMに送信
6. LLMが回答を生成
7. 回答を表示（--verbose時は参照元も表示）
```

**LLMプロンプト例**
```
以下のプレゼンテーション資料を元に質問に回答してください。

=== プレゼンテーション情報 ===
タイトル: {title}
説明: {description}
対象読者: {scriptMeta.audience}
背景: {scriptMeta.background}

=== 関連FAQ ===
{matched_faq}

=== 関連コンテンツ ===
{beats_with_full_metadata}

=== 質問 ===
{question}

=== 回答の制約 ===
- 資料に書かれている内容を元に回答
- 画像beatの場合はcontextの説明を活用
- 該当する情報がない場合は「資料に記載がありません」と回答
- 参照URLがある場合は「詳細は○○を参照」と案内
```

**beats_with_full_metadata の形式**
```
## Beat: what-is-agent
- Section: chapter1
- Tags: concept, agent
- Keywords: エージェント, コンポーネント, 入力, 出力
- Text: エージェントとは、特定のタスクを実行する独立したコンポーネントです。
- Context: この図はエージェントの内部構造を示しています。左側が入力、中央が処理ロジック...
- Expected Questions: エージェントとは何ですか？, エージェントの役割は？
- References:
  - [web] エージェント詳細ドキュメント: https://graphai.dev/docs/agents
  - [code] エージェント実装例: https://github.com/receptron/graphai/tree/main/agents
```

**出力例**
```bash
$ mulmo tool query graphai.json "エージェントとは何ですか？"

エージェントとは、特定のタスクを実行する独立したコンポーネントです。
入力を受け取り、処理（LLM呼び出し、データ変換など）を行い、出力を返します。
エージェントはステートレスで、同じ入力に対して同じ出力を返します。

$ mulmo tool query graphai.json "エージェントとは？" --verbose

エージェントとは、特定のタスクを実行する独立したコンポーネントです。
入力を受け取り、処理（LLM呼び出し、データ変換など）を行い、出力を返します。

---
参照元:
- [what-is-agent] section:chapter1, tags:concept,agent
  画像: agent-diagram.png

参考資料:
- エージェント詳細ドキュメント: https://graphai.dev/docs/agents
- エージェント実装例: https://github.com/receptron/graphai/tree/main/agents

$ mulmo tool query graphai.json "GraphAIは無料ですか？"

はい、GraphAIはオープンソースで公開されており、MITライセンスで無料で使用できます。

---
(FAQ より回答)

$ mulmo tool query graphai.json "対応しているLLMは？" --json
{
  "answer": "OpenAI、Anthropic、Google Gemini、ローカルLLMなど主要なプロバイダーに対応しています。",
  "source": "faq",
  "relatedBeats": ["what-is-agent"],
  "references": [
    {
      "type": "web",
      "url": "https://graphai.dev/docs/agents",
      "title": "エージェント詳細ドキュメント"
    }
  ],
  "confidence": "high"
}
```

---

### 3.3 AI機能の型定義

```typescript
// src/types/ai_tools.ts

export const summarizeOptionsSchema = z.object({
  profile: z.string(),
  maxChars: z.number().optional(),
  beats: z.array(z.string()).optional(),  // 対象beat ID
  dryRun: z.boolean().optional(),
  overwrite: z.boolean().optional(),
});

export const queryOptionsSchema = z.object({
  question: z.string(),
  section: z.string().optional(),
  tags: z.array(z.string()).optional(),
  verbose: z.boolean().optional(),
  fetchReferences: z.boolean().optional(),  // 参照URLの内容も取得
  json: z.boolean().optional(),
});

export const querySourceSchema = z.object({
  type: z.enum(["beat", "faq", "scriptMeta"]),
  beatId: z.string().optional(),
  faqIndex: z.number().optional(),
});

export const queryResultSchema = z.object({
  answer: z.string(),
  source: querySourceSchema,
  relatedBeats: z.array(z.string()).optional(),
  references: z.array(beatReferenceSchema).optional(),
  confidence: z.enum(["high", "medium", "low"]),
});
```

## 4. 実装計画

### Phase 1: 型定義とバリアント処理

| ファイル | 変更内容 |
|---------|---------|
| `src/types/schema.ts` | `beatVariantSchema`, `beatMetaSchema`, `beatReferenceSchema`, `scriptMetaSchema`, `outputProfileSchema` 追加 |
| `src/utils/beat_variant.ts` | 新規: `applyVariant(beat, profile)`, `resolveBeat(beat, profile)` |
| `src/methods/mulmo_script.ts` | プロファイル適用ロジック |

### Phase 2: CLI対応

| ファイル | 変更内容 |
|---------|---------|
| `src/cli/common.ts` | `--profile` オプション追加 |
| `src/cli/commands/*/builder.ts` | 各コマンドにオプション追加 |
| `src/cli/commands/tool/profiles/` | 新規: プロファイル一覧コマンド |

### Phase 3: アクション層対応

| ファイル | 変更内容 |
|---------|---------|
| `src/actions/audio.ts` | プロファイル適用 |
| `src/actions/images.ts` | プロファイル適用 |
| `src/actions/movie.ts` | プロファイル適用 |

### Phase 4: Summarize（自動要約）

| ファイル | 変更内容 |
|---------|---------|
| `src/types/ai_tools.ts` | 新規: `summarizeOptionsSchema` |
| `src/tools/summarize_script.ts` | 新規: 要約生成ロジック |
| `src/cli/commands/tool/summarize/` | 新規: summarizeコマンド |

### Phase 5: Query（質問応答）

| ファイル | 変更内容 |
|---------|---------|
| `src/types/ai_tools.ts` | `queryOptionsSchema`, `queryResultSchema`, `querySourceSchema` 追加 |
| `src/tools/query_script.ts` | 新規: クエリ処理ロジック（FAQ検索、beatマッチング、context活用） |
| `src/utils/beat_matcher.ts` | 新規: キーワード・expectedQuestionsによるbeatマッチング |
| `src/cli/commands/tool/query/` | 新規: queryコマンド |
| `src/utils/beat_filter.ts` | 新規: `--section`, `--tags` フィルタ |

## 5. 後方互換性

- `variants` フィールドはオプショナル
- `meta` フィールドはオプショナル
- `outputProfiles` フィールドはオプショナル
- 既存のMulmoScriptはそのまま動作
- `--profile` 未指定時は元のテキストを使用（現行動作と同じ）

## 6. 優先順位

1. **Phase 1**: 型定義 + バリアント解決ロジック
2. **Phase 2**: `--profile` CLIオプション
3. **Phase 3**: audio/images/movie への適用
4. **Phase 4**: summarize コマンド（AI要約生成）
5. **Phase 5**: query コマンド（質問応答）
