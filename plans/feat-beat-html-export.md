# feat: beatToHtml を mulmocast/browser から公開する

issue: #1526 の PR 14（最終）。

## 何を公開するか

`src/index.browser.ts`（package.json の `"./browser"` 経路）から:

- `beatToHtml` / `supportedBeatTypes`
- 型: `BeatHtmlFragment` / `BeatHtmlOptions` / `BeatRuntime`

`index.common.ts` ではなく browser entry から出すのは、`test_browser_safety.ts` が
このモジュールの import グラフを見張っているため。Node 依存が紛れ込めば利用者のビルドではなく
そのテストが落ちる。

## バンドルの増分（実測）

|                      | 入力    | サイズ        |
| -------------------- | ------- | ------------- |
| 現状の index.browser | 147     | 3052 KB       |
| 本PR適用後           | 164     | 3169.8 KB     |
| **増分**             | **+17** | **+117.7 KB** |

deck の 19 ファイルは既存分と共有されるので、実質は marked と自リポジトリのコードのみ。
Node 組み込みはゼロ。

## 検証

公開経路 `mulmocast/browser` から全 8 種別を呼び、
host が書くのと同じページ（requires から CDN を読み、fragment を innerHTML で注入し、
`[data-mulmo-chart]` と `.mermaid` を駆動）を組み立てて実ブラウザで描画を確認する。
