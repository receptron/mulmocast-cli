# feat(beat_html): slide beat をブラウザ用 fragment にする

issue: #1526 の PR 11。

## `generateSlideFragment` がここで使われる

receptron/mulmocast-deck#27 で追加した「フル文書ではなく body だけを返す」API を、ようやく消費する。
Node 経路の `generateSlideHTML` と同じ layout 群を使うので、fragment は 2 つ目のレンダラではない。

## theme の優先順

`MulmoPresentationStyleMethods.getResolvedSlideTheme` と同じ順:
`image.theme` → `options.slideTheme`（deck 既定） → `slideThemes.corporate`。

その method を呼ばず順序だけ再現しているのは、`MulmoPresentationStyle` 型をブラウザバンドルに
持ち込まないため。順序が 2 箇所にあることになるので、テストで固定する。

## scope class

`${idPrefix}-slide`。css は scope class に対して書かれているので、再描画で class が変わると
規則が何にもマッチしなくなる。`idPrefix` は #1541 の element id 規則を通っているので、
そのまま CSS class として妥当。

**field としては返さない。** 当初 `BeatHtmlFragment.scopeClass` を足し「host が要素に付けないと
css が効かない」と書いたが、レビューで指摘され実測したところ**誤り**だった: deck は `html` の root に
その class を既に付けており、host が `html` を注入して `css` を当てるだけでテーマが効く
（wrapper に何も付けずに `--d-bg` がビートのテーマ色になることをブラウザで確認）。
冗長なうえ説明が誤っていたので field ごと撤去した。

## BeatHtmlFragment の拡張

`mermaidTheme` のみ。暗いスライドに明るい図が乗ると読めないため。

## バンドル

deck の barrel は 101 入力 / 602.8 KB、`lib/fragment.js` の deep import は 20 / 54.3 KB。
beat_html 全体では 35 入力 / 119.1 KB（marked 1、自リポジトリ 15、deck 19）。
layout 群がその大半で、これはスライドレンダラそのものなので不可避。
