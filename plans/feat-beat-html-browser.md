# beatToHtml() — ブラウザ安全な beat→HTML 断片モジュール

receptron/mulmocast-cli#1526

## ゴール

`src/utils/beat_html/` を新設し、**全 beat 種別が同じ形を返す**ブラウザ安全な純粋関数群を置く。
`src/index.browser.ts` からの export は **PR 9**（下の分割表）で行う。
各 beat 種別が個別にレビューを受けてから公開 API に載せるため。

```ts
export type BeatHtmlFragment = {
  html: string;                          // body 相当のみ。<html>/<head>/<script> を含まない
  css?: string;                          // コンテナ配下にスコープ済み
  requires?: ("chart" | "mermaid")[];    // 親が1回だけロードすべき外部ランタイム
};
export const beatToHtml = (beat: MulmoBeat, options?: BeatHtmlOptions): BeatHtmlFragment | undefined;
```

## 原則

**共通物（Tailwind / chart.js / mermaid / フォント）は断片に吐かず、親が 1 回だけ持つ。**
これは新方針ではなく `src/actions/html.ts:52` が既にやっていること。

## 制約（ブラウザ安全）

`node:fs` / `node:path` / `node:crypto` / `node:url` を **import しない**。
`MulmoStudioContext` を要求しない。解決済みの値は呼び出し側から受け取る。

## PR 分割（1 PR = 1 beat 種別）

人間レビュー前提のため細粒度に割る。各 PR は独立して revert 可能。

| # | 内容 | 依存 |
|---|---|---|
| 1 | `beat_html/` 新設。型・dispatcher 骨格・**`textSlide`**・テスト。ここでパターン確定 | — |
| 2 | `markdown` | 1 |
| 3 | `image`（url のみ、新規） | 1 |
| 4 | `movie`（url のみ） | 1 |
| 5 | `chart`（`data-mulmo-chart`） | 1 |
| 6 | `mermaid`（`data-mulmo-mermaid`、text のみ） | 1 |
| 7 | `html_tailwind` | 1 |
| 8 | `slide` | 1 ＋ mulmocast-deck#25 |
| 9 | `index.browser.ts` から export ＋ README | 1–8 |
| 10 | 既存 `image_plugins` の重複を新モジュールへ委譲 | 9 |

## 種別ごとの方針

| beat | 現状の Node 依存 | 断片化の方針 |
|---|---|---|
| `textSlide` | 無し（`marked` のみ） | `dumpMarkdown` を移設し `marked.parse` |
| `markdown` | `dumpHtml` 経路は純粋 | `markdown_layout.ts` の純粋部分を移設 |
| `image` | — (`html()` が無い) | `source.kind === "url"` のみ → `<img>` |
| `movie` | `MulmoMediaSourceMethods.resolve` (fs) | `url` のみ → `<video>` |
| `chart` | `generateUniqueId` が `node:crypto` | `<canvas data-mulmo-chart='...'>`。`requires: ["chart"]` |
| `mermaid` | `MulmoMediaSourceMethods.getText` (fs/fetch) | `code.kind === "text"` のみ → `<div data-mulmo-mermaid="...">`。`requires: ["mermaid"]` |
| `html_tailwind` | 無し | `joinHtml` / `swipeElementsToHtml` を移設 |
| `slide` | `pathToDataUrl` / branding の `toDataUrl` | `generateSlideFragment()` に委譲。branding / imageRefs は解決済みを受け取る |

`chart` / `mermaid` が `<script>` をやめる理由: 消費側は断片を sanitize してから
`<div>` に注入するので `<script>` は落ちるし、そもそも `innerHTML` 経由では実行されない。
データを data 属性に載せれば sanitize を通り、消費側が mount 後に hydrate できる。

id 採番は `node:crypto` を使わず、呼び出し側が渡すか決定的カウンタにする
（スナップショットテストの再現性のため）。

## 既存の `mulmo html` を壊さないこと

`src/actions/html.ts:29` は「`studioBeat.html` があればそれを使い、無ければ
`imageFile` の相対パスで `<img>` を書く」分岐になっている。
ここで **`image_plugins/image.ts` に `html` export を生やすと、`mulmo html` の出力が
ローカル画像パスから remote URL に変わってしまう。**

したがって本作業は **`beat_html/` の中に閉じ、既存 Node プラグインには触らない**。
PR 10（重複排除）でのみ既存プラグインを新モジュールへ委譲し、
そのときは**挙動不変を差分検証で証明する**（旧コードを使い捨てハーネスに複製し、
生成入力で新旧突き合わせ、一致件数を PR に書く。`/refactor-safely`）。

## テスト

`test/beat_html/test_*.ts`（`node:test` + `node:assert`、既存の作法）。各種別で:

- 断片に `<!DOCTYPE` / `<html` / `<head` / `<script` が**含まれない**
- 非対応 kind（`path` / `base64` 等）で決めた返り値になる
- `chart` / `mermaid` で `requires` が正しい
- 同じ入力で出力が決定的（id を含む）
- **ブラウザ安全性の自動チェック** — 人力レビューだと必ず漏れるので機械的に固定する。
  当初は import を正規表現で静的走査する形にしたが、レビューで見逃しを 3 回指摘され
  （動的 `import()` / `require()` → bare builtin / 推移的依存 → 外部ヘルパー経由）、
  **禁止形の列挙をやめて 3 層に反転した**:

  1. **esbuild で実際にバンドルする**（`platform: "browser"`、externals なし）。
     あらゆる import 形と推移的依存をバンドラが解決するので、列挙が要らない。
     許可パッケージは `metafile.inputs` から実際の解決結果として取る
  2. **Node の型を外してコンパイルする**（`types: []` / `lib: ES2022`）。
     `process` / `Buffer` / `__dirname` / `require` は**モジュール解決を伴わない**ため
     どんなバンドラ検査でも見えないが、コンパイラは「存在するもの」を列挙するので落ちる
  3. **静的 import のみを許す**（TypeScript の AST で判定）。計算された specifier は
     1 と 2 の両方から見えない。ここを正規表現でやると、文字列中の `//` に
     コメント除去が引っかかって `import(` を隠す — 実際にレビューで指摘された

  層 2・3 は**バンドルの入力一覧**（`metafile`）を対象にする。ディレクトリ走査だと
  `beat_html` の外にあって値 import されたヘルパーを見逃す。

  **どの層も捕まえない残り**: `eval("require")` / `Function("return process")()`。
  4 層目でごまかさず、テストファイルに明記する

## 決めること（issue のチェックリスト）

- [ ] `image` / `movie` の `base64` を対応に含めるか（今回は url のみの方針）
- [ ] 非対応 kind のときの返り値 — `undefined` か、プレースホルダ断片か
- [ ] `mulmocast/browser` 直下に出すか `mulmocast/beat-html` として別サブパス export にするか
- [ ] PR 10（重複排除）を今回やるか、別 issue に切り出すか
- [ ] `requires` にプラグイン CDN（sankey / treemap）も含めるか

## やらないこと

- `mulmo html` の入れ子バグ修正（receptron/mulmocast-cli#1527 で別途）
- Puppeteer 経路（`process()`）の変更
