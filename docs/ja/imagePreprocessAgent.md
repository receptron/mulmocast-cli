# imagePreprocessAgent 仕様書
(claude codeにより自動生成)
## 概要

`imagePreprocessAgent`は、MulmocastのGraphAIワークフロー内で画像生成前の前処理を行うエージェント関数です。各beatの内容に基づいてプロンプトの生成、パスの設定、プラグイン処理などを行い、後続の画像生成エージェントに必要な情報を提供します。

## 関数シグネチャ

```typescript
const imagePreprocessAgent = async (namedInputs: {
  context: MulmoStudioContext;
  beat: MulmoBeat;
  index: number;
  suffix: string;
  imageDirPath: string;
  imageAgentInfo: Text2ImageAgentInfo;
  imageRefs: Record<string, string>;
}) => Promise<PreprocessResult>
```

## 入力パラメータ

| パラメータ名    | 型                     | 説明                           |
|-------------|----------------------|------------------------------|
| context     | MulmoStudioContext   | スタジオのコンテキスト情報               |
| beat        | MulmoBeat           | 処理対象のbeat情報                  |
| index       | number              | beatのインデックス番号                |
| suffix      | string              | ファイル名に付与するサフィックス           |
| imageDirPath| string              | 画像保存ディレクトリのパス              |
| imageAgentInfo| Text2ImageAgentInfo | 画像生成エージェントの設定情報           |
| imageRefs   | Record<string, string>| 画像参照のマップ（名前 → パス）          |

## 出力

```typescript
type PreprocessResult = {
  imagePath?: string;        // 生成される画像のパス
  prompt?: string;          // 画像生成用プロンプト
  imageParams: MulmoImageParams; // 画像生成パラメータ
  movieFile?: string;       // 動画ファイルのパス（動画生成時）
  images: string[];         // 編集用画像のパス一覧
}
```

## 処理フロー

### 1. 初期設定
- `imageParams`を`imageAgentInfo.imageParams`と`beat.imageParams`をマージして生成
- `imagePath`を`${imageDirPath}/${context.studio.filename}/${index}${suffix}.png`として設定
- `movieFile`を`beat.moviePrompt`が存在する場合に設定

### 2. 画像プラグイン処理
`beat.image`が存在する場合、対応するプラグインを実行：
- `textSlide`: テキストスライド画像生成
- `markdown`: Markdown画像生成
- `chart`: チャート画像生成
- `mermaid`: mermaid図表生成
- `slide`: 構造化スライドDSL（11レイアウト、Tailwind CSS + Puppeteer）

プラグイン処理時：
- セッション状態を管理（`MulmoStudioContextMethods.setBeatSessionState`）
- プラグインが成功した場合、`imagePath`と共に結果を返す

### 3. 画像参照処理
編集用画像の準備：
```typescript
const images = (() => {
  const imageNames = beat.imageNames ?? Object.keys(imageRefs);
  const sources = imageNames.map((name) => imageRefs[name]);
  return sources.filter((source) => source !== undefined);
})();
```

### 4. プロンプト生成
以下の条件分岐でプロンプトを決定：

#### moviePromptのみの場合（imagePromptなし）
```typescript
if (beat.moviePrompt && !beat.imagePrompt) {
  return { ...returnValue, images }; // プロンプト生成なし
}
```

#### 通常の場合
`imagePrompt`関数を使用してプロンプト生成：
```typescript
const prompt = imagePrompt(beat, imageParams.style);
return { imagePath, prompt, ...returnValue, images };
```

## プロンプト生成ロジック

`imagePrompt`関数（`src/utils/prompt.js`）により以下の優先順位でプロンプトを生成：

1. `beat.imagePrompt` が存在する場合 → そのまま使用
2. `beat.text` が存在する場合 → `"generate image appropriate for the text. text: {beat.text}"`
3. どちらも存在しない場合 → `"generate image appropriate for the text. text: undefined"`

最終プロンプトは `prompt + "\n" + style` の形式

## 使用例

### 基本的な使用例
```typescript
const result = await imagePreprocessAgent({
  context: mulmoContext,
  beat: {
    text: "Beautiful sunset over mountains",
    imageParams: { style: "photorealistic" }
  },
  index: 0,
  suffix: "p",
  imageDirPath: "/output/images",
  imageAgentInfo: {
    provider: "openai",
    agent: "imageOpenaiAgent",
    imageParams: { model: "dall-e-3", style: "natural" }
  },
  imageRefs: {}
});

// 結果:
// {
//   imagePath: "/output/images/studio_name/0p.png",
//   prompt: "generate image appropriate for the text. text: Beautiful sunset over mountains\nphotorealistic",
//   imageParams: { model: "dall-e-3", style: "photoreistic" },
//   movieFile: undefined,
//   images: []
// }
```

### 動画生成のみの場合
```typescript
const result = await imagePreprocessAgent({
  // ... 他のパラメータ
  beat: {
    moviePrompt: "Flying through clouds",
    // imagePromptなし
  }
});

// 結果:
// {
//   imageParams: { ... },
//   movieFile: "/output/images/studio_name/0.mov",
//   images: []
//   // imagePath, promptは含まれない
// }
```

### 画像編集用リファレンス画像付き
```typescript
const result = await imagePreprocessAgent({
  // ... 他のパラメータ
  beat: {
    text: "Edit this image",
    imageNames: ["ref1", "ref2"]
  },
  imageRefs: {
    ref1: "/images/reference1.png",
    ref2: "/images/reference2.png"
  }
});

// 結果:
// {
//   // ... 他のフィールド
//   images: ["/images/reference1.png", "/images/reference2.png"]
// }
```

## 関連ファイル

- **実装**: `src/actions/images.ts:33-77`
- **テスト**: `test/actions/test_image_preprocess_agent.ts`
- **使用箇所**: `src/actions/images.ts:104-115` (GraphAIのmapAgent内)
- **プロンプト生成**: `src/utils/prompt.js`
- **画像プラグイン**: `src/utils/image_plugins/index.js`

## 注意事項

1. **セッション状態管理**: 画像プラグイン処理時は適切にセッション状態を設定・解除する
2. **エラーハンドリング**: プラグイン処理でエラーが発生してもセッション状態のクリーンアップを保証する
3. **パラメータマージ**: `beat.imageParams`は`imageAgentInfo.imageParams`を上書きする
4. **条件分岐**: `moviePrompt`のみの場合は画像生成をスキップする
5. **画像参照**: `imageNames`が未指定の場合は全ての`imageRefs`を使用する