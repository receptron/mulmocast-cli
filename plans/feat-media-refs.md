# feat: メディア参照の拡張 — moviePrompt + beat ローカル参照

## 背景

現在 `imageParams.images` で定義できるのは静止画のみ:
- `image`: 既存の画像ファイル（url/path/base64）
- `imagePrompt`: AI 生成画像（テキストプロンプト）

html_tailwind / slide / markdown で `image:name` として参照画像を埋め込めるが:
- 動画参照（`movie:name`）は未対応
- beat ごとに固有の参照を定義する方法がない（全 beat 共通のグローバル定義のみ）

## 現状の仕組み

```
imageParams.images → getImageRefs() → Record<string, string>（名前→ファイルパス）
                                         ↓
                     各プラグインで消費（html_tailwind, slide, markdown）
                     resolveImageRefs(): src="image:name" → src="file:///path"
```

## 提案

### Phase 1: imageParams.images に moviePrompt 追加 + 動画参照の解決

#### Schema 変更

```typescript
// 新規追加
export const mulmoMoviePromptMediaSchema = z.object({
  type: z.literal("moviePrompt"),
  prompt: z.string().min(1),
  imageName: z.string().optional(), // 別の image ref を参照して image-to-video
}).strict();

// union に追加
export const mulmoImageParamsImagesValueSchema = z.union([
  mulmoImageMediaSchema,          // type: "image"
  mulmoImagePromptMediaSchema,    // type: "imagePrompt"
  mulmoMoviePromptMediaSchema,    // type: "moviePrompt" ← NEW
]);
```

#### `imageName` フィールド

moviePrompt は画像→動画変換をサポート。`imageName` で別の imageRef を指定すると、その画像を元に動画を生成:

```json
{
  "imageParams": {
    "images": {
      "bg_office": {
        "type": "imagePrompt",
        "prompt": "modern office, bright daylight"
      },
      "office_pan": {
        "type": "moviePrompt",
        "prompt": "slow camera pan across the office",
        "imageName": "bg_office"
      }
    }
  }
}
```

#### imageRefs と movieRefs の分離

既存の `imageRefs: Record<string, string>` はそのまま維持。動画用に `movieRefs: Record<string, string>` を別途追加:

```typescript
const imageRefs: Record<string, string> = {};  // 既存（画像のみ）
const movieRefs: Record<string, string> = {};  // 新規（動画のみ）
```

→ 既存コードへの影響が最小限。

#### 参照解決の拡張

`resolveImageRefs()` を拡張して `src="movie:name"` も解決:

```html
<!-- Before -->
<video src="movie:office_pan" autoplay muted />

<!-- After -->
<video src="file:///path/to/office_pan.mp4" autoplay muted />
```

#### 処理の2段階化

`imageName` で画像 ref を参照する場合、依存順序が発生:

```
1. getImageRefs() → 画像を生成/取得 → imageRefs
2. getMovieRefs(imageRefs) → 動画を生成 → movieRefs
```

### Phase 2: beat 内にローカルな参照を定義

グローバル（`imageParams.images`）に加え、**beat 内にローカルな参照を定義**して同じ beat の html_tailwind 等で使えるようにする。

```json
{
  "beats": [
    {
      "images": {
        "bg": { "type": "imagePrompt", "prompt": "Japanese garden with cherry blossoms" },
        "pan": { "type": "moviePrompt", "prompt": "slow dolly forward", "imageName": "bg" }
      },
      "image": {
        "type": "html_tailwind",
        "html": [
          "<div class='h-full w-full relative'>",
          "  <video src='movie:pan' autoplay muted style='width:100%;height:100%;object-fit:cover' />",
          "  <div style='position:absolute;bottom:100px;left:40px;color:white;font-size:72px'>桜の庭園</div>",
          "</div>"
        ]
      }
    }
  ]
}
```

#### Schema

```typescript
// beat に images フィールドを追加（imageParams.images と同じスキーマ）
images: mulmoImageParamsImagesSchema.optional()
```

#### 参照の優先順位

beat ローカル参照 > グローバル参照（同名の場合ローカルが優先）

#### 処理フロー

```
1. getImageRefs(context) → グローバル imageRefs/movieRefs
2. beat ごとに:
   a. beat.images があれば → ローカル imageRefs/movieRefs を生成
   b. グローバルとローカルをマージ（ローカル優先）
   c. マージした refs をプラグインに渡す
```

## 実装順序

1. Phase 1: moviePrompt in imageParams + movieRefs + movie:name 解決
2. Phase 2: beat.images ローカル参照
3. (将来) lipSync 参照（別 issue）

## 影響範囲

| ファイル | Phase | 変更内容 |
|---------|-------|---------|
| `src/types/schema.ts` | 1,2 | moviePrompt スキーマ追加、beat.images フィールド追加 |
| `src/actions/image_references.ts` | 1,2 | moviePrompt 生成ロジック、movieRefs 返却 |
| `src/actions/images.ts` | 1,2 | movieRefs のグラフ注入、beat.images の処理 |
| `src/actions/image_agents.ts` | 2 | beat ローカル参照の解決・マージ |
| `src/utils/image_plugins/html_tailwind.ts` | 1 | `movie:name` 参照の解決 |
| `src/utils/image_plugins/markdown.ts` | 1 | 同上 |
| `src/types/type.ts` | 1 | ImageProcessorParams に movieRefs 追加 |

## 課題・リスク

- **依存順序**: `imageName` で画像 ref を参照 → 画像生成完了後に動画生成（2段階）
- **キャッシュ**: 動画生成は高コスト → 既存のファイルキャッシュ機構を活用
- **beat ローカル参照の生成タイミング**: beat の画像生成前にローカル参照を解決する必要がある。グラフの構造変更が必要になる可能性
- **並列処理**: グローバル参照は全 beat で事前生成可能だが、ローカル参照は beat ごとに生成 → 並列化に注意
