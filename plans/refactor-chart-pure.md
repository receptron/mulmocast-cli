# refactor(chart): pure なチャート描画部を切り出す

親 issue: #1526 の PR 3。

## 目的

`src/utils/image_plugins/chart.ts` の HTML 生成部は Node 依存
(`generateUniqueId` → `node:crypto`) を持つため、ブラウザ側の beat fragment から
import できない。`markdown_layout.ts` / `mermaid_html.ts` と同じ形で pure 化し、
ブラウザ実装が「同じ関数を import する」状態を先に用意する。

二重実装は必ずずれる（#1530 で、コピーした markdown 実装が同じバグを共有していたため
parity テストが通ってしまった）。ブラウザ側を書く前に、共有される側を pure にしておく。

## 変更

- `src/utils/image_plugins/chart_html.ts` (新規, pure)
  - `chartHtml(chartDataJson, title, chartId)` — canvas id を引数で受ける
  - `stringifyChartData(chartData)` — wrapper 側で先に呼ぶ。main の評価順
    (stringify → title 読み取り → id 生成) を保つため
  - `resolveChartPlugins(chartType)` と CDN テーブルを移設
- `src/utils/image_plugins/chart.ts` — 上記を import する wrapper に。
  `processChart` は一字も変えない。

## 挙動不変の証明

`origin/main` の旧コードを sed で機械抽出したハーネスと新コードを、生成入力で突き合わせる。
mutation で「ハーネスが差分を検出できること」自体を先に確認する。
恒久テストとして characterization test を `test/image_plugins/test_chart_html.ts` に残す。
