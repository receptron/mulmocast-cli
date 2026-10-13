# beatToHtml: 単独の chart / mermaid 場面を deck の figure スライドで描く

#1634

## ゴール

ブラウザ用の `beatToHtml` で、`chart` / `mermaid` 場面を `@mulmocast/deck` の `generateSlideFragment()` で描く。
見た目を `slide` 場面とテーマに揃え、ホストの描画経路を一つにする（`slideUtilityCss` ＋ `[data-mulmo-chart]` ＋ mermaid）。

**PNG / movie 側は変えない**（専用テンプレートのまま）。ブラウザと PNG の見た目は分かれたままになる。

## deck 側で要るもの（`@mulmocast/deck` 2.1.0 で公開済み）

| deck | 内容 | なぜ |
|---|---|---|
| receptron/mulmocast-deck#39（PR #44） | `figure` レイアウト（chart / mermaid ブロック一つをヘッダー下いっぱいに） | 既存レイアウトではブロックが縦に伸びず、chart は 150px、mermaid は素の大きさ（実ブラウザ計測） |
| receptron/mulmocast-deck#40（PR #42） | chart プラグイン表を `Map` に | object literal だと `constructor` 等で関数が `chartPlugins` に入る。cli は #1534 で直済みで、deck に任せると戻る |
| receptron/mulmocast-deck#41（PR #43） | `scopeClass` を渡したら id もそこから作る | 共有連番だと同じ場面でも描くたびに id が変わる。cli の chart / mermaid 断片は #1543 以来安定していた |

## cli 側

- `slide.ts`: `deckSlideToHtml(slide, beatTheme, options)` を切り出し、`slideToHtml` もそれを使う
- `chart.ts`: `{ layout: "figure", title, figure: { type: "chart", chartData } }`
- `mermaid.ts`: `code.kind === "text"` のときだけ、`{ layout: "figure", title: title || "Diagram", figure: { type: "mermaid", code } }`（appendix は今と同じく連結）
- テーマ: chart / mermaid の image にテーマは無いので `options.slideTheme` → `corporate`
- `chart_html.ts` のブラウザ専用 helper（`chartFragmentHtml` / `chartPluginCdns` / `chartTypeOf`）は使われなくなるので削除。Node 経路は不変
- `docs/api.md`: 表の更新、chart 駆動例に `maintainAspectRatio: false`（deck 自身の driver と同じ。無いと枠いっぱいに伸びない）、playground（https://receptron.github.io/mulmocast-beat-editor/）へのリンク
- `@mulmocast/deck` を `^2.1.0` に上げ、同梱スキーマを再生成（slide 場面に `figure` が増える）

## 検証

- beat_html / image_plugins のテスト
- 実ブラウザ（ホストと同じ手順: innerHTML 注入、`requires` を 1 回ロード、`[data-mulmo-chart]` 駆動、`mermaidTheme` で mermaid）:
  bar / sankey / 縦長 mermaid / 横長 mermaid（ダークテーマ・敵対的タイトル）がすべて枠いっぱい、`#app` 内の `<script>` と注入 `<img>` が 0
