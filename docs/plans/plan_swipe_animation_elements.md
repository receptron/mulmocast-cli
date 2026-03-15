# Plan: Swipe風宣言的アニメーション要素

## 概要

html_tailwind beatに`elements`配列を追加し、Swipe言語仕様にインスパイアされた宣言的JSONでアニメーションを定義できるようにする。

## GitHub Issue

- https://github.com/receptron/mulmocast-cli/issues/1288

## 設計

### スキーマ（Zod）

```typescript
// Swipe風トランジションアニメーション
const swipeTransitionSchema = z.object({
  opacity: z.number().optional(),
  rotate: z.number().optional(),
  scale: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
  translate: z.tuple([z.number(), z.number()]).optional(),
  bc: z.string().optional(),
  timing: z.tuple([z.number(), z.number()]).optional(), // [start, end] 0.0-1.0
});

// Swipe風ループアニメーション
const swipeLoopSchema = z.object({
  style: z.enum(["vibrate", "blink", "wiggle", "spin", "shift", "sprite"]),
  count: z.number().optional(),     // 0 = 無限
  delta: z.number().optional(),     // vibrate/wiggle の距離/角度
  duration: z.number().optional(),  // 1サイクルの秒数
  direction: z.enum(["n", "s", "e", "w"]).optional(), // shift方向
  clockwise: z.boolean().optional(), // spin方向
});

// Swipe風エレメント
const swipeElementSchema = z.object({
  id: z.string().optional(),
  // 位置・サイズ
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  w: z.union([z.number(), z.string()]).optional(),
  h: z.union([z.number(), z.string()]).optional(),
  pos: z.tuple([z.union([z.number(), z.string()]), z.union([z.number(), z.string()])]).optional(),
  // 見た目
  bc: z.string().optional(),
  opacity: z.number().optional(),
  rotate: z.number().optional(),
  scale: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
  translate: z.tuple([z.number(), z.number()]).optional(),
  cornerRadius: z.number().optional(),
  borderWidth: z.number().optional(),
  borderColor: z.string().optional(),
  shadow: z.object({...}).optional(),
  clip: z.boolean().optional(),
  // コンテンツ
  text: z.string().optional(),
  fontSize: z.union([z.number(), z.string()]).optional(),
  textColor: z.string().optional(),
  textAlign: z.string().optional(),
  img: z.string().optional(), // URL or image:ref
  // アニメーション
  to: swipeTransitionSchema.optional(),
  loop: swipeLoopSchema.optional(),
  // 子要素
  elements: z.array(z.lazy(() => swipeElementSchema)).optional(),
});
```

### 変換ロジック

`elements` → HTML + render() 関数を自動生成:

1. 各elementをHTML `<div>` に変換（位置・スタイルをinline styleで）
2. `to` → MulmoAnimation.animate() 呼び出しに変換
3. `loop` → カスタムrender()関数内のループアニメロジックに変換

### 変更ファイル

1. `src/types/schema.ts` — elements schema追加
2. `src/utils/swipe_to_html.ts` — **新規** elements→HTML+script変換
3. `src/utils/image_plugins/html_tailwind.ts` — elements処理の統合
4. テストスクリプト

## 実装ステップ

1. Zodスキーマ定義
2. swipe_to_html.ts コンバータ実装
3. html_tailwind.ts への統合
4. マコロプロトタイプで動作確認
