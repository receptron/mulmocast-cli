# Plan: Puppeteer Browser Pool (Singleton)

## Problem

現在、`renderHTMLToImage()` / `renderHTMLToFrames()` / `generatePDF()` が呼ばれるたびに `puppeteer.launch()` → `browser.close()` している。

- ブラウザ起動コスト: ~500ms/回
- concurrency: 4 で最大4プロセス同時起動 → メモリ圧迫で固まる
- 10 beat のプレゼンで画像+キャプション = 20回以上のブラウザ起動/終了

## Solution

シングルトンブラウザプールを導入。1つのブラウザインスタンスを共有し、各レンダリングは `page` を開閉するだけにする。

## Design

### `src/utils/browser_pool.ts` (新規)

```typescript
// Singleton browser pool
// - getBrowser(): Promise<Browser> — 初回呼び出しで launch、以降は再利用
// - closeBrowser(): Promise<void> — 明示的にブラウザを閉じる（プロセス終了時用）
```

- `getBrowser()` は排他制御付き（複数の concurrent call が同時に launch しないようにする）
- ブラウザが crash/disconnect した場合は自動で再起動
- `closeBrowser()` はアクションの最後に呼ぶ（images, captions, pdf の完了時）

### `src/utils/html_render.ts` (修正)

- `renderHTMLToImage()`: `puppeteer.launch()` → `getBrowser()` + `page` を try/finally で close
- `renderHTMLToFrames()`: 同上
- `browser.close()` は削除（プール管理に委譲）

### `src/actions/pdf.ts` (修正)

- `generatePDF()`: 同パターンで `getBrowser()` に変更

### アクション完了時のクリーンアップ

- `images()`, `captions()`, `pdf()` の完了後に `closeBrowser()` を呼ぶ
- CLI の `processAction()` 完了時にも `closeBrowser()` を呼ぶ（安全策）

## Implementation Steps

1. `src/utils/browser_pool.ts` を作成
2. `src/utils/html_render.ts` を修正（getBrowser 使用）
3. `src/actions/pdf.ts` を修正（getBrowser 使用）
4. アクション完了時のクリーンアップを追加
5. テスト: 既存の unit test が通ることを確認
6. テスト: 実際に動画生成して速度比較

## Affected Files

| File | Change |
|------|--------|
| `src/utils/browser_pool.ts` | 新規: シングルトンブラウザプール |
| `src/utils/html_render.ts` | 修正: launch → getBrowser |
| `src/actions/pdf.ts` | 修正: launch → getBrowser |
| `src/actions/images.ts` | 修正: 完了時に closeBrowser |
| `src/actions/captions.ts` | 修正: 完了時に closeBrowser |

## Risks

- ブラウザ crash 時の自動復旧が正しく動くか
- ページ数上限（Chromium はページ数が多すぎると遅くなる可能性）→ concurrency: 4 なら問題なし
- テスト環境での CI 互換性（sandbox 設定の一貫性）
