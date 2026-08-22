# feat(beat_html): chart beat をブラウザ用 fragment にする

issue: #1526 の PR 4。

## 設計

`chartHtml()` は inline `<script>` を吐くが、**`innerHTML` 経由で注入された script は実行されない**し
sanitize も生き残らない。したがってブラウザ用は config を canvas の属性に載せる。

姉妹パッケージ `@mulmocast/deck` が既に同じ規約を持っているので**属性の形を厳密に合わせる**:

```html
<canvas id="..." data-chart-ready="false" data-mulmo-chart="{escapeHtml(compact JSON)}"></canvas>
```

これで `[data-mulmo-chart]` を駆動する host runtime が slide と beat の両方を1つの経路で扱える。
プラグイン CDN の伝え方も deck の `SlideFragment.chartPlugins` に倣う。

## 共有

markup を書き直さず `image_plugins/chart_html.ts` を割る:

- `chartCard(title, canvas, trailing)` — 両経路が使うカード
- `chartHtml()` = カード + script（Node、**バイト不変**）
- `chartFragmentHtml()` = カード + data 属性（ブラウザ）

二重実装は必ずずれる（#1530 で、コピーした markdown 実装が同じバグを共有して parity テストが通った）。

## 検証

Node 側のバイト不変は origin/main との差分ハーネスで実測する。
ブラウザ側は「host が実際に駆動できるか」を実ブラウザで確認する — build が通ることは動くことの証明にならない。
