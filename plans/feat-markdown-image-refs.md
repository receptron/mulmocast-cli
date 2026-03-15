# feat: imageRefs support for markdown plugin

## Background

`imageParams.images` で定義した参照画像は現在以下のプラグインで利用可能:

| Plugin | Support | 方式 |
|--------|---------|------|
| html_tailwind | ✅ | `src="image:name"` → `resolveImageRefs()` で `file://` URL に変換 |
| slide | ✅ | `{ "type": "imageRef", "ref": "name" }` ブロック → `resolveSlideImageRefs()` で data URL に変換 |
| markdown | ❌ | 未対応 |

## Goal

markdown プラグインで `image:name` 参照を使えるようにする。

## Approach

markdown は最終的に HTML に変換して Puppeteer でレンダリングする。
html_tailwind と同じ `resolveImageRefs()` パターンを適用できる。

### 対応パターン

1. **Markdown 画像構文**: `![alt](image:bg_office)` → `![alt](file:///path/to/bg_office.png)`
2. **HTML img タグ**: markdown 内の `<img src="image:bg_office">` → html_tailwind と同じ

### 実装手順

1. **`resolveImageRefs` を共有ユーティリティに移動**
   - 現在 `html_tailwind.ts` にある `resolveImageRefs()` を共通ユーティリティ化
   - `resolveRelativeImagePaths()` も同様
   - html_tailwind.ts からは re-export or import

2. **Markdown 用の `image:` 参照解決を追加**
   - markdown 画像構文 `![alt](image:name)` を解決する関数
   - パターン: `!\[([^\]]*)\]\(image:([^)]+)\)` → `![alt](file:///resolved/path)`

3. **markdown.ts の `generateHtml()` で imageRefs を解決**
   - レンダリング前の HTML に `resolveImageRefs()` を適用
   - markdown テキスト段階で `image:` を解決するか、HTML 変換後に解決するかの選択
   - **HTML 変換後がベター**: markdown パーサーが `![](image:name)` を `<img src="image:name">` に変換するので、その後に `resolveImageRefs()` を適用すれば既存の関数がそのまま使える

4. **テスト追加**
   - `scripts/test/test_markdown_image_refs.json` — markdown で `image:` 参照を使うテストスクリプト
   - ユニットテスト: `resolveImageRefs()` の共通化テスト

5. **ドキュメント更新**
   - `docs/image.md` — markdown での `image:` 参照の使い方

## 実装の最小差分

**Step 3 だけで動く可能性が高い**。markdown パーサー（`marked`）は `![](image:name)` を `<img src="image:name">` に変換する。つまり `generateHtml()` の出力に対して既存の `resolveImageRefs()` を呼ぶだけで OK。

```typescript
// markdown.ts の generateHtml() 内
const rawHtml = /* 既存のHTML生成ロジック */;
const resolvedHtml = resolveImageRefs(rawHtml, params.imageRefs ?? {});
return resolvedHtml;
```

共通化（Step 1-2）は DRY のためだが、最小実装は import + 1行追加。

## Non-goals

- mermaid, chart, text_slide — これらは画像を埋め込む概念がないため対象外
- markdown layout の schema 拡張 — `imageRef` ブロックタイプの追加は別 issue
